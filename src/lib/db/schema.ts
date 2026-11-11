import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { LeadType } from "@/lib/leads/schema";
import type { Car } from "../stock/types";

export type LeadStatus = "new"; // the admin phase (#20) adds more

// Columns locked under D-03 (03-06 Task 1, research-columns). The deploy migrates before new code runs, so every change
// from here on must be additive (scripts/check-migrations.sh). No IP, user agent or bot-check token is stored (LED-03).
// SQLite (Cloudflare D1): ids are uuid text made by the app, times are epoch milliseconds, lists and details are JSON text.
export const leads = sqliteTable(
  "leads",
  {
    id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    clientRef: text("client_ref").notNull().unique(), // one per form instance: retries and double taps store one row
    // free text, so new lead types and statuses stay additive
    type: text().$type<LeadType>().notNull(),
    status: text().$type<LeadStatus>().notNull().default("new"),
    // Snapshot from the stock provider, never from the form (T-03-07)
    carId: text("car_id"),
    carSlug: text("car_slug"),
    carTitle: text("car_title"),
    carPriceEur: integer("car_price_eur"),
    sourcePath: text("source_path").notNull(),
    name: text().notNull(),
    phone: text(),
    email: text(),
    message: text(),
    details: text({ mode: "json" }).$type<Record<string, string | number>>().notNull().default({}), // type fields: trade-in, sourcing, finance
    photoKeys: text("photo_keys", { mode: "json" }).$type<string[]>().notNull().default([]), // R2 keys, never URLs
    consentAt: integer("consent_at", { mode: "timestamp_ms" }).notNull(),
    consentVersion: text("consent_version").notNull(),
    notifiedAt: integer("notified_at", { mode: "timestamp_ms" }), // null: the dealer email did not go (docs/lead-retention.md)
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("leads_created_idx").on(t.createdAt)],
);

// The stock: one row per car, the whole Car as JSON, so a new Car field needs no migration.
export const cars = sqliteTable("cars", {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  data: text({ mode: "json" }).$type<Car>().notNull(),
});

// The dealer admin keeps its records here: one row per record, the record as JSON, grouped by collection ("test-drives",
// "posts" and so on). A new kind of record needs no migration. Seeded on first read (src/lib/admin/docs.ts).
export const adminDocs = sqliteTable(
  "admin_docs",
  {
    collection: text().notNull(),
    id: text().notNull(),
    data: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.collection, t.id] })],
);

// The dashboard's activity history (src/lib/admin/activity.ts): one row per change a person (or the stock sync) made. Never what a customer
// wrote: a record that holds personal data is kept as its kind and id, and its name is looked up when the page is shown. Deleted after
// ACTIVITY_RETENTION_MONTHS by the daily job.
export const activity = sqliteTable(
  "activity",
  {
    id: text().primaryKey(),
    at: integer({ mode: "number" }).notNull(), // epoch milliseconds
    actor: text().notNull(), // a team member's name, or the sync
    area: text().notNull(), // stock, leads, test-drives, customers, reviews, marketing, settings
    summary: text().notNull(), // "Changed the price from €17,950 to €16,950"
    refKind: text("ref_kind"), // car, lead, drive, alert, subscriber, review, post, ad, newsletter, team
    refId: text("ref_id"),
    refLabel: text("ref_label"), // only for a record with no personal data (a car's title, a post's car, a team member)
  },
  (t) => [index("activity_at_idx").on(t.at)],
);
