import test from "node:test";
import assert from "node:assert/strict";
import { calculateBuilderActivity, calculateBuilderActivityRank } from "./builder-activity-score";

const analyzedAt = "2026-07-20T00:00:00.000Z";

function activity(overrides: Record<string, unknown>) {
  return calculateBuilderActivity({
    tierName: "Bronze",
    qualifyingTransactionCount: 2,
    validContractCount: 0,
    githubContributionCount: 0,
    transactionsLast30Days: 2,
    activeDaysLast30Days: 2,
    lastTransactionAt: "2026-07-19T00:00:00.000Z",
    analysisTimestamp: analyzedAt,
    rankTotal: 2_499,
    ...overrides,
  });
}

test("builder level stays inside the long-term credential tier band", () => {
  assert.equal(activity({ tierName: "Bronze", qualifyingTransactionCount: 2 }).level, 10);
  assert.equal(activity({ tierName: "Silver", qualifyingTransactionCount: 10 }).level, 30);
  assert.equal(activity({ tierName: "Gold", qualifyingTransactionCount: 50 }).level, 50);
  assert.equal(activity({ tierName: "Platinum", qualifyingTransactionCount: 100 }).level, 70);
  assert.equal(activity({ tierName: "Diamond", qualifyingTransactionCount: 1_000 }).level, 90);
  assert.equal(activity({ tierName: "Diamond", qualifyingTransactionCount: 20_000, validContractCount: 20, githubContributionCount: 500 }).level, 100);
});

test("activity score rewards recent Arc transaction frequency independently from level", () => {
  const frequent = activity({
    tierName: "Diamond",
    qualifyingTransactionCount: 1_000,
    transactionsLast30Days: 100,
    activeDaysLast30Days: 20,
  });
  const dormant = activity({
    tierName: "Diamond",
    qualifyingTransactionCount: 1_000,
    transactionsLast30Days: 1,
    activeDaysLast30Days: 1,
    lastTransactionAt: "2026-05-20T00:00:00.000Z",
  });

  assert.equal(frequent.level, dormant.level);
  assert.equal(frequent.score, 100);
  assert.ok(dormant.score! < frequent.score!);
});

test("legacy snapshots do not invent a frequency score", () => {
  const result = activity({ transactionsLast30Days: null, activeDaysLast30Days: null, lastTransactionAt: null });
  assert.equal(result.level, 10);
  assert.equal(result.score, null);
  assert.equal(result.rank, null);
});

test("activity rank is monotonic across the 2,499-pass cohort", () => {
  assert.equal(calculateBuilderActivityRank(100, 2_499), 1);
  assert.equal(calculateBuilderActivityRank(0, 2_499), 2_499);
  assert.ok(calculateBuilderActivityRank(90, 2_499)! < calculateBuilderActivityRank(50, 2_499)!);
});
