import { Router, type IRouter, type Response } from "express";
import { db, usersTable, xShareDraftsTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import { getUserFromSession, createSession, deleteSession, linkPendingFounderInvite } from "../lib/auth";
import { logger } from "../lib/logger";
import { signOAuthState, verifyOAuthState, createPkcePair } from "../lib/oauth/provider";
import { isXOAuthConfigured, buildXAuthorizeUrl, exchangeXCode, exchangeXCodeWithAccessToken, getXOAuthErrorCode, postImageToX } from "../lib/oauth/x";
import { isDiscordOAuthConfigured, buildDiscordAuthorizeUrl, exchangeDiscordCode, getArcGuildMembership, type ArcGuildMembershipSnapshot } from "../lib/oauth/discord";
import { isGithubOAuthConfigured, buildGithubAuthorizeUrl, exchangeGithubCodeWithContributions } from "../lib/oauth/github";
import type { OAuthIntent, OAuthProfile } from "../lib/oauth/types";
import { configuration } from "../lib/env";
import { grantDevelopmentTestEntitlements } from "../lib/dev-test-identities";
import { normalizeXHandle, parseDiscordIdentity } from "../lib/identity";
import {
  appendReturnToQuery,
  expectedIdentityMatches,
  normalizeExpectedIdentity,
  sanitizeReturnTo,
  type ExpectedOAuthProvider,
} from "../lib/oauth/routing";

const router: IRouter = Router();

function frontendUrl(path = "/"): string {
  const base = process.env.FRONTEND_URL || "/";
  return `${base.replace(/\/$/, "")}${path}`;
}

function safeReturnTo(req: import("express").Request): string {
  return sanitizeReturnTo(req.query.returnTo);
}

function expectedIdentity(req: import("express").Request, provider: ExpectedOAuthProvider) {
  return normalizeExpectedIdentity(provider, req.query.expectedUsername, req.query.expectedDiscriminator);
}

function oauthErrorUrl(returnTo: string, error: string): string {
  return frontendUrl(appendReturnToQuery(returnTo, "authError", error));
}

type Provider = "x" | "discord" | "github";

function discordMembershipPatch(membership: ArcGuildMembershipSnapshot | undefined) {
  if (!membership) return {};
  if (membership.member === null) return { discordArcMembershipCheckedAt: new Date() };
  return {
    discordArcMember: membership.member,
    discordArcJoinedAt: membership.joinedAt ? new Date(membership.joinedAt) : null,
    discordArcMembershipCheckedAt: new Date(),
  };
}

function githubContributionPatch(contributionCount: number | null | undefined, accountCreatedAt?: Date, contributionWindowStartedAt?: Date) {
  if (contributionCount === undefined) return {};
  return {
    githubContributionCount: contributionCount,
    githubContributionsUpdatedAt: new Date(),
    ...(accountCreatedAt ? { githubAccountCreatedAt: accountCreatedAt } : {}),
    ...(contributionWindowStartedAt ? { githubContributionWindowStartedAt: contributionWindowStartedAt } : {}),
  };
}

/**
 * Applies a resolved OAuth profile: links it to the current session (link
 * intent) or finds/creates an identity and signs the caller in (login
 * intent). GitHub never logs a user in on its own — the route layer only
 * ever calls this in "link" mode for GitHub, enforced below.
 */
async function completeOAuth(params: {
  provider: Provider;
  profile: OAuthProfile;
  intent: OAuthIntent;
  linkUserId: number | null;
  currentUserId: number | null;
  res: Response;
  discordMembership?: ArcGuildMembershipSnapshot;
  githubContributionCount?: number | null;
  githubAccountCreatedAt?: Date;
  githubContributionWindowStartedAt?: Date;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { provider, profile, intent, linkUserId, currentUserId, res, discordMembership, githubContributionCount, githubAccountCreatedAt, githubContributionWindowStartedAt } = params;

  if (intent === "share") return { ok: false, error: "invalid_oauth_intent" };

  if (intent === "link") {
    if (!linkUserId || linkUserId !== currentUserId) {
      return { ok: false, error: "session_mismatch" };
    }

    const stableIdColumn = provider === "x" ? usersTable.xUserId : provider === "discord" ? usersTable.discordUserId : usersTable.githubUserId;
    const [conflict] = await db.select().from(usersTable).where(eq(stableIdColumn, profile.providerUserId));
    if (conflict && conflict.id !== linkUserId) {
      return { ok: false, error: `${provider}_already_linked` };
    }

    const normalizedProfile = provider === "x"
      ? { username: normalizeXHandle(profile.username), discriminator: null }
      : provider === "discord"
        ? parseDiscordIdentity(profile.username, profile.discriminator)
        : { username: profile.username.trim().toLowerCase(), discriminator: null };
    const patch =
      provider === "x"
          ? { xUserId: profile.providerUserId, xUsername: normalizedProfile.username, ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}) }
        : provider === "discord"
          ? { discordUserId: profile.providerUserId, discordUsername: normalizedProfile.username, discordDiscriminator: normalizedProfile.discriminator, discordAvatarUrl: profile.avatarUrl, ...discordMembershipPatch(discordMembership) }
          : { githubUserId: profile.providerUserId, githubUsername: normalizedProfile.username, ...githubContributionPatch(githubContributionCount, githubAccountCreatedAt, githubContributionWindowStartedAt) };

    await db.update(usersTable).set(patch).where(eq(usersTable.id, linkUserId));
    if (provider !== "github") {
      await linkPendingFounderInvite(linkUserId, provider, normalizedProfile.username, normalizedProfile.discriminator);
      await grantDevelopmentTestEntitlements(linkUserId, provider, profile.username);
    }
    return { ok: true };
  }

  // login intent — X and Discord only; GitHub is never a login method (routes
  // above only ever call this branch with provider !== "github").
  if (provider === "github") {
    return { ok: false, error: "github_login_not_supported" };
  }

  const normalizedProfile = provider === "x"
    ? { username: normalizeXHandle(profile.username), discriminator: null }
    : parseDiscordIdentity(profile.username, profile.discriminator);
  const stableIdColumn = provider === "x" ? usersTable.xUserId : usersTable.discordUserId;
  const [existing] = await db.select().from(usersTable).where(eq(stableIdColumn, profile.providerUserId));

  let userId: number;
  if (existing) {
    userId = existing.id;
    const profilePatch =
      provider === "x"
        ? { username: normalizedProfile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, xUsername: normalizedProfile.username }
         : { username: normalizedProfile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, discordUsername: normalizedProfile.username, discordDiscriminator: normalizedProfile.discriminator, discordAvatarUrl: profile.avatarUrl, ...discordMembershipPatch(discordMembership) };
    await db.update(usersTable).set(profilePatch).where(eq(usersTable.id, userId));
  } else {
    const [created] = await db
      .insert(usersTable)
      .values({
        username: normalizedProfile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        provider,
        providerId: profile.providerUserId,
        ...(provider === "x"
          ? { xUserId: profile.providerUserId, xUsername: normalizedProfile.username }
          : { discordUserId: profile.providerUserId, discordUsername: normalizedProfile.username, discordDiscriminator: normalizedProfile.discriminator, discordAvatarUrl: profile.avatarUrl, ...discordMembershipPatch(discordMembership) }),
      })
      .returning();
    userId = created.id;
  }

  await linkPendingFounderInvite(userId, provider, normalizedProfile.username, normalizedProfile.discriminator);
  await grantDevelopmentTestEntitlements(userId, provider, profile.username);

  await createSession(userId, res);
  return { ok: true };
}

// ---- Mock fallback (used only when the provider's env vars aren't configured) ----

async function mockOAuth(provider: Provider, req: import("express").Request, res: Response): Promise<void> {
  const currentUser = await getUserFromSession(req);
  const intent: "login" | "link" = currentUser ? "link" : "login";

  if (provider === "github" && intent === "login") {
    res.redirect(frontendUrl("/?authError=login_required_before_github"));
    return;
  }

  const demoProfile: OAuthProfile = {
    providerUserId: `${provider}_demo_001`,
    username: provider === "x" ? "demo_founder" : provider === "discord" ? "demo_builder" : "demo_builder_gh",
    displayName: provider === "x" ? "Demo Founder" : provider === "discord" ? "Demo Builder" : "Demo Builder",
    avatarUrl: null,
  };

  const result = await completeOAuth({
    provider,
    profile: demoProfile,
    intent,
    linkUserId: currentUser?.id ?? null,
    currentUserId: currentUser?.id ?? null,
    res,
  });

  if (!result.ok) {
    logger.warn({ error: result.error }, "Mock OAuth link failed");
    res.redirect(frontendUrl(`/?authError=${result.error}`));
    return;
  }

  res.redirect(frontendUrl(safeReturnTo(req)));
}

// ---- X ----

router.get("/auth/dev-test/:provider", async (req, res): Promise<void> => {
  if (configuration.isProduction || !configuration.enableDevTestIdentities) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const provider = req.params.provider;
  if (provider !== "x" && provider !== "discord") {
    res.status(404).json({ error: "Test identity is not configured" });
    return;
  }
  const testHandles = provider === "x" ? configuration.devEligibleXHandles : configuration.devEligibleDiscordHandles;
  if (!testHandles.has("test")) { res.status(404).json({ error: "Test identity is not configured" }); return; }

  try {
    const result = await completeOAuth({
      provider,
      profile: {
        providerUserId: `development_${provider}_test`,
        username: "test",
        displayName: provider === "x" ? "Test X User" : "Test Discord User",
        avatarUrl: null,
      },
      intent: "login",
      linkUserId: null,
      currentUserId: null,
      res,
    });
    if (!result.ok) throw new Error(result.error);
    res.redirect(frontendUrl(safeReturnTo(req)));
  } catch (err) {
    req.log.error({ err, provider }, "Development test sign-in failed");
    res.redirect(frontendUrl("/?authError=test_identity"));
  }
});

router.get("/auth/x", async (req, res): Promise<void> => {
  const returnTo = safeReturnTo(req);
  try {
    const currentUser = await getUserFromSession(req);

    if (!isXOAuthConfigured() && configuration.enableDevMocks) {
      await mockOAuth("x", req, res);
      return;
    }
    if (!isXOAuthConfigured()) { res.redirect(oauthErrorUrl(returnTo, "x_unavailable")); return; }

    const { verifier, challenge } = createPkcePair();
    const state = await signOAuthState({
      intent: currentUser ? "link" : "login",
      linkUserId: currentUser?.id,
      returnTo,
      codeVerifier: verifier,
      expectedIdentity: expectedIdentity(req, "x"),
    });
    res.redirect(buildXAuthorizeUrl(state, challenge));
  } catch (err) {
    req.log.error({ err }, "X OAuth redirect error");
    res.redirect(oauthErrorUrl(returnTo, "x"));
  }
});

router.get("/auth/x/callback", async (req, res): Promise<void> => {
  let shareReturnTo: string | null = null;
  let shareDraftId: string | null = null;
  let callbackReturnTo: string | null = null;
  try {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    if (!code || !stateParam) throw new Error("Missing code or state");

    const oauthState = await verifyOAuthState(stateParam);
    callbackReturnTo = oauthState.returnTo;
    if (oauthState.intent === "share") {
      shareReturnTo = oauthState.returnTo;
      shareDraftId = oauthState.shareDraftId ?? null;
      const currentUser = await getUserFromSession(req, res);
      if (!currentUser || !oauthState.linkUserId || currentUser.id !== oauthState.linkUserId || !shareDraftId) throw new Error("X share session mismatch");
      const [draft] = await db.select().from(xShareDraftsTable).where(and(eq(xShareDraftsTable.id, shareDraftId), eq(xShareDraftsTable.userId, currentUser.id), gt(xShareDraftsTable.expiresAt, new Date()))).limit(1);
      if (!draft) throw new Error("X share draft expired");
      const { profile, accessToken } = await exchangeXCodeWithAccessToken(code, oauthState.codeVerifier ?? "");
      if (!currentUser.xUserId || profile.providerUserId !== currentUser.xUserId) throw new Error("Authorize the X account linked to this Arc Pass identity");
      await postImageToX(accessToken, { mediaBase64: draft.mediaBase64, mediaType: draft.mediaType as "image/png" | "image/jpeg" | "image/webp", text: draft.postText });
      await db.delete(xShareDraftsTable).where(eq(xShareDraftsTable.id, draft.id));
      const separator = draft.returnTo.includes("?") ? "&" : "?";
      res.redirect(frontendUrl(`${draft.returnTo}${separator}shareSuccess=x`));
      return;
    }
    const profile = await exchangeXCode(code, oauthState.codeVerifier ?? "");
    if (!expectedIdentityMatches(oauthState.expectedIdentity, profile)) {
      res.redirect(oauthErrorUrl(oauthState.returnTo, "identity_mismatch"));
      return;
    }
    const currentUser = await getUserFromSession(req);

    const result = await completeOAuth({
      provider: "x",
      profile,
      intent: oauthState.intent,
      linkUserId: oauthState.linkUserId ?? null,
      currentUserId: currentUser?.id ?? null,
      res,
    });

    if (!result.ok) {
      res.redirect(oauthErrorUrl(oauthState.returnTo, result.error));
      return;
    }
    res.redirect(frontendUrl(oauthState.returnTo));
  } catch (err) {
    req.log.error({ err }, "X OAuth callback error");
    if (shareDraftId) await db.delete(xShareDraftsTable).where(eq(xShareDraftsTable.id, shareDraftId)).catch(() => undefined);
    if (shareReturnTo) {
      const separator = shareReturnTo.includes("?") ? "&" : "?";
      res.redirect(frontendUrl(`${shareReturnTo}${separator}shareError=x_posting`));
      return;
    }
    const authError = getXOAuthErrorCode(err);
    res.redirect(callbackReturnTo ? oauthErrorUrl(callbackReturnTo, authError) : frontendUrl(`/?authError=${authError}`));
  }
});

// ---- Discord ----

router.get("/auth/discord", async (req, res): Promise<void> => {
  const returnTo = safeReturnTo(req);
  try {
    const currentUser = await getUserFromSession(req);

    if (!isDiscordOAuthConfigured() && configuration.enableDevMocks) {
      await mockOAuth("discord", req, res);
      return;
    }
    if (!isDiscordOAuthConfigured()) { res.redirect(oauthErrorUrl(returnTo, "discord_unavailable")); return; }

    const state = await signOAuthState({
      intent: currentUser ? "link" : "login",
      linkUserId: currentUser?.id,
      returnTo,
      expectedIdentity: expectedIdentity(req, "discord"),
    });
    res.redirect(buildDiscordAuthorizeUrl(state));
  } catch (err) {
    req.log.error({ err }, "Discord OAuth redirect error");
    res.redirect(oauthErrorUrl(returnTo, "discord"));
  }
});

router.get("/auth/discord/callback", async (req, res): Promise<void> => {
  let callbackReturnTo: string | null = null;
  try {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    if (!code || !stateParam) throw new Error("Missing code or state");

    const oauthState = await verifyOAuthState(stateParam);
    callbackReturnTo = oauthState.returnTo;
    const { profile, accessToken } = await exchangeDiscordCode(code);
    if (!expectedIdentityMatches(oauthState.expectedIdentity, profile)) {
      res.redirect(oauthErrorUrl(oauthState.returnTo, "identity_mismatch"));
      return;
    }
    const discordMembership = await getArcGuildMembership(accessToken);
    const currentUser = await getUserFromSession(req);

    const result = await completeOAuth({
      provider: "discord",
      profile,
      intent: oauthState.intent,
      linkUserId: oauthState.linkUserId ?? null,
      currentUserId: currentUser?.id ?? null,
      res,
      discordMembership,
    });

    if (!result.ok) {
      res.redirect(oauthErrorUrl(oauthState.returnTo, result.error));
      return;
    }
    res.redirect(frontendUrl(oauthState.returnTo));
  } catch (err) {
    req.log.error({ err }, "Discord OAuth callback error");
    res.redirect(callbackReturnTo ? oauthErrorUrl(callbackReturnTo, "discord") : frontendUrl("/?authError=discord"));
  }
});

// ---- GitHub (link-only — never a login method) ----

router.get("/auth/github", async (req, res): Promise<void> => {
  const returnTo = safeReturnTo(req);
  try {
    const currentUser = await getUserFromSession(req);
    if (!currentUser) {
      res.redirect(oauthErrorUrl(returnTo, "login_required_before_github"));
      return;
    }

    if (!isGithubOAuthConfigured() && configuration.enableDevMocks) {
      await mockOAuth("github", req, res);
      return;
    }
    if (!isGithubOAuthConfigured()) { res.redirect(oauthErrorUrl(returnTo, "github_unavailable")); return; }

    const { verifier, challenge } = createPkcePair();
    const state = await signOAuthState({ intent: "link", linkUserId: currentUser.id, returnTo, codeVerifier: verifier });
    res.redirect(buildGithubAuthorizeUrl(state, challenge));
  } catch (err) {
    req.log.error({ err }, "GitHub OAuth redirect error");
    res.redirect(oauthErrorUrl(returnTo, "github"));
  }
});

router.get("/auth/github/callback", async (req, res): Promise<void> => {
  let callbackReturnTo: string | null = null;
  try {
    const code = req.query.code as string | undefined;
    const stateParam = req.query.state as string | undefined;
    if (!code || !stateParam) throw new Error("Missing code or state");

    const oauthState = await verifyOAuthState(stateParam);
    callbackReturnTo = oauthState.returnTo;
    const { profile, contributionCount, accountCreatedAt, contributionWindowStartedAt } = await exchangeGithubCodeWithContributions(code, oauthState.codeVerifier ?? "");
    const currentUser = await getUserFromSession(req);

    const result = await completeOAuth({
      provider: "github",
      profile,
      intent: "link",
      linkUserId: oauthState.linkUserId ?? null,
      currentUserId: currentUser?.id ?? null,
      res,
      githubContributionCount: contributionCount,
      githubAccountCreatedAt: accountCreatedAt,
      githubContributionWindowStartedAt: contributionWindowStartedAt,
    });

    if (!result.ok) {
      res.redirect(oauthErrorUrl(oauthState.returnTo, result.error));
      return;
    }
    res.redirect(frontendUrl(oauthState.returnTo));
  } catch (err) {
    req.log.error({ err }, "GitHub OAuth callback error");
    res.redirect(callbackReturnTo ? oauthErrorUrl(callbackReturnTo, "github") : frontendUrl("/?authError=github"));
  }
});

// ---- Session ----

router.get("/auth/me", async (req, res): Promise<void> => {
  try {
    const user = await getUserFromSession(req, res);
    if (!user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      providerId: user.providerId,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Get me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  try {
    const sessionToken = req.cookies?.["arc_session"] as string | undefined;
    if (sessionToken) {
      await deleteSession(sessionToken);
    }
    res.clearCookie("arc_session", { path: "/" });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Logout error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
