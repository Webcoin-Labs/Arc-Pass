import { Router, type IRouter, type Request, type Response } from "express";
import { db, founderPassesTable, builderPassesTable, usersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { normalizeXHandle, parseDiscordIdentity } from "../lib/identity";
import { fingerprintRateLimitKey, reserveRateLimit, setRateLimitHeaders } from "../lib/rate-limit";

const router: IRouter = Router();

router.use("/eligibility", async (req, res, next) => {
  try {
    const decision = await reserveRateLimit(fingerprintRateLimitKey("eligibility", req.ip || "unknown"), 20, 60_000);
    setRateLimitHeaders(res, decision);
    if (!decision.allowed) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((decision.resetAt.getTime() - Date.now()) / 1_000))));
      res.status(429).json({ error: "Too many eligibility checks. Try again shortly." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

async function previewEligibility(req: Request, res: Response): Promise<void> {
  const platform = req.body?.platform;
  const identifier = typeof req.body?.identifier === "string" ? req.body.identifier.trim() : "";
  if ((platform !== "x" && platform !== "discord") || !identifier || identifier.length > 80) {
    res.status(400).json({ error: "Choose X or Discord and enter a valid username." });
    return;
  }

  const identity = platform === "x"
    ? { username: normalizeXHandle(identifier), discriminator: null }
    : parseDiscordIdentity(identifier, typeof req.body?.discriminator === "string" ? req.body.discriminator : null);
  const handle = identity.username;
  const usernameColumn = platform === "x" ? usersTable.xUsername : usersTable.discordUsername;
  const [matchedUser] = await db.select({ id: usersTable.id }).from(usersTable).where(and(
    eq(usernameColumn, handle),
    platform === "discord" && identity.discriminator ? eq(usersTable.discordDiscriminator, identity.discriminator) : undefined,
  ));

  let founder = await db.select().from(founderPassesTable)
    .where(and(
      eq(founderPassesTable.invitePlatform, platform),
      eq(founderPassesTable.inviteHandle, handle),
      platform === "discord" && identity.discriminator
        ? eq(founderPassesTable.inviteDiscriminator, identity.discriminator)
        : isNull(founderPassesTable.inviteDiscriminator),
    )).limit(1);
  if (!founder[0] && matchedUser) {
    founder = await db.select().from(founderPassesTable).where(eq(founderPassesTable.userId, matchedUser.id)).limit(1);
  }

  const founderRow = founder[0];
  const founderStatus = !founderRow
    ? "unknown"
    : founderRow.claimStatus === "claimed" || founderRow.claimStatus === "minted"
      ? "claimed"
      : founderRow.eligibilityStatus === "eligible"
        ? "eligible"
        : founderRow.eligibilityStatus === "under_review"
          ? "under_review"
          : "ineligible";

  let builderStatus: "verification_required" | "claimed" | "unknown" = "verification_required";
  if (matchedUser) {
    const [builder] = await db.select({ claimStatus: builderPassesTable.claimStatus })
      .from(builderPassesTable).where(eq(builderPassesTable.userId, matchedUser.id));
    if (builder?.claimStatus === "claimed" || builder?.claimStatus === "minted") builderStatus = "claimed";
  }

  // Deliberately minimal: never echo the searched handle, IDs, tiers, wallet
  // data, issue dates, or pass records. A username is not ownership proof.
  res.json({ founder: { status: founderStatus }, builder: { status: builderStatus } });
}

router.post("/eligibility/preview", previewEligibility);
router.post("/eligibility/check", previewEligibility);

export default router;
