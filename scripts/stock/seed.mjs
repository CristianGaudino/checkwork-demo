// Turns the stock into SQL for the D1 `cars` table: npm run stock:seed writes seed/stock.sql, npm run db:seed applies it to the remote database.
// By default it only adds cars that are missing and moves the sold dates of cars that are still sold, so what the dealer changed in the admin
// (new cars, edits, sold marks) survives a deploy. `--reset` (npm run stock:reset) first deletes every row, so the stock is exactly the files again.
// The file is generated and not committed.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const reset = process.argv.includes("--reset");
const cars = [...JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8")), ...JSON.parse(readFileSync("src/lib/stock/demo-cars-extra.json", "utf8"))];
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
// One INSERT per car: D1 refuses a statement over 100 KB (SQLITE_TOOBIG), which all the cars in one would be.
const rows = cars.map((c) => `INSERT OR IGNORE INTO cars (id, slug, data) VALUES (${q(c.id)}, ${q(c.slug)}, ${q(JSON.stringify(c))});`);
// A car that is still sold keeps its place in the 30 day window; one the dealer put back on sale is left alone.
const redate = cars.filter((c) => c.soldAt).map((c) => `UPDATE cars SET data = json_set(data, '$.soldAt', ${q(c.soldAt)}) WHERE id = ${q(c.id)} AND json_extract(data, '$.soldAt') IS NOT NULL;`);
mkdirSync("seed", { recursive: true });
writeFileSync("seed/stock.sql", [...(reset ? ["DELETE FROM cars;"] : []), ...rows, ...redate, ""].join("\n"));
console.log(`${cars.length} cars written to seed/stock.sql${reset ? " (reset: every row is replaced)" : ""}`);
