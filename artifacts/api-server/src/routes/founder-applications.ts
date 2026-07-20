import { Router, type IRouter } from "express";
import { and, count, eq, gt, or } from "drizzle-orm";
import { db, founderApplicationsTable } from "@workspace/db";
import {
  FOUNDER_REQUEST_IP_LIMIT,
  FOUNDER_REQUEST_IP_WINDOW_MS,
  FounderRequestValidationError,
  fingerprintRequesterIp,
  validateFounderRequest,
} from "../lib/founder-request";
import { sendApplicationReceivedEmail } from "../lib/email";

const router: IRouter = Router();

function requestFingerprintKey(): string {
  // Production startup validation requires SESSION_SECRET. The local fallback
  // keeps development usable without weakening any production deployment.
  return process.env.SESSION_SECRET || process.env.OAUTH_STATE_SIGNING_KEY || "arc-pass-local-founder-request-rate-limit";
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; cause?: { code?: string } };
  return candidate.code === "23505" || candidate.cause?.code === "23505";
}

router.post("/founder-applications", async (req, res): Promise<void> => {
  let request: { xUsername: string; email: string; description: string };
  try {
    request = validateFounderRequest(req.body);
  } catch (error) {
    res.status(400).json({ error: error instanceof FounderRequestValidationError ? error.message : "The application is invalid." });
    return;
  }

  const ipFingerprint = fingerprintRequesterIp(req.ip || "unknown", requestFingerprintKey());
  const since = new Date(Date.now() - FOUNDER_REQUEST_IP_WINDOW_MS);
  const [{ value: recentRequests }] = await db
    .select({ value: count() })
    .from(founderApplicationsTable)
    .where(and(
      eq(founderApplicationsTable.requestIpHash, ipFingerprint),
      gt(founderApplicationsTable.submittedAt, since),
    ));

  if (Number(recentRequests) >= FOUNDER_REQUEST_IP_LIMIT) {
    const retryAfterSeconds = Math.ceil(FOUNDER_REQUEST_IP_WINDOW_MS / 1_000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Too many Founder Pass requests from this network. Please try again tomorrow." });
    return;
  }

  const [existing] = await db
    .select({ requestXUsername: founderApplicationsTable.requestXUsername, requestEmail: founderApplicationsTable.requestEmail })
    .from(founderApplicationsTable)
    .where(or(
      eq(founderApplicationsTable.requestXUsername, request.xUsername),
      eq(founderApplicationsTable.requestEmail, request.email),
    ));

  if (existing) {
    const matchedEmail = existing.requestEmail === request.email;
    res.status(409).json({
      error: matchedEmail
        ? "You've already submitted a Founder Pass request with this email. We'll be in touch within 48 hours if you're selected."
        : "You've already submitted a Founder Pass request from this X account. We'll be in touch within 48 hours if you're selected.",
    });
    return;
  }

  try {
    const inserted = await db.insert(founderApplicationsTable).values({
      source: "arc_pass",
      requestXUsername: request.xUsername,
      requestIpHash: ipFingerprint,
      requestEmail: request.email,
      xUsername: request.xUsername,
      description: request.description,
      status: "under_review",
    }).onConflictDoNothing().returning({ id: founderApplicationsTable.id });

    if (inserted.length === 0) {
      res.status(409).json({ error: "You've already submitted a Founder Pass request. We'll be in touch within 48 hours if you're selected." });
      return;
    }

    await sendApplicationReceivedEmail({ to: request.email, xUsername: request.xUsername, description: request.description });
    res.status(201).json({ id: inserted[0].id, status: "under_review" });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: "You've already submitted a Founder Pass request. We'll be in touch within 48 hours if you're selected." });
      return;
    }
    throw error;
  }
});

export default router;
