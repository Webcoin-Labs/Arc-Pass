import { db, builderPassesTable } from "@workspace/db";
import { and, count, eq, isNotNull, isNull, sql } from "drizzle-orm";

/**
 * Atomically reserves one Builder onchain-mint position. Inventory claims are
 * intentionally absent from the limit calculation; only confirmed mints and
 * in-flight original-mint reservations count.
 */
export async function reserveBuilderWaveMint(passId: number, limit: number, reservationTime: Date) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(1095781715)`);
    const [{ value: mintedCount }] = await tx
      .select({ value: count() })
      .from(builderPassesTable)
      .where(and(
        eq(builderPassesTable.claimStatus, "minted"),
        eq(builderPassesTable.isRevoked, false),
      ));
    const [{ value: reservedCount }] = await tx
      .select({ value: count() })
      .from(builderPassesTable)
      .where(and(
        isNotNull(builderPassesTable.waveMintReservedAt),
        eq(builderPassesTable.isRevoked, false),
      ));
    if (mintedCount + reservedCount >= limit) return null;

    const [reserved] = await tx
      .update(builderPassesTable)
      .set({ waveMintReservedAt: reservationTime })
      .where(and(
        eq(builderPassesTable.id, passId),
        eq(builderPassesTable.claimStatus, "claimed"),
        eq(builderPassesTable.isRevoked, false),
        isNull(builderPassesTable.waveMintReservedAt),
      ))
      .returning({ id: builderPassesTable.id });
    return reserved ?? null;
  });
}

export async function releaseBuilderWaveMintReservation(passId: number, reservationTime: Date) {
  await db
    .update(builderPassesTable)
    .set({ waveMintReservedAt: null })
    .where(and(
      eq(builderPassesTable.id, passId),
      eq(builderPassesTable.waveMintReservedAt, reservationTime),
    ));
}
