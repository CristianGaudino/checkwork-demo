// Turns the demo cars into SQL for the D1 `cars` table: npm run stock:seed writes seed/stock.sql, npm run db:seed applies it to the remote database.
// It replaces every row, so the demo's stock is always exactly what is in src/lib/stock/demo-cars.json. The file is generated and not committed.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const cars = JSON.parse(readFileSync("src/lib/stock/demo-cars.json", "utf8"));
const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const rows = cars.map((c) => `(${q(c.id)}, ${q(c.slug)}, ${q(JSON.stringify(c))})`);
mkdirSync("seed", { recursive: true });
writeFileSync("seed/stock.sql", `DELETE FROM cars;\nINSERT INTO cars (id, slug, data) VALUES\n${rows.join(",\n")};\n`);
console.log(`${cars.length} cars written to seed/stock.sql`);
