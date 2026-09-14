import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "../src/core/db/client";

const ddl = readFileSync(resolve(import.meta.dirname, "../src/core/db/schema.sql"), "utf8");
const db = sql();

// neon's http driver takes one statement per round trip
for (const statement of ddl.split(";").map((s) => s.trim()).filter(Boolean)) {
  await db.query(statement);
  console.log(`  ok  ${statement.split("\n")[0]?.slice(0, 70)}`);
}
console.log("\n  schema ready");
