import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { normalizePostgresConnectionString } from "./connection-string";

const { Pool } = pg;

if (process.env.NODE_ENV === "production" && process.env.DEV_DATABASE_URL?.trim()) {
  throw new Error("DEV_DATABASE_URL is forbidden in production");
}

const databaseUrl = process.env.NODE_ENV === "production"
  ? process.env.DATABASE_URL
  : process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL (or DEV_DATABASE_URL in development) must be set. Did you forget to provision a database?",
  );
}

const configuredPoolMax = Number(process.env.DB_POOL_MAX || "5");
export const pool = new Pool({
  connectionString: normalizePostgresConnectionString(databaseUrl),
  // Keep Railway workers inside Neon's connection budget. A single API
  // process does not need node-postgres' default ten connections.
  max: Number.isSafeInteger(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  maxUses: 7_500,
});

pool.on("error", (error) => {
  // node-postgres emits idle-client errors here. Handling the event prevents
  // an optional database interruption from becoming an uncaught process exit.
  console.error("Database pool idle-client error", error);
});
export const db = drizzle(pool, { schema });

export * from "./schema";
