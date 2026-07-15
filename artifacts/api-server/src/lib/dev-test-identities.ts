import {
  db,
  builderPassesTable,
  builderTiersTable,
  founderPassesTable,
  founderTiersTable,
  usersTable,
} from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { configuration } from "./env";
import { logger } from "./logger";

function normalizeXHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export function isDevelopmentTestXHandle(handle: string): boolean {
  return configuration.enableDevTestIdentities && configuration.devEligibleXHandles.has(normalizeXHandle(handle));
}

export async function seedDevelopmentTestIdentityInvites(): Promise<void> {
  if (!configuration.enableDevTestIdentities) return;

  const [founderTier] = await db
    .select()
    .from(founderTiersTable)
    .where(and(eq(founderTiersTable.name, "Verified Founder"), eq(founderTiersTable.isActive, true)))
    .limit(1);
  if (!founderTier) throw new Error("Development test identities require seeded Founder tiers");

  for (const handle of configuration.devEligibleXHandles) {
    const [verifiedUser] = await db.select().from(usersTable).where(eq(usersTable.xUsername, handle)).limit(1);
    if (verifiedUser) {
      await grantDevelopmentTestEntitlements(verifiedUser.id, handle);
      continue;
    }

    const [existingInvite] = await db
      .select({ id: founderPassesTable.id })
      .from(founderPassesTable)
      .where(and(eq(founderPassesTable.invitePlatform, "x"), eq(founderPassesTable.inviteHandle, handle)))
      .limit(1);
    if (existingInvite) continue;

    await db.insert(founderPassesTable).values({
      inviteHandle: handle,
      invitePlatform: "x",
      invitedAt: new Date(),
      variant: "premium_black",
      founderTierId: founderTier.id,
      eligibilityStatus: "eligible",
      claimStatus: "locked",
      adminNotes: "Development-only pending X OAuth test invite",
    });
  }
}

/**
 * Grants a deliberately configured local test identity claimable passes only
 * after X has returned a verified OAuth profile. It never creates an identity,
 * skips wallet ownership checks, mints, or manufactures chain activity.
 */
export async function grantDevelopmentTestEntitlements(userId: number, xHandle: string): Promise<void> {
  const handle = normalizeXHandle(xHandle);
  if (!isDevelopmentTestXHandle(handle)) return;

  await db.transaction(async (tx) => {
    const [[user], [founderTier], [builderTier]] = await Promise.all([
      tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
      tx.select().from(founderTiersTable).where(and(eq(founderTiersTable.name, "Verified Founder"), eq(founderTiersTable.isActive, true))).limit(1),
      tx.select().from(builderTiersTable).where(and(eq(builderTiersTable.slug, "gold"), eq(builderTiersTable.isActive, true))).limit(1),
    ]);

    if (!user || !founderTier || !builderTier) {
      throw new Error("Development test identity requires seeded Founder and Builder tiers");
    }

    const [founderForUser] = await tx.select().from(founderPassesTable).where(eq(founderPassesTable.userId, userId)).limit(1);
    if (founderForUser) {
      if (!founderForUser.permanentlyLockedAt && !founderForUser.revokedAt) {
        await tx
          .update(founderPassesTable)
          .set({
            eligibilityStatus: "eligible",
            inviteHandle: handle,
            invitePlatform: "x",
            invitedAt: founderForUser.invitedAt ?? new Date(),
            founderTierId: founderForUser.founderTierId ?? founderTier.id,
            displayName: user.displayName,
            username: handle,
            avatarUrl: user.avatarUrl,
          })
          .where(eq(founderPassesTable.id, founderForUser.id));
      }
    } else {
      const [pendingInvite] = await tx
        .select()
        .from(founderPassesTable)
        .where(and(isNull(founderPassesTable.userId), eq(founderPassesTable.invitePlatform, "x"), eq(founderPassesTable.inviteHandle, handle)))
        .limit(1);

      if (pendingInvite) {
        await tx
          .update(founderPassesTable)
          .set({
            userId,
            eligibilityStatus: "eligible",
            founderTierId: pendingInvite.founderTierId ?? founderTier.id,
            displayName: user.displayName,
            username: handle,
            avatarUrl: user.avatarUrl,
          })
          .where(eq(founderPassesTable.id, pendingInvite.id));
      } else {
        await tx.insert(founderPassesTable).values({
          userId,
          inviteHandle: handle,
          invitePlatform: "x",
          invitedAt: new Date(),
          variant: "premium_black",
          founderTierId: founderTier.id,
          displayName: user.displayName,
          username: handle,
          avatarUrl: user.avatarUrl,
          founderTitle: "Founder",
          eligibilityStatus: "eligible",
          claimStatus: "locked",
          adminNotes: "Development-only X OAuth test entitlement",
        });
      }
    }

    const [builderPass] = await tx.select().from(builderPassesTable).where(eq(builderPassesTable.userId, userId)).limit(1);
    if (builderPass) {
      if (!builderPass.isRevoked && builderPass.claimStatus === "locked") {
        await tx
          .update(builderPassesTable)
          .set({
            currentTierId: builderTier.id,
            eligibilityStatus: "eligible",
            builderRole: builderPass.builderRole ?? "Onchain Builder",
            primaryEcosystem: builderPass.primaryEcosystem ?? "Arc",
            lastVerifiedAt: new Date(),
          })
          .where(eq(builderPassesTable.id, builderPass.id));
      }
    } else {
      await tx.insert(builderPassesTable).values({
        userId,
        currentTierId: builderTier.id,
        builderRole: "Onchain Builder",
        primaryEcosystem: "Arc",
        eligibilityStatus: "eligible",
        claimStatus: "locked",
        lastVerifiedAt: new Date(),
      });
    }
  });

  logger.info({ userId, xHandle: handle }, "Granted development-only test entitlements after verified X OAuth");
}
