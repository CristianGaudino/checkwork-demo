import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { adminDocs } from "@/lib/db/schema";
import { getBindings } from "@/lib/leads/bindings";

// One small record store for what the site keeps beside the leads: the anonymous feature counts.
// On the Worker it is the `admin_docs` D1 table (a name from before the dashboard moved to checkwork-dash; renaming a live table
// is the owner's call); with no D1 binding (next dev, the E2E run) it is a map in memory.
// shortcut: memory is per server instance (and `next start` gives route handlers their own copy, apart from pages and actions), so with no
// D1 binding records last only as long as the process. Fine for dev and tests; the Worker uses D1.
export type Doc = { id: string } & Record<string, unknown>;

const memory = new Map<string, Map<string, Doc>>();
const hasDb = () => Boolean(getBindings().DB);
const mem = (name: string) => memory.get(name) ?? memory.set(name, new Map()).get(name)!;

export function defineCollection<T extends Doc>(name: string) {
  // A failed query's error carries its values, and an uncaught error is printed to Workers Logs. Rethrown with the collection's name
  // only, so a D1 hiccup never puts a record in the logs.
  const quiet = <R,>(q: PromiseLike<R>, op: string): Promise<R> =>
    Promise.resolve(q).catch(() => {
      throw new Error(`admin_docs ${name} ${op} failed`);
    });
  return {
    name,
    async list(): Promise<T[]> {
      if (!hasDb()) return [...mem(name).values()] as T[];
      const rows = await quiet(getDb().select({ data: adminDocs.data }).from(adminDocs).where(eq(adminDocs.collection, name)), "list");
      return rows.map((r) => r.data as T);
    },
    async get(id: string): Promise<T | undefined> {
      if (!hasDb()) return mem(name).get(id) as T | undefined;
      const rows = await quiet(getDb().select({ data: adminDocs.data }).from(adminDocs).where(and(eq(adminDocs.collection, name), eq(adminDocs.id, id))).limit(1), "get");
      return rows[0]?.data as T | undefined;
    },
    async put(doc: T): Promise<void> {
      if (!hasDb()) return void mem(name).set(doc.id, doc);
      await quiet(
        getDb()
          .insert(adminDocs)
          .values({ collection: name, id: doc.id, data: doc })
          .onConflictDoUpdate({ target: [adminDocs.collection, adminDocs.id], set: { data: doc, updatedAt: new Date() } }),
        "put",
      );
    },
    // Every record of the collection: for tests.
    async reset(): Promise<void> {
      if (!hasDb()) return void memory.delete(name);
      await quiet(getDb().delete(adminDocs).where(eq(adminDocs.collection, name)), "reset");
    },
  };
}
