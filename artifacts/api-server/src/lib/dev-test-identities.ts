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
import type { User } from "@workspace/db";

function normalizeXHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

type TestProvider = "x" | "discord";

function handlesFor(provider: TestProvider): ReadonlySet<string> {
  return provider === "x" ? configuration.devEligibleXHandles : configuration.devEligibleDiscordHandles;
}

export function isDevelopmentTestXHandle(handle: string): boolean {
  return configuration.enableDevTestIdentities && configuration.devEligibleXHandles.has(normalizeXHandle(handle));
}

export function isDevelopmentTestIdentity(provider: TestProvider, handle: string): boolean {
  return configuration.enableDevTestIdentities && handlesFor(provider).has(normalizeXHandle(handle));
}

export function isDevelopmentTestUser(user: Pick<User, "xUsername" | "discordUsername">): boolean {
  return configuration.enableDevTestIdentities && (
    (!!user.xUsername && configuration.devEligibleXHandles.has(normalizeXHandle(user.xUsername))) ||
    (!!user.discordUsername && configuration.devEligibleDiscordHandles.has(normalizeXHandle(user.discordUsername)))
  );
}

export async function seedDevelopmentTestIdentityInvites(): Promise<void> {
  if (!configuration.enableDevTestIdentities) return;

  const [founderTier] = await db
    .select()
    .from(founderTiersTable)
    .where(and(eq(founderTiersTable.name, "Emerging Founder"), eq(founderTiersTable.isActive, true)))
    .limit(1);
  if (!founderTier) throw new Error("Development test identities require seeded Founder tiers");

  for (const provider of ["x", "discord"] as const) {
    for (const handle of handlesFor(provider)) {
      const usernameColumn = provider === "x" ? usersTable.xUsername : usersTable.discordUsername;
      const [verifiedUser] = await db.select().from(usersTable).where(eq(usernameColumn, handle)).limit(1);
      if (verifiedUser) {
        await grantDevelopmentTestEntitlements(verifiedUser.id, provider, handle);
        continue;
      }

      const [existingInvite] = await db
        .select({ id: founderPassesTable.id })
        .from(founderPassesTable)
        .where(and(eq(founderPassesTable.invitePlatform, provider), eq(founderPassesTable.inviteHandle, handle)))
        .limit(1);
      if (existingInvite) continue;

      await db.insert(founderPassesTable).values({
        inviteHandle: handle,
        invitePlatform: provider,
        invitedAt: new Date(),
        variant: "premium_black",
        founderTierId: founderTier.id,
        eligibilityStatus: "eligible",
        claimStatus: "locked",
        adminNotes: `Development-only pending ${provider} test invite`,
      });
    }
  }
}

/**
 * Grants a deliberately configured local test identity claimable passes.
 * Production forbids this fixture. It never mints, skips wallet ownership,
 * or manufactures chain activity. The explicit local fixture may bypass the
 * GitHub-link prerequisite so the claim-to-mint UI can be exercised end to
 * end without a second OAuth account.
 */
export async function grantDevelopmentTestEntitlements(userId: number, provider: TestProvider, socialHandle: string): Promise<void> {
  const handle = normalizeXHandle(socialHandle);
  if (!isDevelopmentTestIdentity(provider, handle)) return;

  await db.transaction(async (tx) => {
    const [[user], [founderTier], [builderTier]] = await Promise.all([
      tx.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
      tx.select().from(founderTiersTable).where(and(eq(founderTiersTable.name, "Emerging Founder"), eq(founderTiersTable.isActive, true))).limit(1),
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
            invitePlatform: provider,
            invitedAt: founderForUser.invitedAt ?? new Date(),
            founderTierId: founderTier.id,
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
        .where(and(isNull(founderPassesTable.userId), eq(founderPassesTable.invitePlatform, provider), eq(founderPassesTable.inviteHandle, handle)))
        .limit(1);

      if (pendingInvite) {
        await tx
          .update(founderPassesTable)
          .set({
            userId,
            eligibilityStatus: "eligible",
            founderTierId: founderTier.id,
            displayName: user.displayName,
            username: handle,
            avatarUrl: user.avatarUrl,
          })
          .where(eq(founderPassesTable.id, pendingInvite.id));
      } else {
        await tx.insert(founderPassesTable).values({
          userId,
          inviteHandle: handle,
          invitePlatform: provider,
          invitedAt: new Date(),
          variant: "premium_black",
          founderTierId: founderTier.id,
          displayName: user.displayName,
          username: handle,
          avatarUrl: user.avatarUrl,
          founderTitle: "Founder",
          eligibilityStatus: "eligible",
          claimStatus: "locked",
          adminNotes: `Development-only ${provider} test entitlement`,
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

  logger.info({ userId, provider, socialHandle: handle }, "Granted development-only test entitlements");
}
