import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

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

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
