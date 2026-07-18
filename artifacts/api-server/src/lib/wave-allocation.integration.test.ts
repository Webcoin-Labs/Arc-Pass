import test from "node:test";
import assert from "node:assert/strict";

const integrationEnabled = process.env.ARC_PASS_DB_INTEGRATION === "true"
  && Boolean(process.env.DEV_DATABASE_URL || process.env.DATABASE_URL);

test("concurrent final-slot reservations cannot exceed the Builder Wave limit", { skip: !integrationEnabled }, async () => {
  const [{ db, pool, usersTable, builderPassesTable }, { and, count, eq, inArray, isNotNull }, allocation] = await Promise.all([
    import("@workspace/db"),
    import("drizzle-orm"),
    import("./wave-allocation"),
  ]);

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const providerIds = [
    `wave-concurrency-a-${suffix}`,
    `wave-concurrency-b-${suffix}`,
    `wave-revoked-${suffix}`,
  ];
  let userIds: number[] = [];

  try {
    const users = await db.insert(usersTable).values(providerIds.map((providerId, index) => ({
      username: `wave-audit-${index}-${suffix}`,
      displayName: `Wave allocation audit ${index}`,
      provider: "x",
      providerId,
    }))).returning({ id: usersTable.id });
    userIds = users.map((user) => user.id);

    const passes = await db.insert(builderPassesTable).values(userIds.map((userId, index) => ({
      userId,
      eligibilityStatus: "eligible",
      claimStatus: index === 2 ? "minted" : "claimed",
      isRevoked: index === 2,
    }))).returning({ id: builderPassesTable.id });

    const [{ value: mintedCount }] = await db.select({ value: count() }).from(builderPassesTable).where(and(
      eq(builderPassesTable.claimStatus, "minted"),
      eq(builderPassesTable.isRevoked, false),
    ));
    const [{ value: reservedCount }] = await db.select({ value: count() }).from(builderPassesTable).where(and(
      isNotNull(builderPassesTable.waveMintReservedAt),
      eq(builderPassesTable.isRevoked, false),
    ));
    const finalSlotLimit = mintedCount + reservedCount + 1;

    // The third fixture is a revoked historical mint. It must not consume the
    // final active Wave slot, while the two claimed passes still race for it.
    const attempts = await Promise.all(passes.slice(0, 2).map((pass, index) =>
      allocation.reserveBuilderWaveMint(pass.id, finalSlotLimit, new Date(Date.now() + index)),
    ));
    assert.equal(attempts.filter(Boolean).length, 1);

    const [{ value: testReservations }] = await db
      .select({ value: count() })
      .from(builderPassesTable)
      .where(and(inArray(builderPassesTable.userId, userIds), isNotNull(builderPassesTable.waveMintReservedAt)));
    assert.equal(testReservations, 1);
  } finally {
    if (userIds.length > 0) {
      await db.delete(builderPassesTable).where(inArray(builderPassesTable.userId, userIds));
      await db.delete(usersTable).where(inArray(usersTable.id, userIds));
    }
    await pool.end();
  }
});
