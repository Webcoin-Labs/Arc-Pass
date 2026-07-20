export interface GithubTierRule {
  contributionThreshold: number;
  minimumAccountAgeDays: number;
}

/**
 * GitHub can independently qualify a builder for a tier, but contribution
 * volume and account age must both clear the tier's anti-abuse floor.
 * Arc transaction thresholds remain stored in the Builder tier catalog.
 */
export const BUILDER_GITHUB_TIER_RULES: Record<string, GithubTierRule> = {
  bronze: { contributionThreshold: 10, minimumAccountAgeDays: 180 },
  silver: { contributionThreshold: 250, minimumAccountAgeDays: 365 },
  gold: { contributionThreshold: 750, minimumAccountAgeDays: 730 },
  platinum: { contributionThreshold: 1_500, minimumAccountAgeDays: 1_095 },
  diamond: { contributionThreshold: 3_000, minimumAccountAgeDays: 1_460 },
};

export const GITHUB_CONTRIBUTION_WINDOW_DAYS = 180;
export const GITHUB_SNAPSHOT_MAX_AGE_DAYS = 7;

export function accountAgeDays(createdAt: Date | string | null | undefined, now = new Date()): number | null {
  if (!createdAt) return null;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime()) || created > now) return null;
  return Math.floor((now.getTime() - created.getTime()) / 86_400_000);
}
