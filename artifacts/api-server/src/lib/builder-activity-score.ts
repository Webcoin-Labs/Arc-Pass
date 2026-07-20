import { accountAgeDays, BUILDER_GITHUB_TIER_RULES } from "./builder-tier-policy";

interface BuilderActivityInput {
  tierName?: string | null;
  qualifyingTransactionCount?: number | null;
  validContractCount?: number | null;
  githubContributionCount?: number | null;
  githubAccountCreatedAt?: Date | string | null;
  transactionsLast30Days?: number | null;
  activeDaysLast30Days?: number | null;
  lastTransactionAt?: Date | string | null;
  analysisTimestamp?: Date | string | null;
  rankTotal: number;
}

interface LevelBand {
  floor: number;
  ceiling: number;
  transactionFloor: number;
  transactionCeiling: number;
  githubContributionCeiling: number;
  githubAgeCeilingDays: number;
}

const LEVEL_BANDS: Record<string, LevelBand> = {
  bronze: { floor: 10, ceiling: 29, transactionFloor: 2, transactionCeiling: 9, githubContributionCeiling: 249, githubAgeCeilingDays: 364 },
  silver: { floor: 30, ceiling: 49, transactionFloor: 10, transactionCeiling: 49, githubContributionCeiling: 749, githubAgeCeilingDays: 729 },
  gold: { floor: 50, ceiling: 69, transactionFloor: 50, transactionCeiling: 99, githubContributionCeiling: 1_499, githubAgeCeilingDays: 1_094 },
  platinum: { floor: 70, ceiling: 89, transactionFloor: 100, transactionCeiling: 999, githubContributionCeiling: 2_999, githubAgeCeilingDays: 1_459 },
  diamond: { floor: 90, ceiling: 100, transactionFloor: 1_000, transactionCeiling: 10_000, githubContributionCeiling: 6_000, githubAgeCeilingDays: 2_920 },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function safeDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function proofBonus(validContractCount: number) {
  return Number(validContractCount >= 1)
    + Number(validContractCount >= 5);
}

function scaledLog(value: number, target: number, points: number) {
  return (Math.log1p(clamp(value, 0, target)) / Math.log1p(target)) * points;
}

function calculateLevel(input: BuilderActivityInput) {
  const normalizedTier = input.tierName?.toLowerCase().replace(/\s+/g, "") ?? "";
  const band = LEVEL_BANDS[normalizedTier];
  if (!band) return null;

  const transactions = Math.max(0, input.qualifyingTransactionCount ?? 0);
  const contracts = Math.max(0, input.validContractCount ?? 0);
  const githubContributions = Math.max(0, input.githubContributionCount ?? 0);
  const githubRule = BUILDER_GITHUB_TIER_RULES[normalizedTier];
  const analyzedAt = safeDate(input.analysisTimestamp) ?? new Date();
  const githubAge = accountAgeDays(input.githubAccountCreatedAt, analyzedAt);
  const transactionProgress = clamp((transactions - band.transactionFloor) / Math.max(1, band.transactionCeiling - band.transactionFloor), 0, 1);
  const contributionProgress = githubRule
    ? clamp((githubContributions - githubRule.contributionThreshold) / Math.max(1, band.githubContributionCeiling - githubRule.contributionThreshold), 0, 1)
    : 0;
  const ageProgress = githubRule && githubAge !== null
    ? clamp((githubAge - githubRule.minimumAccountAgeDays) / Math.max(1, band.githubAgeCeilingDays - githubRule.minimumAccountAgeDays), 0, 1)
    : 0;
  const progress = Math.max(transactionProgress, Math.min(contributionProgress, ageProgress));
  const progressPointsAvailable = Math.max(0, band.ceiling - band.floor - 2);

  return clamp(
    band.floor + Math.floor(progress * progressPointsAvailable) + proofBonus(contracts),
    band.floor,
    band.ceiling,
  );
}

function calculateActivityScore(input: BuilderActivityInput) {
  const transactions = input.qualifyingTransactionCount;
  const recentTransactions = input.transactionsLast30Days;
  const recentActiveDays = input.activeDaysLast30Days;
  const lastTransactionAt = safeDate(input.lastTransactionAt);
  const analyzedAt = safeDate(input.analysisTimestamp) ?? new Date();

  if (transactions === null || transactions === undefined) return null;
  if (transactions === 0) return 0;
  if (recentTransactions === null || recentTransactions === undefined || recentActiveDays === null || recentActiveDays === undefined || !lastTransactionAt) return null;

  const daysSinceLastTransaction = Math.max(0, (analyzedAt.getTime() - lastTransactionAt.getTime()) / 86_400_000);
  const recencyPoints = daysSinceLastTransaction <= 2 ? 10
    : daysSinceLastTransaction <= 7 ? 8
      : daysSinceLastTransaction <= 30 ? 5
        : daysSinceLastTransaction <= 90 ? 2
          : 0;

  return clamp(Math.round(
    scaledLog(transactions, 1_000, 30)
    + scaledLog(recentTransactions, 100, 25)
    + (clamp(recentActiveDays, 0, 20) / 20) * 35
    + recencyPoints,
  ), 0, 100);
}

export function calculateBuilderActivityRank(score: number | null, rankTotal: number) {
  if (score === null) return null;
  const safeTotal = Math.max(1, Math.floor(rankTotal));
  if (safeTotal === 1) return 1;
  const normalizedScore = clamp(score, 0, 100);
  return clamp(Math.ceil(((100 - normalizedScore) / 100) * (safeTotal - 1)) + 1, 1, safeTotal);
}

export function calculateBuilderActivity(input: BuilderActivityInput) {
  const rankTotal = Math.max(1, Math.floor(input.rankTotal));
  const level = calculateLevel(input);
  const score = calculateActivityScore(input);

  return {
    level,
    score,
    rank: calculateBuilderActivityRank(score, rankTotal),
    rankTotal,
  };
}
