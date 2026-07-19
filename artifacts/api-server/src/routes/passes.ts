import { Router, type IRouter } from "express";
import {
  db,
  founderPassesTable,
  builderPassesTable,
  founderTiersTable,
  builderTiersTable,
  builderVerificationSnapshotsTable,
  builderTierHistoryTable,
  walletsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, isNotNull, isNull, sql } from "drizzle-orm";
import {
  GetFounderPassParams,
  GetFounderPassDownloadUrlParams,
  MintFounderPassBody,
  GetBuilderPassParams,
  GetBuilderPassDownloadUrlParams,
  MintBuilderPassBody,
} from "@workspace/api-zod";
import { getGithubEligibilityFailure, requireAuth, type AuthedRequest } from "../lib/auth";
import { serializeFounderPass, serializeBuilderTier, buildBuilderPassDTO, getBuilderSupply } from "../lib/serializers";
import { chainAdapter, checksumAddress, computeIdentityHash, VerificationUnavailableError, type Network } from "../lib/chain-adapter";
import { getActiveBuilderTiers, calculateBuilderTier, isUpgrade, REVERIFICATION_COOLDOWN_DAYS } from "../lib/tier-config";
import { configuration } from "../lib/env";
import { isDevelopmentTestUser } from "../lib/dev-test-identities";
import { releaseBuilderWaveMintReservation, reserveBuilderWaveMint } from "../lib/wave-allocation";
import { releaseFounderMintReservation, reserveFounderMint } from "../lib/founder-mint-lock";

const router: IRouter = Router();

function requireBuilderGithubSignals(user: typeof usersTable.$inferSelect, res: import("express").Response): boolean {
  if (isDevelopmentTestUser(user)) return true;
  const failure = getGithubEligibilityFailure(user);
  if (!failure) return true;
  if (failure === "not_connected") res.status(403).json({ error: "Connect and verify your GitHub account before continuing.", code: "github_verification_required" });
  else if (failure === "provider_unavailable") res.status(503).json({ error: "GitHub eligibility signals are temporarily unavailable. Reconnect GitHub and try again.", code: "github_verification_unavailable" });
  else if (failure === "reconnect_required") res.status(409).json({ error: "Reconnect GitHub to refresh the previous 180 days of contribution data.", code: "github_reconnect_required" });
  else if (failure === "account_too_new") res.status(403).json({ error: "Builder eligibility requires a GitHub account at least 180 days old.", code: "github_account_too_new" });
  else res.status(403).json({ error: "Builder eligibility requires at least 10 GitHub contributions during the previous 180 days.", code: "github_contributions_insufficient" });
  return false;
}

async function getDashboardPasses(user: (typeof usersTable.$inferSelect)) {
  const [founderRow] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.userId, user.id));
  const [builderRow] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.userId, user.id));
  const [founderTier] = founderRow?.founderTierId
    ? await db.select().from(founderTiersTable).where(eq(founderTiersTable.id, founderRow.founderTierId))
    : [null];

  const founder = founderRow ? serializeFounderPass(founderRow, founderTier ?? null, false) : null;
  const builder = builderRow ? await buildBuilderPassDTO(builderRow, false) : null;
  if (!isDevelopmentTestUser(user)) return { founder, builder };

  // Local QA projection only. The database row remains locked and no claim,
  // mint, wallet signature, token ID, transaction hash, or onchain record is
  // forged. The UI must still make the tester click Claim before showing the
  // claimed/inventory state.
  return {
    founder: founder ? {
      ...founder,
      eligibilityStatus: "eligible",
      founderTitle: founder.founderTitle ?? "Founder",
      companyName: founder.companyName ?? "Webcoin Labs",
      companyIndustry: founder.companyIndustry ?? "Identity Infrastructure",
      companyLogoUrl: founder.companyLogoUrl ?? "/brand/webcoin-mono-white.webp",
    } : null,
    builder: builder ? {
      ...builder,
      eligibilityStatus: "eligible",
      builderRole: builder.builderRole ?? "Arc Ecosystem Builder",
      githubVerified: true,
    } : null,
  };
}

async function isOwnershipVerifiedWallet(userId: number, address: string): Promise<boolean> {
  const verifiedWallets = await db
    .select({ address: walletsTable.address })
    .from(walletsTable)
    .where(and(eq(walletsTable.userId, userId), isNotNull(walletsTable.ownershipVerifiedAt)));

  return verifiedWallets.some((wallet) => wallet.address.toLowerCase() === address.toLowerCase());
}

// ---------------------------------------------------------------------------
// My passes / dashboard
// ---------------------------------------------------------------------------

router.get("/passes/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  res.json(await getDashboardPasses(user));
});

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const passes = await getDashboardPasses(user);

  res.json({
    ...passes,
    builderSupply: await getBuilderSupply(),
  });
});

// ---------------------------------------------------------------------------
// Founder Pass
// ---------------------------------------------------------------------------

router.get("/passes/founder/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetFounderPassParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, params.data.id));
  if (!pass || pass.claimStatus === "locked") {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  const [tier] = pass.founderTierId ? await db.select().from(founderTiersTable).where(eq(founderTiersTable.id, pass.founderTierId)) : [null];
  res.json(serializeFounderPass(pass, tier ?? null, false));
});

router.get("/passes/founder/:id/download-url", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetFounderPassDownloadUrlParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, params.data.id));
  if (!pass || pass.claimStatus === "locked") {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  res.status(404).json({ error: "No server-rendered asset available yet — use Download Pass on the pass page to export an image client-side." });
});

router.post("/passes/founder/claim", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.userId, user.id));

  if (!pass) {
    res.status(400).json({ error: "You don't have an eligible Founder Pass" });
    return;
  }
  if (pass.eligibilityStatus !== "eligible") {
    res.status(400).json({ error: "Your Founder Pass is not yet eligible to claim" });
    return;
  }
  if (pass.claimStatus !== "locked") {
    res.status(400).json({ error: "This Founder Pass has already been claimed" });
    return;
  }

  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    // Credential numbers are inventory identifiers, so allocate one when the
    // pass is claimed rather than when it is later minted. Serializing this
    // boundary prevents two concurrent Founder claims from receiving the same
    // number. MAX also avoids colliding with an existing admin-assigned number.
    await tx.execute(sql`select pg_advisory_xact_lock(1095781717)`);
    const [{ nextPassNumber }] = await tx
      .select({ nextPassNumber: sql<number>`coalesce(max(${founderPassesTable.passNumber}), 0)::int + 1` })
      .from(founderPassesTable);

    const [claimed] = await tx
      .update(founderPassesTable)
      .set({
        claimStatus: "claimed",
        passNumber: pass.passNumber ?? nextPassNumber,
        claimedAt: now,
        displayName: pass.displayName ?? user.displayName,
        username: pass.username ?? user.xUsername ?? user.discordUsername ?? user.username,
        avatarUrl: pass.avatarUrl ?? user.avatarUrl ?? user.discordAvatarUrl,
      })
      .where(and(eq(founderPassesTable.id, pass.id), eq(founderPassesTable.claimStatus, "locked")))
      .returning();
    return claimed ?? null;
  });

  if (!updated) {
    res.status(409).json({ error: "This Founder Pass has already been claimed" });
    return;
  }

  const [tier] = updated.founderTierId ? await db.select().from(founderTiersTable).where(eq(founderTiersTable.id, updated.founderTierId)) : [null];
  res.json(serializeFounderPass(updated, tier ?? null, false));
});

router.post("/passes/founder/mint", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (!chainAdapter.mintingAvailable) { res.status(503).json({ error: "Onchain minting is temporarily unavailable.", code: "minting_unavailable" }); return; }
  const bodyParsed = MintFounderPassBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.userId, user.id));
  if (!pass) {
    res.status(400).json({ error: "You don't have an eligible Founder Pass" });
    return;
  }
  if (pass.claimStatus === "minted") {
    res.status(400).json({ error: "This Founder Pass has already been minted" });
    return;
  }
  if (pass.claimStatus !== "claimed") {
    res.status(400).json({ error: "Claim your Founder Pass before minting it" });
    return;
  }

  const { walletAddress, network = "arc" } = bodyParsed.data;
  if (!walletAddress) {
    res.status(400).json({ error: "A destination wallet address is required" });
    return;
  }

  let destinationWallet: string;
  try {
    destinationWallet = checksumAddress(walletAddress);
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  if (!(await isOwnershipVerifiedWallet(user.id, destinationWallet))) {
    res.status(400).json({ error: "A non-transferable pass can only be minted to a wallet you have ownership-verified." });
    return;
  }

  const reservationTime = new Date();
  // The external chain request stays outside the serialized reservation
  // transaction so a slow provider cannot pin a database transaction open.
  const reservation = await reserveFounderMint(pass.id, reservationTime);
  if (!reservation) {
    res.status(409).json({ error: "This mint is already in progress or has already completed", code: "founder_mint_unavailable" });
    return;
  }

  const identityHash = computeIdentityHash("founder", user.id);
  const metadataUri = `${configuration.appUrl.replace(/\/$/, "")}/api/metadata/founder/${pass.id}`;
  let mintResult: Awaited<ReturnType<typeof chainAdapter.mintFounderPass>>;
  try {
    mintResult = await chainAdapter.mintFounderPass({ identityHash, destinationWallet, network: network as Network, variant: pass.variant, metadataUri });
  } catch (error) {
    await releaseFounderMintReservation(pass.id, reservationTime);
    throw error;
  }

  const now = new Date();
  const [updated] = await db
    .update(founderPassesTable)
    .set({
      claimStatus: "minted",
      destinationWallet,
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      transactionHash: mintResult.transactionHash,
      network: mintResult.network,
      issuedAt: pass.issuedAt ?? now,
      permanentlyLockedAt: now,
      mintReservedAt: null,
    })
    .where(and(eq(founderPassesTable.id, pass.id), eq(founderPassesTable.mintReservedAt, reservationTime)))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "The mint completed but its reservation could not be finalized. Contact support with the transaction hash.", code: "mint_finalization_failed", transactionHash: mintResult.transactionHash });
    return;
  }

  const [tier] = updated.founderTierId ? await db.select().from(founderTiersTable).where(eq(founderTiersTable.id, updated.founderTierId)) : [null];
  res.json(serializeFounderPass(updated, tier ?? null, false));
});

// ---------------------------------------------------------------------------
// Builder Pass
// ---------------------------------------------------------------------------

router.get("/passes/builder/supply", async (_req, res): Promise<void> => {
  res.json(await getBuilderSupply());
});

router.get("/passes/builder/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetBuilderPassParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass || pass.claimStatus !== "minted") {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  res.json(await buildBuilderPassDTO(pass, false));
});

router.get("/passes/builder/:id/download-url", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetBuilderPassDownloadUrlParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid pass ID" });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, params.data.id));
  if (!pass || pass.claimStatus !== "minted") {
    res.status(404).json({ error: "Pass not found" });
    return;
  }

  res.status(404).json({ error: "No server-rendered asset available yet — use Download Pass on the pass page to export an image client-side." });
});

async function runBuilderAnalysis(userId: number) {
  const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)))[0];
  const wallets = await db.select().from(walletsTable).where(and(eq(walletsTable.userId, userId), isNotNull(walletsTable.ownershipVerifiedAt)));
  const walletAddresses = wallets.map((w) => w.address);

  const activity = await chainAdapter.getBuilderOnchainActivity(walletAddresses);
  const qualitative = {
    githubSummary: null,
    ecosystemSummary: `${activity.qualifyingTransactionCount} qualifying transactions and ${activity.validContractCount} valid contract deployments were verified.`,
    riskFlags: [] as string[],
  };

  const tiers = await getActiveBuilderTiers();
  const tier = calculateBuilderTier(tiers, activity);

  return { activity, qualitative, tier, wallets };
}

router.post("/passes/builder/verify", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;

  if (!user.discordUserId && !isDevelopmentTestUser(user)) {
    res.status(400).json({ error: "Connect and verify your Discord account before running Onchain Builder verification", code: "discord_verification_required" });
    return;
  }
  if (!requireBuilderGithubSignals(user, res)) return;

  const [existing] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.userId, user.id));
  if (existing && existing.claimStatus !== "locked") {
    res.status(400).json({ error: "Your Builder Pass is already claimed — use re-verification instead" });
    return;
  }

  const walletsForUser = await db.select().from(walletsTable).where(and(eq(walletsTable.userId, user.id), isNotNull(walletsTable.ownershipVerifiedAt)));
  if (walletsForUser.length === 0) {
    res.status(400).json({ error: "Connect and ownership-verify at least one wallet before running Onchain Builder verification" });
    return;
  }

  let analysis: Awaited<ReturnType<typeof runBuilderAnalysis>>;
  try { analysis = await runBuilderAnalysis(user.id); }
  catch (error) {
    if (error instanceof VerificationUnavailableError) { res.status(503).json({ error: error.message, code: "verification_unavailable" }); return; }
    throw error;
  }
  const { activity, qualitative, tier, wallets } = analysis;
  const eligibilityStatus = tier ? "eligible" : "ineligible";

  let builderPassId: number;
  if (existing) {
    await db
      .update(builderPassesTable)
      .set({ currentTierId: tier?.id ?? null, eligibilityStatus, lastVerifiedAt: new Date(), builderRole: existing.builderRole })
      .where(eq(builderPassesTable.id, existing.id));
    builderPassId = existing.id;
  } else {
    const [created] = await db
      .insert(builderPassesTable)
      .values({
        userId: user.id,
        currentTierId: tier?.id ?? null,
        eligibilityStatus,
        claimStatus: "locked",
        lastVerifiedAt: new Date(),
      })
      .returning();
    builderPassId = created.id;
  }

  await db.insert(builderVerificationSnapshotsTable).values({
    builderPassId,
    githubSummary: qualitative.githubSummary,
    walletSummary: wallets.map((w) => ({ address: w.address, chain: w.chain })),
    ecosystemSummary: qualitative.ecosystemSummary,
    qualifyingTransactionCount: activity.qualifyingTransactionCount,
    validContractCount: activity.validContractCount,
    calculatedTierId: tier?.id ?? null,
    lastReviewedBlock: activity.lastReviewedBlock,
    internalRiskFlags: qualitative.riskFlags,
    usdcSpent: activity.usdcSpent ?? null,
    eurcSpent: activity.eurcSpent ?? null,
    firstTransactionAt: activity.firstTransactionAt ? new Date(activity.firstTransactionAt) : null,
    lastTransactionAt: activity.lastTransactionAt ? new Date(activity.lastTransactionAt) : null,
    transactionsLast30Days: activity.transactionsLast30Days ?? 0,
    activeDaysLast30Days: activity.activeDaysLast30Days ?? 0,
  });

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, builderPassId));
  const summary = [
    "Social identity verified",
    `${wallets.length} wallet${wallets.length === 1 ? "" : "s"} ownership-verified`,
    tier ? `Builder tier assigned: ${tier.name}` : "No qualifying contract deployment found yet",
    qualitative.ecosystemSummary,
  ];

  res.json({ builderPass: await buildBuilderPassDTO(pass, false), proposedTier: null, summary });
});

router.post("/passes/builder/reverify", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (!requireBuilderGithubSignals(user, res)) return;
  const [existing] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.userId, user.id));

  if (!existing || existing.claimStatus === "locked") {
    res.status(400).json({ error: "Claim your Builder Pass before re-verifying" });
    return;
  }
  if (existing.nextVerificationAt && existing.nextVerificationAt > new Date()) {
    res.status(429).json({ error: "Re-verification cooldown is still active", nextVerificationAt: existing.nextVerificationAt.toISOString() });
    return;
  }

  let analysis: Awaited<ReturnType<typeof runBuilderAnalysis>>;
  try { analysis = await runBuilderAnalysis(user.id); }
  catch (error) {
    if (error instanceof VerificationUnavailableError) { res.status(503).json({ error: error.message, code: "verification_unavailable" }); return; }
    throw error;
  }
  const { activity, qualitative, tier: candidateTier, wallets } = analysis;
  const [currentTier] = existing.currentTierId ? await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, existing.currentTierId)) : [null];

  const [snapshot] = await db
    .insert(builderVerificationSnapshotsTable)
    .values({
      builderPassId: existing.id,
      githubSummary: qualitative.githubSummary,
      walletSummary: wallets.map((w) => ({ address: w.address, chain: w.chain })),
      ecosystemSummary: qualitative.ecosystemSummary,
      qualifyingTransactionCount: activity.qualifyingTransactionCount,
      validContractCount: activity.validContractCount,
      calculatedTierId: candidateTier?.id ?? null,
      lastReviewedBlock: activity.lastReviewedBlock,
      internalRiskFlags: qualitative.riskFlags,
      usdcSpent: activity.usdcSpent ?? null,
      eurcSpent: activity.eurcSpent ?? null,
      firstTransactionAt: activity.firstTransactionAt ? new Date(activity.firstTransactionAt) : null,
      lastTransactionAt: activity.lastTransactionAt ? new Date(activity.lastTransactionAt) : null,
      transactionsLast30Days: activity.transactionsLast30Days ?? 0,
      activeDaysLast30Days: activity.activeDaysLast30Days ?? 0,
    })
    .returning();

  const upgradeIsAvailable = isUpgrade(currentTier ?? null, candidateTier);
  const nextVerificationAt = new Date(Date.now() + REVERIFICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(builderPassesTable)
    .set({
      lastVerifiedAt: new Date(),
      nextVerificationAt,
      proposedTierId: upgradeIsAvailable ? (candidateTier?.id ?? null) : null,
      proposedTierSnapshotId: upgradeIsAvailable ? snapshot.id : null,
    })
    .where(eq(builderPassesTable.id, existing.id));

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, existing.id));
  const summary = upgradeIsAvailable
    ? [`Your verified activity now qualifies for ${candidateTier?.name}.`, qualitative.ecosystemSummary]
    : ["Your current tier remains the highest verified tier.", qualitative.ecosystemSummary];

  res.json({
    builderPass: await buildBuilderPassDTO(pass, false),
    proposedTier: upgradeIsAvailable ? serializeBuilderTier(candidateTier, false) : null,
    summary,
  });
});

router.post("/passes/builder/upgrade", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const [existing] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.userId, user.id));

  if (!existing || !existing.proposedTierId) {
    res.status(400).json({ error: "No pending tier upgrade to confirm" });
    return;
  }

  const [newTier] = await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, existing.proposedTierId));
  if (!newTier) {
    res.status(400).json({ error: "No pending tier upgrade to confirm" });
    return;
  }

  let transactionHash: string | null = null;
  if (existing.claimStatus === "minted" && existing.tokenId) {
    if (!chainAdapter.mintingAvailable) { res.status(503).json({ error: "Onchain minting is temporarily unavailable.", code: "minting_unavailable" }); return; }
    const result = await chainAdapter.upgradeBuilderTier({ tokenId: existing.tokenId, network: (existing.network as Network) ?? "arc", tierSlug: newTier.slug });
    transactionHash = result.transactionHash;
  }

  await db.insert(builderTierHistoryTable).values({
    builderPassId: existing.id,
    previousTierId: existing.currentTierId,
    newTierId: newTier.id,
    verificationSnapshotId: existing.proposedTierSnapshotId,
    transactionHash,
    upgradedAt: new Date(),
  });

  await db
    .update(builderPassesTable)
    .set({
      currentTierId: newTier.id,
      proposedTierId: null,
      proposedTierSnapshotId: null,
      lastTierUpgradeAt: new Date(),
      transactionHash: transactionHash ?? existing.transactionHash,
    })
    .where(eq(builderPassesTable.id, existing.id));

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, existing.id));
  res.json(await buildBuilderPassDTO(pass, false));
});

router.post("/passes/builder/claim", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  if (!user.discordUserId && !isDevelopmentTestUser(user)) {
    res.status(403).json({ error: "Connect and verify your Discord account before claiming an Onchain Builder Pass.", code: "discord_verification_required" });
    return;
  }
  if (!requireBuilderGithubSignals(user, res)) return;
  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.userId, user.id));

  if (!pass) {
    res.status(400).json({ error: "Run Builder verification first" });
    return;
  }
  if (pass.eligibilityStatus !== "eligible") {
    res.status(400).json({ error: "Your Builder Pass is not yet eligible to claim" });
    return;
  }
  if (pass.claimStatus !== "locked") {
    res.status(400).json({ error: "This Builder Pass has already been claimed" });
    return;
  }

  const now = new Date();
  const updated = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(1095781716)`);
    const [{ nextPassNumber }] = await tx
      .select({ nextPassNumber: sql<number>`coalesce(max(${builderPassesTable.passNumber}), 0)::int + 1` })
      .from(builderPassesTable);
    const [claimed] = await tx
      .update(builderPassesTable)
      .set({
        claimStatus: "claimed",
        passNumber: pass.passNumber ?? nextPassNumber,
        initiallyIssuedAt: now,
        nextVerificationAt: new Date(now.getTime() + REVERIFICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000),
      })
      .where(and(eq(builderPassesTable.id, pass.id), eq(builderPassesTable.claimStatus, "locked")))
      .returning();
    if (!claimed) return null;

    await tx.insert(builderTierHistoryTable).values({
      builderPassId: pass.id,
      previousTierId: null,
      newTierId: pass.currentTierId!,
      verificationSnapshotId: null,
      transactionHash: null,
      upgradedAt: now,
    });
    return claimed;
  });

  if (!updated) {
    res.status(409).json({ error: "This Builder Pass has already been claimed" });
    return;
  }

  res.json(await buildBuilderPassDTO(updated, false));
});

router.post("/passes/builder/mint", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthedRequest).user;
  const bodyParsed = MintBuilderPassBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.userId, user.id));
  if (!pass) {
    res.status(400).json({ error: "Run Builder verification first" });
    return;
  }
  if (pass.claimStatus === "minted") {
    res.status(400).json({ error: "This Builder Pass has already been minted" });
    return;
  }
  if (pass.claimStatus !== "claimed") {
    res.status(400).json({ error: "Claim your Builder Pass before minting it" });
    return;
  }

  if (!chainAdapter.mintingAvailable) { res.status(503).json({ error: "Onchain minting is temporarily unavailable.", code: "minting_unavailable" }); return; }

  const { walletAddress, network = "arc" } = bodyParsed.data;
  if (!walletAddress) {
    res.status(400).json({ error: "A destination wallet address is required" });
    return;
  }

  let destinationWallet: string;
  try {
    destinationWallet = checksumAddress(walletAddress);
  } catch {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  if (!(await isOwnershipVerifiedWallet(user.id, destinationWallet))) {
    res.status(400).json({ error: "A non-transferable pass can only be minted to a wallet you have ownership-verified." });
    return;
  }

  const [currentTier] = pass.currentTierId ? await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, pass.currentTierId)) : [null];
  if (!currentTier) {
    res.status(400).json({ error: "No verified tier to mint" });
    return;
  }

  const reservationTime = new Date();
  // The external chain request stays outside the serialized reservation
  // transaction so a slow provider cannot pin a database transaction open.
  const reservation = await reserveBuilderWaveMint(pass.id, configuration.builderPhaseClaimLimit, reservationTime);

  if (!reservation) {
    res.status(409).json({ error: `${configuration.builderPhaseName} onchain mint allocation is complete or this mint is already in progress`, code: "wave_mint_unavailable" });
    return;
  }

  const identityHash = computeIdentityHash("builder", user.id);
  const metadataUri = `${configuration.appUrl.replace(/\/$/, "")}/api/metadata/builder/${pass.id}`;
  let mintResult: Awaited<ReturnType<typeof chainAdapter.mintBuilderPass>>;
  try {
    mintResult = await chainAdapter.mintBuilderPass({ identityHash, destinationWallet, network: network as Network, tierSlug: currentTier.slug, metadataUri });
  } catch (error) {
    await releaseBuilderWaveMintReservation(pass.id, reservationTime);
    throw error;
  }

  const [updated] = await db
    .update(builderPassesTable)
    .set({
      claimStatus: "minted",
      destinationWallet,
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      transactionHash: mintResult.transactionHash,
      network: mintResult.network,
      waveMintReservedAt: null,
    })
    .where(and(eq(builderPassesTable.id, pass.id), eq(builderPassesTable.waveMintReservedAt, reservationTime)))
    .returning();

  if (!updated) {
    res.status(409).json({ error: "The mint completed but its reservation could not be finalized. Contact support with the transaction hash.", code: "mint_finalization_failed", transactionHash: mintResult.transactionHash });
    return;
  }

  res.json(await buildBuilderPassDTO(updated, false));
});

export default router;
