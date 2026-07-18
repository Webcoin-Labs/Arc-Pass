import { validateEnvironment } from "./lib/env";
import { seedDevelopmentTestIdentityInvites } from "./lib/dev-test-identities";
validateEnvironment();

import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await seedDevelopmentTestIdentityInvites();

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (error) => {
  logger.error({ error }, "API server failed");
  // A listening failure (for example an occupied Railway-assigned port) must
  // not leave the database pool keeping a dead worker alive indefinitely.
  void pool.end()
    .catch((poolError) => logger.error({ error: poolError }, "Database pool cleanup after startup failure failed"))
    .finally(() => process.exit(1));
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down API server");

  const forceExit = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (error) => {
    if (error) logger.error({ error }, "HTTP server shutdown failed");
    try {
      await pool.end();
    } catch (poolError) {
      logger.error({ error: poolError }, "Database pool shutdown failed");
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExit);
      process.exit();
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
