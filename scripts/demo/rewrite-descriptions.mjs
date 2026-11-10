// node scripts/demo/rewrite-descriptions.mjs: rewrite the description of every car in demo-cars.json from its own facts.
import { readFileSync, writeFileSync } from "node:fs";
import { describeCar } from "./describe.mjs";

const file = "src/lib/stock/demo-cars.json";
const cars = JSON.parse(readFileSync(file, "utf8"));
for (const c of cars) c.description = describeCar(c);
writeFileSync(file, JSON.stringify(cars, null, 2) + "\n");
console.log(`rewrote ${cars.length} descriptions`);
