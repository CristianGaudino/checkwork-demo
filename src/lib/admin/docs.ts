import "server-only";
import { and, eq, notLike } from "drizzle-orm";
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

export function defineCollection<T extends Doc>(name: string, demoSeed: () => T[], { always = false }: { always?: boolean } = {}) {
  const seed = () => (always || seedsDemoRecords() ? demoSeed() : []);
  // `seedIfNew` false is for a public page: it never writes, so a visitor's page view cannot seed a collection. Returns whether it is ready.
  async function ready(seedIfNew = true): Promise<boolean> {
    if (!hasDb()) {
      if (!memory.has(name)) memory.set(name, new Map(seed().map((d) => [d.id, d])));
      return true;
    }
    if (seededHere.has(name)) return true;
    const db = getDb();
    const done = await db.select({ id: adminDocs.id }).from(adminDocs).where(and(eq(adminDocs.collection, SEEDED), eq(adminDocs.id, name))).limit(1);
    if (done.length) {
      seededHere.add(name);
      return true;
    }
    if (!seedIfNew) return false;
    // Twenty rows a statement (D1 allows 100 bound values, three a row), so a first visit is a few round trips, not one per record.
    // Conflicts are ignored, so two first visits cannot clash.
    const rows = seed().map((d) => ({ collection: name, id: d.id, data: d }));
    for (let i = 0; i < rows.length; i += 20) await db.insert(adminDocs).values(rows.slice(i, i + 20)).onConflictDoNothing();
    await db.insert(adminDocs).values({ collection: SEEDED, id: name, data: {} }).onConflictDoNothing();
    seededHere.add(name);
    return true;
  }

  return {
    name,
    async list(opts?: { seed?: boolean }): Promise<T[]> {
      if (!(await ready(opts?.seed ?? true))) return [];
      if (!hasDb()) return [...memory.get(name)!.values()] as T[];
      const rows = await getDb().select({ data: adminDocs.data }).from(adminDocs).where(eq(adminDocs.collection, name));
      return rows.map((r) => r.data as T);
    },
    async get(id: string): Promise<T | undefined> {
      await ready();
      if (!hasDb()) return memory.get(name)!.get(id) as T | undefined;
      const rows = await getDb().select({ data: adminDocs.data }).from(adminDocs).where(and(eq(adminDocs.collection, name), eq(adminDocs.id, id))).limit(1);
      return rows[0]?.data as T | undefined;
    },
    async put(doc: T): Promise<void> {
      await ready();
      if (!hasDb()) return void memory.get(name)!.set(doc.id, doc);
      await getDb()
        .insert(adminDocs)
        .values({ collection: name, id: doc.id, data: doc })
        .onConflictDoUpdate({ target: [adminDocs.collection, adminDocs.id], set: { data: doc, updatedAt: new Date() } });
    },
    async remove(id: string): Promise<void> {
      await ready();
      if (!hasDb()) return void memory.get(name)!.delete(id);
      await getDb().delete(adminDocs).where(and(eq(adminDocs.collection, name), eq(adminDocs.id, id)));
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
    },
  };
}

