import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";

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

  const profile = (await profileResponse.json()) as { id: string; username: string; global_name?: string; avatar?: string };

  return {
    accessToken,
    profile: {
      providerUserId: profile.id,
      username: profile.username,
      displayName: profile.global_name ?? profile.username,
      avatarUrl: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256` : null,
    },
  };
}

/**
 * Checks membership in the configured Arc Discord server, when
 * ARC_DISCORD_GUILD_ID is set and the `guilds.members.read` scope was
 * granted. Best-effort — returns null (unknown) rather than throwing if the
 * bot/permissions aren't configured, since this is a supporting signal, not
 * an eligibility gate on its own.
 */
export async function checkArcGuildMembership(accessToken: string): Promise<boolean | null> {
  const guildId = process.env.ARC_DISCORD_GUILD_ID;
  if (!guildId) return null;

  const response = await fetch(`https://discord.com/api/users/@me/guilds/${guildId}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) return false;
  if (!response.ok) return null;
  return true;
}
