import "server-only";
import { and, eq, notLike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminDocs } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";
import { isProduction } from "@/lib/site";

// One small record store for everything the dealer admin keeps (test drives, posts, campaigns, settings...). On the Worker it
// is the `admin_docs` D1 table; with no D1 binding (next dev, the E2E run) it is a map in memory, so the areas work with nothing set up.
// A collection starts from its seed function the first time it is read, so a fresh database shows a lived-in demo.
// shortcut: memory is per server instance (and `next start` gives route handlers their own copy, apart from pages and actions), so with no
// D1 binding edits last only as long as the process, and a route handler sees the seed. Fine for dev and tests; the Worker uses D1.
export type Doc = { id: string } & Record<string, unknown>;

const memory = new Map<string, Map<string, Doc>>();
export const SEEDED = "_seeded"; // collection holding one marker row per seeded collection (the activity log uses it too)
const seededHere = new Set<string>(); // collections this instance already knows are seeded, so a call costs no extra query

const hasDb = () => Boolean(getBindings().DB);

// The made-up records (leads, reviews, posts, a team...) are for the demo. A real dealer's dashboard starts empty: on a production site
// (APP_ENV=production) nothing is seeded, unless DEMO_RECORDS=on; DEMO_RECORDS=off turns them off anywhere. `always` is for a record a
// site cannot run without (the settings), which seeds its defaults either way.
export const seedsDemoRecords = () => (process.env.DEMO_RECORDS ? process.env.DEMO_RECORDS !== "off" : !isProduction());
// The Settings reset button: only where there are made-up records, and never on production, where a showcase (DEMO_RECORDS=on) also
// holds records staff entered. The weekly cron is stricter still (APP_ENV=demo only).
export const mayResetDemo = () => seedsDemoRecords() && !isProduction();

export function defineCollection<T extends Doc>(name: string, demoSeed: () => T[], { always = false }: { always?: boolean } = {}) {
  const seed = () => (always || seedsDemoRecords() ? demoSeed() : []);
  // A failed query's error carries its values (a lead's name, email, phone), and an uncaught error is printed to Workers Logs. Rethrown
  // with the collection's name only, so a D1 hiccup never puts a customer in the logs.
  const quiet = <R,>(q: PromiseLike<R>, op: string): Promise<R> =>
    Promise.resolve(q).catch(() => {
      throw new Error(`admin_docs ${name} ${op} failed`);
    });
  // `seedIfNew` false is for a public page: it never writes, so a visitor's page view cannot seed a collection. Returns whether it is ready.
  async function ready(seedIfNew = true): Promise<boolean> {
    if (!hasDb()) {
      if (!memory.has(name)) memory.set(name, new Map(seed().map((d) => [d.id, d])));
      return true;
    }
    if (seededHere.has(name)) return true;
    const db = getDb();
    const done = await quiet(db.select({ id: adminDocs.id }).from(adminDocs).where(and(eq(adminDocs.collection, SEEDED), eq(adminDocs.id, name))).limit(1), "ready");
    if (done.length) {
      seededHere.add(name);
      return true;
    }
    if (!seedIfNew) return false;
    // Twenty rows a statement (D1 allows 100 bound values, three a row), so a first visit is a few round trips, not one per record.
    // Conflicts are ignored, so two first visits cannot clash.
    const rows = seed().map((d) => ({ collection: name, id: d.id, data: d }));
    for (let i = 0; i < rows.length; i += 20) await quiet(db.insert(adminDocs).values(rows.slice(i, i + 20)).onConflictDoNothing(), "seed");
    await quiet(db.insert(adminDocs).values({ collection: SEEDED, id: name, data: {} }).onConflictDoNothing(), "seed");
    seededHere.add(name);
    return true;
  }

  return {
    name,
    async list(opts?: { seed?: boolean }): Promise<T[]> {
      if (!(await ready(opts?.seed ?? true))) return [];
      if (!hasDb()) return [...memory.get(name)!.values()] as T[];
      const rows = await quiet(getDb().select({ data: adminDocs.data }).from(adminDocs).where(eq(adminDocs.collection, name)), "list");
      return rows.map((r) => r.data as T);
    },
    async get(id: string): Promise<T | undefined> {
      await ready();
      if (!hasDb()) return memory.get(name)!.get(id) as T | undefined;
      const rows = await quiet(getDb().select({ data: adminDocs.data }).from(adminDocs).where(and(eq(adminDocs.collection, name), eq(adminDocs.id, id))).limit(1), "get");
      return rows[0]?.data as T | undefined;
    },
    async put(doc: T): Promise<void> {
      await ready();
      if (!hasDb()) return void memory.get(name)!.set(doc.id, doc);
      await quiet(
        getDb()
          .insert(adminDocs)
          .values({ collection: name, id: doc.id, data: doc })
          // Always a later updated_at than the row had, even in the same millisecond, so an update() racing this put sees it.
          .onConflictDoUpdate({ target: [adminDocs.collection, adminDocs.id], set: { data: doc, updatedAt: sql`max(${Date.now()}, ${adminDocs.updatedAt} + 1)` } }),
        "put",
      );
    },
    // A change to a record that may be changed at the same time (a note while the status moves): `fn` gets the record as it is now, and
    // the write only lands if nobody wrote it since (updated_at unchanged); one retry on a clash. A record that is gone (erased, purged)
    // stays gone: nothing is written and it returns undefined.
    async update(id: string, fn: (doc: T) => T | Promise<T>): Promise<T | undefined> {
      await ready();
      if (!hasDb()) {
        const cur = memory.get(name)!.get(id) as T | undefined;
        if (!cur) return undefined;
        const next = await fn(cur);
        if (!memory.get(name)!.has(id)) return undefined;
        memory.get(name)!.set(id, next);
        return next;
      }
      const db = getDb();
      const where = and(eq(adminDocs.collection, name), eq(adminDocs.id, id));
      for (let attempt = 0; attempt < 2; attempt++) {
        const [row] = await quiet(db.select({ data: adminDocs.data, at: adminDocs.updatedAt }).from(adminDocs).where(where).limit(1), "update");
        if (!row) return undefined;
        const next = await fn(row.data as T);
        // At least a millisecond on from the last write, so two writes in the same millisecond still tell apart.
        const at = new Date(Math.max(Date.now(), row.at.getTime() + 1));
        const done = await quiet(db.update(adminDocs).set({ data: next, updatedAt: at }).where(and(where, eq(adminDocs.updatedAt, row.at))).returning({ id: adminDocs.id }), "update");
        if (done.length) return next;
      }
      throw new Error(`admin_docs ${name} update clashed`);
    },
    async remove(id: string): Promise<void> {
      await ready();
      if (!hasDb()) return void memory.get(name)!.delete(id);
      await quiet(getDb().delete(adminDocs).where(and(eq(adminDocs.collection, name), eq(adminDocs.id, id))), "remove");
    },
    // Back to the seed: used by "Reset demo data". Records that came from visitors (ids starting "real-") are never touched.
    async reset(): Promise<void> {
      if (!hasDb()) {
        const real = [...(memory.get(name) ?? [])].filter(([id]) => id.startsWith("real-"));
        return void memory.set(name, new Map([...seed().map((d): [string, Doc] => [d.id, d]), ...real]));
      }
      const db = getDb();
      seededHere.delete(name);
      await db.delete(adminDocs).where(and(eq(adminDocs.collection, name), notLike(adminDocs.id, "real-%")));
      await db.delete(adminDocs).where(and(eq(adminDocs.collection, SEEDED), eq(adminDocs.id, name)));
      // Seeded again at once: other Worker isolates still remember this collection as seeded and would otherwise list nothing.
      await ready();
    },
  };
}

