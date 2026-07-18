import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";
import { normalizeDiscordDiscriminator, parseDiscordIdentity } from "../identity";

export function isDiscordOAuthConfigured(): boolean {
  return readProviderEnv("DISCORD") !== null;
}

export function buildDiscordAuthorizeUrl(state: string): string {
  const config = readProviderEnv("DISCORD");
  if (!config) throw new Error("Discord OAuth is not configured");

  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  // Needed for the current-user guild-member endpoint. Membership is a
  // supporting signal only and never grants eligibility by itself.
  url.searchParams.set("scope", "identify guilds.members.read");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeDiscordCode(code: string): Promise<{ profile: OAuthProfile; accessToken: string }> {
  const config = readProviderEnv("DISCORD");
  if (!config) throw new Error("Discord OAuth is not configured");

  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord token exchange failed: ${tokenResponse.status}`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`Discord profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as { id: string; username: string; discriminator?: string; global_name?: string; avatar?: string };
  const identity = parseDiscordIdentity(profile.username, normalizeDiscordDiscriminator(profile.discriminator));

  return {
    accessToken,
    profile: {
      providerUserId: profile.id,
      username: identity.username,
      discriminator: identity.discriminator,
      displayName: profile.global_name ?? profile.username,
      avatarUrl: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256` : null,
    },
  };
}

export interface ArcGuildMembershipSnapshot {
  member: boolean | null;
  joinedAt: string | null;
}

/**
 * Reads the current user's membership in the configured Arc guild via the
 * OAuth `guilds.members.read` scope. This is intentionally best-effort: a
 * provider outage or missing scope yields `member: null`, not a false
 * membership claim.
 */
export async function getArcGuildMembership(accessToken: string): Promise<ArcGuildMembershipSnapshot> {
  const guildId = process.env.ARC_DISCORD_GUILD_ID;
  if (!guildId) return { member: null, joinedAt: null };

  let response: Response;
  try {
    response = await fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { member: null, joinedAt: null };
  }

  if (response.status === 404) return { member: false, joinedAt: null };
  if (!response.ok) return { member: null, joinedAt: null };

  const member = (await response.json()) as { joined_at?: string };
  return { member: true, joinedAt: member.joined_at ?? null };
}

/** Backwards-compatible boolean helper for callers that only need status. */
export async function checkArcGuildMembership(accessToken: string): Promise<boolean | null> {
  return (await getArcGuildMembership(accessToken)).member;
}
