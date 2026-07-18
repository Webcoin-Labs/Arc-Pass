import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// Railway liveness: never couples process health to an optional provider or a
// transient Neon wake-up. Readiness remains available separately for ops.
router.get("/healthz", (_req, res): void => {
  res.json(HealthCheckResponse.parse({ status: "ok" }));
});

router.get("/readyz", async (req, res): Promise<void> => {
  try {
    await pool.query("select 1");
    res.json(HealthCheckResponse.parse({ status: "ok" }));
  } catch (error) {
    req.log.error({ error }, "Database readiness check failed");
    res.status(503).json(HealthCheckResponse.parse({ status: "database_unavailable" }));
  }
});

export default router;
