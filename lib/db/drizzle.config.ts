import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
// drizzle-kit resolves `schema` through a glob matcher that expects
// forward slashes — path.join produces backslashes on Windows, which
// silently matches zero files instead of erroring.
const schemaPath = path.join(dirname, "./src/schema/index.ts").split(path.sep).join("/");

export default defineConfig({
  schema: schemaPath,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
