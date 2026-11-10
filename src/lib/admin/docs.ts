import "server-only";
import { and, eq, notLike } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminDocs } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";

// One small record store for everything the admin and platform areas keep (test drives, posts, campaigns, settings...). On the Worker it
// is the `admin_docs` D1 table; with no D1 binding (next dev, the E2E run) it is a map in memory, so the areas work with nothing set up.
// A collection starts from its seed function the first time it is read, so a fresh database shows a lived-in demo.
// shortcut: memory is per server instance, so with no D1 binding edits last only as long as the process does. Fine for dev and tests.
export type Doc = { id: string } & Record<string, unknown>;

const memory = new Map<string, Map<string, Doc>>();
const SEEDED = "_seeded"; // collection holding one marker row per seeded collection
const seededHere = new Set<string>(); // collections this instance already knows are seeded, so a call costs no extra query

const hasDb = () => Boolean(getBindings().DB);

export function defineCollection<T extends Doc>(name: string, seed: () => T[]) {
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
    // One row at a time: plain inserts behave the same on D1 and in tests. Conflicts are ignored, so two first visits cannot clash.
    for (const d of seed()) await db.insert(adminDocs).values({ collection: name, id: d.id, data: d }).onConflictDoNothing();
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

export type Collection<T extends Doc> = ReturnType<typeof defineCollection<T>>;
