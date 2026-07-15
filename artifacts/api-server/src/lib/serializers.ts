import { db, builderTiersTable, builderVerificationSnapshotsTable, builderTierHistoryTable, walletsTable, usersTable } from "@workspace/db";
import type { FounderPass, BuilderPass, FounderTier, BuilderTier } from "@workspace/db";
import { eq, desc, asc, and, count, isNotNull, inArray } from "drizzle-orm";
import { configuration } from "./env";
import { builderPassesTable } from "@workspace/db";

export function serializeFounderTier(tier: FounderTier | null | undefined) {
  if (!tier) return null;
  const visual = (tier.visualConfig ?? {}) as { accent?: string };
  return {
    id: tier.id,
    name: tier.name,
    emblemUrl: tier.emblemUrl,
    description: tier.description,
    accentColor: visual.accent ?? null,
    rank: tier.rank,
    isActive: tier.isActive,
  };
}

export function serializeBuilderTier(tier: BuilderTier | null | undefined, includeThresholds: boolean) {
  if (!tier) return null;
  const visual = (tier.visualConfig ?? {}) as { accent?: string };
  const base = {
    id: tier.id,
    slug: tier.slug,
    name: tier.name,
    emblemUrl: tier.emblemUrl,
    description: tier.description,
    accentColor: visual.accent ?? null,
    rank: tier.rank,
    isActive: tier.isActive,
  };
  if (!includeThresholds) return base;
  return { ...base, transactionThreshold: tier.transactionThreshold, contractThreshold: tier.contractThreshold };
}

export function serializeFounderPass(pass: FounderPass, tier: FounderTier | null, includeAdminFields: boolean) {
  const base = {
    id: pass.id,
    variant: pass.variant,
    founderTier: serializeFounderTier(tier),
    displayName: pass.displayName,
    username: pass.username,
    avatarUrl: pass.avatarUrl,
    founderTitle: pass.founderTitle,
    companyName: pass.companyName,
    companyIndustry: pass.companyIndustry,
    companyLogoUrl: pass.companyLogoUrl,
    companyWebsite: pass.companyWebsite,
    companyLocation: pass.companyLocation,
    startupStage: pass.startupStage,
    founderStatement: pass.founderStatement,
    companyDescription: pass.companyDescription,
    eligibilityStatus: pass.eligibilityStatus,
    claimStatus: pass.claimStatus,
    passNumber: pass.passNumber,
    network: pass.network,
    tokenId: pass.tokenId,
    contractAddress: pass.contractAddress,
    destinationWallet: pass.destinationWallet,
    transactionHash: pass.transactionHash,
    issuedAt: pass.issuedAt,
    claimedAt: pass.claimedAt,
    createdAt: pass.createdAt,
  };
  if (!includeAdminFields) return base;
  return {
    ...base,
    userId: pass.userId,
    inviteHandle: pass.inviteHandle,
    invitePlatform: pass.invitePlatform,
    invitedAt: pass.invitedAt,
    revokedAt: pass.revokedAt,
    revokedReason: pass.revokedReason,
    adminNotes: pass.adminNotes,
  };
}

export async function buildBuilderPassDTO(pass: BuilderPass, includeAdminFields: boolean) {
  const [tier] = pass.currentTierId ? await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, pass.currentTierId)) : [null];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pass.userId));
  const wallets = await db.select().from(walletsTable).where(and(eq(walletsTable.userId, pass.userId), isNotNull(walletsTable.ownershipVerifiedAt)));
  const [latestSnapshot] = await db
    .select()
    .from(builderVerificationSnapshotsTable)
    .where(eq(builderVerificationSnapshotsTable.builderPassId, pass.id))
    .orderBy(desc(builderVerificationSnapshotsTable.analysisTimestamp))
    .limit(1);
  const historyRows = await db
    .select()
    .from(builderTierHistoryTable)
    .where(eq(builderTierHistoryTable.builderPassId, pass.id))
    .orderBy(asc(builderTierHistoryTable.upgradedAt));

  const allTiers = await db.select().from(builderTiersTable);
  const tierNameById = new Map(allTiers.map((t) => [t.id, t.name]));

  const tierHistory = historyRows.map((h) => ({
    previousTierName: h.previousTierId ? (tierNameById.get(h.previousTierId) ?? null) : null,
    newTierName: tierNameById.get(h.newTierId) ?? "Unknown",
    upgradedAt: h.upgradedAt,
    transactionHash: h.transactionHash,
  }));

  const base = {
    id: pass.id,
    currentTier: serializeBuilderTier(tier ?? null, includeAdminFields),
    displayName: user?.displayName ?? null,
    discordUsername: user?.discordUsername ?? null,
    discordAvatarUrl: user?.discordAvatarUrl ?? null,
    builderRole: pass.builderRole,
    primaryEcosystem: pass.primaryEcosystem,
    githubVerified: false,
    verifiedWalletCount: wallets.length,
    qualifyingTransactionCount: latestSnapshot?.qualifyingTransactionCount ?? null,
    validContractCount: latestSnapshot?.validContractCount ?? null,
    eligibilityStatus: pass.eligibilityStatus,
    claimStatus: pass.claimStatus,
    upgradeAvailable: !!pass.proposedTierId,
    passNumber: pass.passNumber,
    network: pass.network,
    tokenId: pass.tokenId,
    contractAddress: pass.contractAddress,
    destinationWallet: pass.destinationWallet,
    transactionHash: pass.transactionHash,
    initiallyIssuedAt: pass.initiallyIssuedAt,
    lastVerifiedAt: pass.lastVerifiedAt,
    nextVerificationAt: pass.nextVerificationAt,
    isSuspended: pass.isSuspended,
    isRevoked: pass.isRevoked,
    createdAt: pass.createdAt,
    tierHistory,
  };

  if (!includeAdminFields) return base;
  return {
    ...base,
    userId: pass.userId,
    suspendedReason: pass.suspendedReason,
    revokedReason: pass.revokedReason,
    githubUsername: user?.githubUsername ?? null,
    walletAddresses: wallets.map((w) => w.address),
  };
}

export function builderPassMinted() {
  return eq(builderPassesTable.claimStatus, "minted");
}

export function builderPassClaimed() {
  return inArray(builderPassesTable.claimStatus, ["claimed", "minted"]);
}

export async function getBuilderSupply() {
  const [{ value: totalClaimed }] = await db.select({ value: count() }).from(builderPassesTable).where(builderPassClaimed());
  const [{ value: totalMinted }] = await db.select({ value: count() }).from(builderPassesTable).where(builderPassMinted());
  const [{ value: activeCount }] = await db.select({ value: count() }).from(builderPassesTable)
    .where(and(eq(builderPassesTable.claimStatus, "minted"), eq(builderPassesTable.isRevoked, false)));
  return {
    phaseName: configuration.builderPhaseName,
    phaseClaimLimit: configuration.builderPhaseClaimLimit,
    totalClaimed,
    totalMinted,
    activeCount,
    revokedCount: totalMinted - activeCount,
    remainingClaims: Math.max(configuration.builderPhaseClaimLimit - totalClaimed, 0),
    contractSupplyCapped: false,
  };
}
