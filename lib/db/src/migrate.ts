import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { normalizePostgresConnectionString } from "./connection-string";

const databaseUrl = process.env.NODE_ENV === "production"
  ? process.env.DATABASE_URL
  : process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL (or DEV_DATABASE_URL outside production) is required to run migrations");

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const files = (await readdir(migrationsDir)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
const pool = new pg.Pool({ connectionString: normalizePostgresConnectionString(databaseUrl), max: 1 });
const client = await pool.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS arc_pass_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const { rows: appliedRows } = await client.query<{ name: string }>("SELECT name FROM arc_pass_migrations ORDER BY name");
  const applied = new Set(appliedRows.map((row) => row.name));

  // This repository predates migration tracking. Adopt an already-provisioned
  // Arc Pass schema without replaying historical data migrations; new forward
  // migrations still run exactly once from this point onward.
  if (applied.size === 0) {
    const { rows } = await client.query<{ users: string | null; passes: string | null }>("SELECT to_regclass('public.users')::text AS users, to_regclass('public.builder_passes')::text AS passes");
    if (rows[0]?.users && rows[0]?.passes) {
      // 0001-0005 predate tracked migrations in this repository. Migrations
      // 0006+ are forward changes from this release and must always execute.
      for (const file of files.filter((name) => name < "0006_")) {
        await client.query("INSERT INTO arc_pass_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
        applied.add(file);
      }
    }
  }

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO arc_pass_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      process.stdout.write(`Applied ${file}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  client.release();
  await pool.end();
}
