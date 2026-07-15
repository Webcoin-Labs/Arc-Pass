import { db, builderTiersTable, type BuilderTier } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

export interface BuilderActivityCounts {
  qualifyingTransactionCount: number;
  validContractCount: number;
}

/**
 * A builder must have at least one valid deployed contract to qualify for
 * any Builder tier — qualifying transactions alone are never enough. This
 * mirrors the product rule verbatim; do not remove it even if a huge tx
 * count would otherwise satisfy a tier's transactionThreshold.
 */
export const MINIMUM_VALID_CONTRACTS_TO_QUALIFY = 1;

export async function getActiveBuilderTiers(): Promise<BuilderTier[]> {
  return db
    .select()
    .from(builderTiersTable)
    .where(eq(builderTiersTable.isActive, true))
    .orderBy(asc(builderTiersTable.rank));
}

/**
 * Highest tier whose threshold is met by EITHER qualifying transactions OR
 * valid contracts deployed (not both required). Returns null if the
 * baseline contract requirement isn't met or no tier's thresholds are hit.
 */
export function calculateBuilderTier(
  tiers: BuilderTier[],
  counts: BuilderActivityCounts,
): BuilderTier | null {
  if (counts.validContractCount < MINIMUM_VALID_CONTRACTS_TO_QUALIFY) return null;

  const sorted = [...tiers].sort((a, b) => b.rank - a.rank);
  for (const tier of sorted) {
    if (
      counts.qualifyingTransactionCount >= tier.transactionThreshold ||
      counts.validContractCount >= tier.contractThreshold
    ) {
      return tier;
    }
  }
  return null;
}

/** A tier upgrade may only ever move to a strictly higher rank. */
export function isUpgrade(currentTier: BuilderTier | null, candidateTier: BuilderTier | null): boolean {
  if (!candidateTier) return false;
  if (!currentTier) return true;
  return candidateTier.rank > currentTier.rank;
}

export const BUILDER_SUPPLY_CAP = 1500;
export const REVERIFICATION_COOLDOWN_DAYS = 7;
export const MINT_AUTHORIZATION_TTL_MINUTES = 15;
