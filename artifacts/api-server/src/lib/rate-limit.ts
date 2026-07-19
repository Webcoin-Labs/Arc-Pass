import { createHmac, randomBytes } from "node:crypto";
import { pool } from "@workspace/db";

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

const LOCAL_RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanupAt = 0;

function rateLimitSecret(): string {
  return process.env.SESSION_SECRET || process.env.OAUTH_STATE_SIGNING_KEY || LOCAL_RATE_LIMIT_SECRET;
}

/** Return a stable, privacy-preserving bucket key. Raw IP addresses never enter the database. */
export function fingerprintRateLimitKey(namespace: string, value: string): string {
  return `${namespace}:${createHmac("sha256", rateLimitSecret()).update(value).digest("hex")}`;
}

async function cleanupExpiredBuckets(): Promise<void> {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;
  await pool.query("DELETE FROM api_rate_limits WHERE window_started_at < NOW() - INTERVAL '2 days'");
}

/** Atomically reserve one request in PostgreSQL so limits apply across Railway workers. */
export async function reserveRateLimit(bucketKey: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error("Rate-limit limit must be a positive integer");
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) throw new Error("Rate-limit window must be a positive integer");

  void cleanupExpiredBuckets().catch(() => undefined);

  const result = await pool.query<{ request_count: number; window_started_at: Date }>(
    `
      INSERT INTO api_rate_limits (bucket_key, window_started_at, request_count, updated_at)
      VALUES ($1, NOW(), 1, NOW())
      ON CONFLICT (bucket_key) DO UPDATE
      SET
        request_count = CASE
          WHEN api_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond') THEN 1
          ELSE api_rate_limits.request_count + 1
        END,
        window_started_at = CASE
          WHEN api_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond') THEN NOW()
          ELSE api_rate_limits.window_started_at
        END,
        updated_at = NOW()
      WHERE api_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
         OR api_rate_limits.request_count < $3
      RETURNING request_count, window_started_at
    `,
    [bucketKey, windowMs, limit],
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    const resetAt = new Date(new Date(row.window_started_at).getTime() + windowMs);
    return { allowed: true, limit, remaining: Math.max(0, limit - row.request_count), resetAt };
  }

  const current = await pool.query<{ window_started_at: Date }>(
    "SELECT window_started_at FROM api_rate_limits WHERE bucket_key = $1",
    [bucketKey],
  );
  const startedAt = current.rows[0]?.window_started_at ?? new Date();
  const resetAt = new Date(new Date(startedAt).getTime() + windowMs);
  return { allowed: false, limit, remaining: 0, resetAt };
}

export function setRateLimitHeaders(res: { setHeader(name: string, value: string): void }, decision: RateLimitDecision): void {
  res.setHeader("X-RateLimit-Limit", String(decision.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(decision.resetAt.getTime() / 1_000)));
}
