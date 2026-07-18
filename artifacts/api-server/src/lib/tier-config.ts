import { db, builderTiersTable, type BuilderTier } from "@workspace/db";
import { asc, eq } from "drizzle-orm";

export interface BuilderActivityCounts {
  qualifyingTransactionCount: number;
  validContractCount: number;
}

export async function getActiveBuilderTiers(): Promise<BuilderTier[]> {
  return db
    .select()
    .from(builderTiersTable)
    .where(eq(builderTiersTable.isActive, true))
    .orderBy(asc(builderTiersTable.rank));
}

/**
 * Returns the highest tier whose published verified Arc transaction threshold
 * is met. Deployed contracts remain a separate verified proof signal on the
 * credential and never silently change the public transaction tier scale.
 */
export function calculateBuilderTier(
  tiers: BuilderTier[],
  counts: BuilderActivityCounts,
): BuilderTier | null {
  const sorted = [...tiers].sort((a, b) => b.rank - a.rank);
  for (const tier of sorted) {
    if (counts.qualifyingTransactionCount >= tier.transactionThreshold) return tier;
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
