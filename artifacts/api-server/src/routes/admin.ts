import { Router, type IRouter } from "express";
import {
  db,
  founderPassesTable,
  builderPassesTable,
  founderTiersTable,
  builderTiersTable,
  usersTable,
  founderApplicationsTable,
} from "@workspace/db";
import { eq, and, or, ilike, count, desc, sql, inArray, isNull } from "drizzle-orm";
import {
  AdminListFounderPassesQueryParams,
  AdminCreateFounderInviteBody,
  AdminGetFounderPassParams,
  AdminUpdateFounderPassParams,
  AdminUpdateFounderPassBody,
  AdminRevokeFounderInviteParams,
  AdminListBuilderPassesQueryParams,
  AdminGetBuilderPassParams,
  AdminUpdateBuilderPassParams,
  AdminUpdateBuilderPassBody,
  AdminSuspendBuilderPassParams,
  AdminSuspendBuilderPassBody,
  AdminUnsuspendBuilderPassParams,
  AdminRevokeBuilderPassParams,
  AdminRevokeBuilderPassBody,
  AdminCreateFounderTierBody,
  AdminUpdateFounderTierParams,
  AdminUpdateFounderTierBody,
  AdminUpdateBuilderTierParams,
  AdminUpdateBuilderTierBody,
  AdminListMintRecordsQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { normalizeXHandle, parseDiscordIdentity } from "../lib/identity";
import { auditAdmin, type AdminRequest } from "../lib/admin-auth";
import { serializeFounderPass, serializeFounderTier, serializeBuilderTier, buildBuilderPassDTO, builderPassClaimed, builderPassMinted } from "../lib/serializers";
import { imageUpload, persistUploadedImage } from "../lib/uploads";
import { REVERIFICATION_COOLDOWN_DAYS } from "../lib/tier-config";
import { configuration } from "../lib/env";
import { chainAdapter } from "../lib/chain-adapter";
import {
  FOUNDER_TIER_CATALOG_ERROR,
  FOUNDER_TIER_NAMES,
  getFounderTierCatalogEntry,
} from "../lib/founder-tier-catalog";

const router: IRouter = Router();
router.use("/admin", requireAdmin);
router.use("/admin", (req, res, next) => {
  if (req.method !== "GET") {
    res.on("finish", () => {
      if (res.statusCode < 400) void auditAdmin(req as AdminRequest, `admin.${req.method.toLowerCase()}`, "api_route", req.originalUrl);
    });
  }
  next();
});

async function founderTierMap() {
  const tiers = await db.select().from(founderTiersTable);
  return new Map(tiers.map((t) => [t.id, t]));
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

router.get("/admin/overview", requireAdmin, async (_req, res): Promise<void> => {
  const [{ value: founderPassesIssued }] = await db.select({ value: count() }).from(founderPassesTable).where(eq(founderPassesTable.claimStatus, "minted"));
  const [{ value: normalFounderPasses }] = await db
    .select({ value: count() })
    .from(founderPassesTable)
    .where(and(eq(founderPassesTable.claimStatus, "minted"), eq(founderPassesTable.variant, "normal")));
  const [{ value: premiumBlackFounderPasses }] = await db
    .select({ value: count() })
    .from(founderPassesTable)
    .where(and(eq(founderPassesTable.claimStatus, "minted"), eq(founderPassesTable.variant, "premium_black")));

  const [{ value: builderPassesIssued }] = await db.select({ value: count() }).from(builderPassesTable).where(builderPassMinted());
  const [{ value: builderPassesClaimed }] = await db.select({ value: count() }).from(builderPassesTable).where(builderPassClaimed());

  const distributionRows = await db
    .select({ name: builderTiersTable.name, value: count() })
    .from(builderPassesTable)
    .innerJoin(builderTiersTable, eq(builderPassesTable.currentTierId, builderTiersTable.id))
    .where(and(or(eq(builderPassesTable.claimStatus, "claimed"), eq(builderPassesTable.claimStatus, "minted")), eq(builderPassesTable.isRevoked, false)))
    .groupBy(builderTiersTable.name);

  const builderTierDistribution = Object.fromEntries(distributionRows.map((r) => [r.name, r.value]));

  const [{ value: pendingFounderReviews }] = await db.select({ value: count() }).from(founderPassesTable).where(eq(founderPassesTable.eligibilityStatus, "under_review"));
  const [{ value: pendingBuilderReviews }] = await db
    .select({ value: count() })
    .from(builderPassesTable)
    .where(and(eq(builderPassesTable.eligibilityStatus, "ineligible"), eq(builderPassesTable.claimStatus, "locked")));

  const [{ value: pendingReverifications }] = await db
    .select({ value: count() })
    .from(builderPassesTable)
    .where(
      and(
        or(eq(builderPassesTable.claimStatus, "claimed"), eq(builderPassesTable.claimStatus, "minted")),
        sql`${builderPassesTable.nextVerificationAt} <= now()`,
      ),
    );

  const [{ value: pendingUpgrades }] = await db.select({ value: count() }).from(builderPassesTable).where(sql`${builderPassesTable.proposedTierId} is not null`);
  const [{ value: suspendedPasses }] = await db.select({ value: count() }).from(builderPassesTable).where(eq(builderPassesTable.isSuspended, true));
  const [{ value: revokedBuilderPasses }] = await db.select({ value: count() }).from(builderPassesTable).where(eq(builderPassesTable.isRevoked, true));
  const [{ value: revokedFounderPasses }] = await db.select({ value: count() }).from(founderPassesTable).where(sql`${founderPassesTable.revokedAt} is not null`);

  res.json({
    founderPassesIssued,
    normalFounderPasses,
    premiumBlackFounderPasses,
    builderPassesIssued,
    builderPassesClaimed,
    builderPhaseName: configuration.builderPhaseName,
    builderPhaseClaimLimit: configuration.builderPhaseClaimLimit,
    builderClaimsRemaining: Math.max(configuration.builderPhaseClaimLimit - builderPassesClaimed, 0),
    builderTierDistribution,
    pendingFounderReviews,
    pendingBuilderReviews,
    pendingReverifications,
    pendingUpgrades,
    suspendedPasses,
    revokedPasses: revokedBuilderPasses + revokedFounderPasses,
  });
});

// ---------------------------------------------------------------------------
// Founder application requests
// ---------------------------------------------------------------------------

router.get("/admin/founder-applications", async (_req, res): Promise<void> => {
  const applications = await db
    .select({
      id: founderApplicationsTable.id,
      xUsername: founderApplicationsTable.xUsername,
      requestXUsername: founderApplicationsTable.requestXUsername,
      description: founderApplicationsTable.description,
      status: founderApplicationsTable.status,
      submittedAt: founderApplicationsTable.submittedAt,
    })
    .from(founderApplicationsTable)
    .where(eq(founderApplicationsTable.status, "under_review"))
    .orderBy(desc(founderApplicationsTable.submittedAt))
    .limit(100);

  res.json({
    items: applications.map((application) => ({
      id: application.id,
      xUsername: application.requestXUsername || application.xUsername || "unknown",
      description: application.description || "No description provided.",
      status: application.status,
      submittedAt: application.submittedAt,
    })),
  });
});

// ---------------------------------------------------------------------------
// Founder Passes
// ---------------------------------------------------------------------------

router.get("/admin/founder-passes", requireAdmin, async (req, res): Promise<void> => {
  const q = AdminListFounderPassesQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { status, variant, search, page = 1, limit = 20 } = q.data;

  const conditions = [
    status ? eq(founderPassesTable.eligibilityStatus, status) : undefined,
    variant ? eq(founderPassesTable.variant, variant) : undefined,
    search
      ? or(
          ilike(founderPassesTable.displayName, `%${search}%`),
          ilike(founderPassesTable.username, `%${search}%`),
          ilike(founderPassesTable.companyName, `%${search}%`),
          ilike(founderPassesTable.inviteHandle, `%${search}%`),
        )
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(founderPassesTable)
    .where(where)
    .orderBy(desc(founderPassesTable.createdAt))
    .offset((page - 1) * limit)
    .limit(limit);

  const [{ value: total }] = await db.select({ value: count() }).from(founderPassesTable).where(where);
  const tierMap = await founderTierMap();

  res.json({
    items: rows.map((row) => serializeFounderPass(row, row.founderTierId ? (tierMap.get(row.founderTierId) ?? null) : null, true)),
    total,
    page,
    limit,
  });
});

router.post("/admin/founder-passes", requireAdmin, async (req, res): Promise<void> => {
  const admin = (req as AdminRequest).admin;
  const parsed = AdminCreateFounderInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const identity = parsed.data.invitePlatform === "x"
    ? { username: normalizeXHandle(parsed.data.inviteHandle), discriminator: null }
    : parseDiscordIdentity(parsed.data.inviteHandle, parsed.data.inviteDiscriminator);
  const normalizedHandle = identity.username;
  const companyName = parsed.data.companyName.trim();
  if (!companyName) {
    res.status(400).json({ error: "Company name is required" });
    return;
  }

  const [existingInvite] = await db
    .select()
    .from(founderPassesTable)
    .where(and(
      eq(founderPassesTable.invitePlatform, parsed.data.invitePlatform),
      eq(founderPassesTable.inviteHandle, normalizedHandle),
      identity.discriminator
        ? eq(founderPassesTable.inviteDiscriminator, identity.discriminator)
        : isNull(founderPassesTable.inviteDiscriminator),
    ));
  if (existingInvite) {
    res.status(400).json({ error: "An invitation already exists for this handle" });
    return;
  }

  const usernameColumn = parsed.data.invitePlatform === "x" ? usersTable.xUsername : usersTable.discordUsername;
  const [matchedUser] = await db.select().from(usersTable).where(and(
    eq(usernameColumn, normalizedHandle),
    parsed.data.invitePlatform === "discord" && identity.discriminator
      ? eq(usersTable.discordDiscriminator, identity.discriminator)
      : undefined,
  ));

  if (matchedUser) {
    const [alreadyHasPass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.userId, matchedUser.id));
    if (alreadyHasPass) {
      res.status(400).json({ error: "This identity already has a Founder Pass" });
      return;
    }
  }

  const [created] = await db
    .insert(founderPassesTable)
    .values({
      userId: matchedUser?.id ?? null,
      inviteHandle: normalizedHandle,
      inviteDiscriminator: identity.discriminator,
      invitePlatform: parsed.data.invitePlatform,
      invitedAt: new Date(),
      invitedByUserId: null,
      variant: parsed.data.variant ?? "normal",
      founderTierId: parsed.data.founderTierId,
      founderTitle: parsed.data.founderTitle,
      companyName,
      companyIndustry: parsed.data.companyIndustry,
      companyLogoUrl: parsed.data.companyLogoUrl,
      adminNotes: parsed.data.adminNotes,
      eligibilityStatus: "eligible",
      claimStatus: "locked",
      displayName: matchedUser?.displayName,
      username: matchedUser?.xUsername ?? matchedUser?.discordUsername ?? matchedUser?.username,
      avatarUrl: matchedUser?.avatarUrl,
    })
    .returning();

  // A Founder request is only a review queue item. Once an administrator
  // creates the matching X invitation, close that request so it cannot linger
  // in the queue as though it still needs a decision.
  if (parsed.data.invitePlatform === "x") {
    await db
      .update(founderApplicationsTable)
      .set({ status: "approved", reviewerId: admin.id, reviewedAt: new Date() })
      .where(and(
        eq(founderApplicationsTable.requestXUsername, normalizedHandle),
        eq(founderApplicationsTable.status, "under_review"),
      ));
  }

  const tierMap = await founderTierMap();
  res.status(201).json(serializeFounderPass(created, created.founderTierId ? (tierMap.get(created.founderTierId) ?? null) : null, true));
});

router.get("/admin/founder-passes/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminGetFounderPassParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  const tierMap = await founderTierMap();
  res.json(serializeFounderPass(pass, pass.founderTierId ? (tierMap.get(pass.founderTierId) ?? null) : null, true));
});

router.patch("/admin/founder-passes/:id", requireAdmin, async (req, res): Promise<void> => {
  const paramsRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateFounderPassParams.safeParse({ id: parseInt(paramsRaw, 10) });
  const body = AdminUpdateFounderPassBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? "Invalid pass ID" : body.error!.message });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  const changingLockedField =
    (body.data.variant !== undefined && body.data.variant !== pass.variant) ||
    (body.data.founderTierId !== undefined && body.data.founderTierId !== pass.founderTierId);

  if (changingLockedField && pass.permanentlyLockedAt) {
    res.status(409).json({ error: "This Founder Pass is permanently locked — variant and tier cannot change after issuance" });
    return;
  }

  const [updated] = await db.update(founderPassesTable).set(body.data).where(eq(founderPassesTable.id, params.data.id)).returning();
  const tierMap = await founderTierMap();
  res.json(serializeFounderPass(updated, updated.founderTierId ? (tierMap.get(updated.founderTierId) ?? null) : null, true));
});

router.post("/admin/founder-passes/:id/revoke-invite", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminRevokeFounderInviteParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }
  if (pass.claimStatus === "minted") {
    res.status(409).json({ error: "This Founder Pass has already been minted and cannot have its invitation revoked" });
    return;
  }
  const [updated] = await db
    .update(founderPassesTable)
    .set({ eligibilityStatus: "ineligible", claimStatus: "locked", revokedAt: new Date(), revokedReason: "Invitation revoked by admin" })
    .where(eq(founderPassesTable.id, params.data.id))
    .returning();

  const tierMap = await founderTierMap();
  res.json(serializeFounderPass(updated, updated.founderTierId ? (tierMap.get(updated.founderTierId) ?? null) : null, true));
});

router.post("/admin/founder-passes/:id/revoke", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminRevokeFounderInviteParams.safeParse({ id: parseInt(raw, 10) });
  const body = AdminRevokeBuilderPassBody.safeParse(req.body ?? {});
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }
  if (pass.revokedAt) {
    res.status(409).json({ error: "Pass is already revoked" });
    return;
  }
  const reason = body.success ? (body.data.reason ?? "Revoked by admin") : "Revoked by admin";
  if (pass.claimStatus === "minted" && pass.tokenId) {
    if (!chainAdapter.mintingAvailable) {
      res.status(503).json({ error: "Onchain revocation is temporarily unavailable.", code: "minting_unavailable" });
      return;
    }
    try {
      const result = await chainAdapter.revokeFounderPass({ tokenId: pass.tokenId, reason });
      req.log.info({ founderPassId: pass.id, transactionHash: result.transactionHash }, "Founder pass revoked onchain");
    } catch (err) {
      req.log.error({ err, founderPassId: pass.id }, "Founder pass onchain revocation failed");
      res.status(502).json({ error: "Onchain revocation failed; the pass was not changed in the database." });
      return;
    }
  }

  const [updated] = await db.update(founderPassesTable).set({ revokedAt: new Date(), revokedReason: reason }).where(eq(founderPassesTable.id, pass.id)).returning();
  const tierMap = await founderTierMap();
  res.json(serializeFounderPass(updated, updated.founderTierId ? (tierMap.get(updated.founderTierId) ?? null) : null, true));
});

// ---------------------------------------------------------------------------
// Builder Passes
// ---------------------------------------------------------------------------

router.get("/admin/builder-passes", requireAdmin, async (req, res): Promise<void> => {
  const q = AdminListBuilderPassesQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { tierSlug, search, suspended, page = 1, limit = 20 } = q.data;

  let tierId: number | undefined;
  if (tierSlug) {
    const [tier] = await db.select().from(builderTiersTable).where(eq(builderTiersTable.slug, tierSlug));
    tierId = tier?.id;
  }

  const searchCondition = search
    ? or(ilike(usersTable.displayName, `%${search}%`), ilike(usersTable.discordUsername, `%${search}%`), ilike(usersTable.githubUsername, `%${search}%`))
    : undefined;

  const conditions = [
    tierId !== undefined ? eq(builderPassesTable.currentTierId, tierId) : undefined,
    suspended !== undefined ? eq(builderPassesTable.isSuspended, suspended) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const baseQuery = db.select({ pass: builderPassesTable }).from(builderPassesTable).innerJoin(usersTable, eq(builderPassesTable.userId, usersTable.id));

  const allConditions = searchCondition ? [...conditions, searchCondition] : conditions;
  const where = allConditions.length ? and(...allConditions) : undefined;

  const rows = await baseQuery
    .where(where)
    .orderBy(desc(builderPassesTable.createdAt))
    .offset((page - 1) * limit)
    .limit(limit);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(builderPassesTable)
    .innerJoin(usersTable, eq(builderPassesTable.userId, usersTable.id))
    .where(where);

  const items = await Promise.all(rows.map((r) => buildBuilderPassDTO(r.pass, true)));
  res.json({ items, total, page, limit });
});

router.get("/admin/builder-passes/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminGetBuilderPassParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  res.json(await buildBuilderPassDTO(pass, true));
});

router.patch("/admin/builder-passes/:id", requireAdmin, async (req, res): Promise<void> => {
  const paramsRaw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateBuilderPassParams.safeParse({ id: parseInt(paramsRaw, 10) });
  const body = AdminUpdateBuilderPassBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? "Invalid pass ID" : body.error!.message });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  const [updated] = await db.update(builderPassesTable).set(body.data).where(eq(builderPassesTable.id, params.data.id)).returning();
  res.json(await buildBuilderPassDTO(updated, true));
});

router.post("/admin/builder-passes/:id/suspend", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminSuspendBuilderPassParams.safeParse({ id: parseInt(raw, 10) });
  const body = AdminSuspendBuilderPassBody.safeParse(req.body ?? {});
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  const [updated] = await db
    .update(builderPassesTable)
    .set({ isSuspended: true, suspendedReason: body.success ? (body.data.reason ?? null) : null })
    .where(eq(builderPassesTable.id, params.data.id))
    .returning();

  res.json(await buildBuilderPassDTO(updated, true));
});

router.post("/admin/builder-passes/:id/unsuspend", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUnsuspendBuilderPassParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  const [updated] = await db
    .update(builderPassesTable)
    .set({ isSuspended: false, suspendedReason: null })
    .where(eq(builderPassesTable.id, params.data.id))
    .returning();

  res.json(await buildBuilderPassDTO(updated, true));
});

router.post("/admin/builder-passes/:id/revoke", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminRevokeBuilderPassParams.safeParse({ id: parseInt(raw, 10) });
  const body = AdminRevokeBuilderPassBody.safeParse(req.body ?? {});
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass) {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  if (pass.isRevoked) {
    res.status(409).json({ error: "Pass is already revoked" });
    return;
  }
  if (pass.waveMintReservedAt) {
    res.status(409).json({ error: "This pass has an onchain mint in progress. Wait for it to finish before revoking." });
    return;
  }
  if (pass.claimStatus === "minted" && pass.tokenId) {
    if (!chainAdapter.mintingAvailable) {
      res.status(503).json({ error: "Onchain revocation is temporarily unavailable.", code: "minting_unavailable" });
      return;
    }
    try {
      const result = await chainAdapter.revokeBuilderPass({ tokenId: pass.tokenId, reason: body.success ? (body.data.reason ?? "Revoked by admin") : "Revoked by admin" });
      req.log.info({ builderPassId: pass.id, transactionHash: result.transactionHash }, "Builder pass revoked onchain");
    } catch (err) {
      req.log.error({ err, builderPassId: pass.id }, "Builder pass onchain revocation failed");
      res.status(502).json({ error: "Onchain revocation failed; the pass was not changed in the database." });
      return;
    }
  }

  const [updated] = await db
    .update(builderPassesTable)
    .set({ isRevoked: true, revokedReason: body.success ? (body.data.reason ?? null) : null })
    .where(and(eq(builderPassesTable.id, params.data.id), eq(builderPassesTable.isRevoked, false)))
    .returning();

  res.json(await buildBuilderPassDTO(updated, true));
});

// ---------------------------------------------------------------------------
// Tier configuration
// ---------------------------------------------------------------------------

router.get("/admin/founder-tiers", requireAdmin, async (_req, res): Promise<void> => {
  const tiers = await db
    .select()
    .from(founderTiersTable)
    .where(and(eq(founderTiersTable.isActive, true), inArray(founderTiersTable.name, FOUNDER_TIER_NAMES)))
    .orderBy(founderTiersTable.rank);
  res.json(tiers.map((t) => serializeFounderTier(t)));
});

router.post("/admin/founder-tiers", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminCreateFounderTierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const catalogTier = getFounderTierCatalogEntry(parsed.data.name);
  if (!catalogTier || parsed.data.rank !== catalogTier.rank || parsed.data.isActive === false) {
    res.status(400).json({ error: FOUNDER_TIER_CATALOG_ERROR });
    return;
  }

  const [existing] = await db.select({ id: founderTiersTable.id }).from(founderTiersTable).where(eq(founderTiersTable.name, catalogTier.name));
  if (existing) {
    res.status(409).json({ error: `${catalogTier.name} already exists.` });
    return;
  }

  const [created] = await db
    .insert(founderTiersTable)
    .values({
      name: parsed.data.name,
      emblemUrl: parsed.data.emblemUrl,
      description: parsed.data.description,
      visualConfig: parsed.data.accentColor ? { accent: parsed.data.accentColor } : undefined,
      rank: catalogTier.rank,
      isActive: true,
    })
    .returning();

  res.status(201).json(serializeFounderTier(created));
});

router.patch("/admin/founder-tiers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateFounderTierParams.safeParse({ id: parseInt(raw, 10) });
  const body = AdminUpdateFounderTierBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? "Invalid tier ID" : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(founderTiersTable).where(eq(founderTiersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Tier not found" });
    return;
  }

  const catalogTier = getFounderTierCatalogEntry(existing.name);
  if (!catalogTier) {
    res.status(400).json({ error: FOUNDER_TIER_CATALOG_ERROR });
    return;
  }

  if (
    body.data.name !== catalogTier.name ||
    body.data.rank !== catalogTier.rank ||
    body.data.isActive === false
  ) {
    res.status(400).json({ error: FOUNDER_TIER_CATALOG_ERROR });
    return;
  }

  const { accentColor } = body.data;
  const [updated] = await db
    .update(founderTiersTable)
    .set({
      name: catalogTier.name,
      rank: catalogTier.rank,
      isActive: true,
      emblemUrl: body.data.emblemUrl,
      description: body.data.description,
      ...(accentColor !== undefined ? { visualConfig: { accent: accentColor } } : {}),
    })
    .where(eq(founderTiersTable.id, params.data.id))
    .returning();

  res.json(serializeFounderTier(updated));
});

router.get("/admin/builder-tiers", requireAdmin, async (_req, res): Promise<void> => {
  const tiers = await db.select().from(builderTiersTable).orderBy(builderTiersTable.rank);
  res.json(tiers.map((t) => serializeBuilderTier(t, true)));
});

router.patch("/admin/builder-tiers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateBuilderTierParams.safeParse({ id: parseInt(raw, 10) });
  const body = AdminUpdateBuilderTierBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? "Invalid tier ID" : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Tier not found" });
    return;
  }

  const protectedChanges = [
    body.data.name !== undefined && body.data.name !== existing.name,
    body.data.transactionThreshold !== undefined && body.data.transactionThreshold !== existing.transactionThreshold,
    body.data.contractThreshold !== undefined && body.data.contractThreshold !== 0,
    body.data.isActive !== undefined && body.data.isActive !== true,
  ];
  if (protectedChanges.some(Boolean)) {
    res.status(400).json({ error: "Builder tier names, thresholds, order, and active state are fixed product rules." });
    return;
  }

  const presentation = {
    ...(body.data.emblemUrl !== undefined ? { emblemUrl: body.data.emblemUrl } : {}),
    ...(body.data.description !== undefined ? { description: body.data.description } : {}),
  };
  const [updated] = await db
    .update(builderTiersTable)
    .set({ ...presentation, ...(body.data.accentColor !== undefined ? { visualConfig: { accent: body.data.accentColor } } : {}) })
    .where(eq(builderTiersTable.id, params.data.id))
    .returning();

  res.json(serializeBuilderTier(updated, true));
});

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

router.post("/admin/uploads/image", requireAdmin, imageUpload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = await persistUploadedImage(req.file);
  res.status(201).json({ url });
});

// ---------------------------------------------------------------------------
// Mint records
// ---------------------------------------------------------------------------

router.get("/admin/mint-records", requireAdmin, async (req, res): Promise<void> => {
  const q = AdminListMintRecordsQueryParams.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: q.error.message });
    return;
  }
  const { type, page = 1, limit = 20 } = q.data;

  const records: Array<{
    id: number;
    type: "founder" | "builder";
    displayName: string | null;
    passNumber: number | null;
    tokenId: string | null;
    network: string | null;
    destinationWallet: string | null;
    transactionHash: string | null;
    issuedAt: Date | null;
  }> = [];

  if (!type || type === "founder") {
    const founderRows = await db.select().from(founderPassesTable).where(eq(founderPassesTable.claimStatus, "minted"));
    records.push(
      ...founderRows.map((r) => ({
        id: r.id,
        type: "founder" as const,
        displayName: r.displayName,
        passNumber: r.passNumber,
        tokenId: r.tokenId,
        network: r.network,
        destinationWallet: r.destinationWallet,
        transactionHash: r.transactionHash,
        issuedAt: r.issuedAt,
      })),
    );
  }

  if (!type || type === "builder") {
    const builderRows = await db.select().from(builderPassesTable).where(eq(builderPassesTable.claimStatus, "minted"));
    const usersMap = new Map((await db.select().from(usersTable)).map((u) => [u.id, u]));
    records.push(
      ...builderRows.map((r) => ({
        id: r.id,
        type: "builder" as const,
        displayName: usersMap.get(r.userId)?.displayName ?? null,
        passNumber: r.passNumber,
        tokenId: r.tokenId,
        network: r.network,
        destinationWallet: r.destinationWallet,
        transactionHash: r.transactionHash,
        issuedAt: r.initiallyIssuedAt,
      })),
    );
  }

  records.sort((a, b) => (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0));
  const total = records.length;
  const page_ = records.slice((page - 1) * limit, (page - 1) * limit + limit);

  res.json({ items: page_, total, page, limit });
});

export default router;
