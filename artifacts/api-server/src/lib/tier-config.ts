import { db, builderTiersTable, type BuilderTier } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { accountAgeDays, BUILDER_GITHUB_TIER_RULES } from "./builder-tier-policy";

export interface BuilderActivityCounts {
  qualifyingTransactionCount: number;
  validContractCount: number;
  githubContributionCount?: number | null;
  githubAccountCreatedAt?: Date | string | null;
  analysisTimestamp?: Date;
}

export async function getActiveBuilderTiers(): Promise<BuilderTier[]> {
  return db
    .select()
    .from(builderTiersTable)
    .where(eq(builderTiersTable.isActive, true))
    .orderBy(asc(builderTiersTable.rank));
}

/**
 * Returns the highest tier reached through either verified Arc activity or
 * verified GitHub history. GitHub-based qualification requires both the
 * contribution and account-age floor for that tier. Deployed contracts remain
 * a separate proof signal and never silently affect the tier.
 */
export function calculateBuilderTier(
  tiers: BuilderTier[],
  counts: BuilderActivityCounts,
): BuilderTier | null {
  const sorted = [...tiers].sort((a, b) => b.rank - a.rank);
  const githubContributions = Math.max(0, counts.githubContributionCount ?? 0);
  const githubAge = accountAgeDays(counts.githubAccountCreatedAt, counts.analysisTimestamp ?? new Date());
  for (const tier of sorted) {
    const githubRule = BUILDER_GITHUB_TIER_RULES[tier.slug.toLowerCase()];
    const qualifiesThroughArc = counts.qualifyingTransactionCount >= tier.transactionThreshold;
    const qualifiesThroughGithub = Boolean(
      githubRule
      && githubAge !== null
      && githubContributions >= githubRule.contributionThreshold
      && githubAge >= githubRule.minimumAccountAgeDays,
    );
    if (qualifiesThroughArc || qualifiesThroughGithub) return tier;
  }
  return null;
}

/** A tier upgrade may only ever move to a strictly higher rank. */
export function isUpgrade(currentTier: BuilderTier | null, candidateTier: BuilderTier | null): boolean {
  if (!candidateTier) return false;
  if (!currentTier) return true;
  return candidateTier.rank > currentTier.rank;
}

export const REVERIFICATION_COOLDOWN_DAYS = 7;
export const MINT_AUTHORIZATION_TTL_MINUTES = 15;
