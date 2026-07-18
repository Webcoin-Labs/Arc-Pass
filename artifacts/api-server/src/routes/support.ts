import { Router, type IRouter } from "express";
import {
  SUPPORT_ASSISTANT_DAILY_LIMIT,
  SupportAssistantLimitError,
  SupportAssistantUnavailableError,
  SupportAssistantValidationError,
  fingerprintSupportVisitor,
  generateSupportReply,
  releaseSupportResponse,
  reserveSupportResponse,
  supportFingerprintKey,
  validateSupportMessage,
} from "../lib/support-assistant";

const router: IRouter = Router();

/**
 * Public, product-scoped chat. It deliberately receives no session data,
 * eligibility data, wallet data, or credentials, so it cannot influence an
 * account or make security-sensitive decisions.
 */
router.post("/support/chat", async (req, res): Promise<void> => {
  let message: string;
  try {
    message = validateSupportMessage(req.body);
  } catch (error) {
    res.status(400).json({ error: error instanceof SupportAssistantValidationError ? error.message : "The support message is invalid." });
    return;
  }

  const visitorKey = fingerprintSupportVisitor(req.ip || "unknown", supportFingerprintKey());
  let reservation: { remaining: number; resetsAt: Date };
  try {
    reservation = await reserveSupportResponse(visitorKey);
  } catch (error) {
    if (error instanceof SupportAssistantLimitError) {
      const retryAfterSeconds = Math.max(1, Math.ceil((error.resetsAt.getTime() - Date.now()) / 1_000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "You have reached the five-reply support limit for this 24-hour period.",
        limit: SUPPORT_ASSISTANT_DAILY_LIMIT,
        remaining: 0,
        resetsAt: error.resetsAt.toISOString(),
      });
      return;
    }
    throw error;
  }

  try {
    const answer = await generateSupportReply(message);
    res.setHeader("Cache-Control", "no-store");
    res.json({
      answer,
      limit: SUPPORT_ASSISTANT_DAILY_LIMIT,
      remaining: reservation.remaining,
      resetsAt: reservation.resetsAt.toISOString(),
    });
  } catch (error) {
    // A missing key or upstream Gemini failure does not spend the visitor's
    // daily allowance. Deliberately do not use a fabricated static answer.
    await releaseSupportResponse(visitorKey).catch(() => undefined);
    if (error instanceof SupportAssistantUnavailableError) {
      res.status(503).json({ error: "Chat support is temporarily unavailable. Please try again later or email contact@webcoinlabs.com." });
      return;
    }
    throw error;
  }
});

export default router;
