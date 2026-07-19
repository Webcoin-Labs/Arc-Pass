import { db, founderPassesTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";

/**
 * Single-flight lock for one Founder Pass mint attempt. Founder Pass has no
 * supply cap (unlike Builder's Wave allocation) — this only prevents a
 * double-click or retried request from triggering two real onchain mints for
 * the same pass while one is already in flight.
 */
export async function reserveFounderMint(passId: number, reservationTime: Date) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(2148037612)`);
    const [reserved] = await tx
      .update(founderPassesTable)
      .set({ mintReservedAt: reservationTime })
      .where(and(
        eq(founderPassesTable.id, passId),
        eq(founderPassesTable.claimStatus, "claimed"),
        isNull(founderPassesTable.mintReservedAt),
      ))
      .returning({ id: founderPassesTable.id });
    return reserved ?? null;
  });
}

export async function releaseFounderMintReservation(passId: number, reservationTime: Date) {
  await db
    .update(founderPassesTable)
    .set({ mintReservedAt: null })
    .where(and(
      eq(founderPassesTable.id, passId),
      eq(founderPassesTable.mintReservedAt, reservationTime),
    ));
}
