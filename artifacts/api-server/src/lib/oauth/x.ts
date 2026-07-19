import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";
import { normalizeXHandle } from "../identity";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_PROFILE_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url";

export type XOAuthErrorCode = "x" | "x_api_access" | "x_rate_limited";

export class XOAuthError extends Error {
  constructor(
    message: string,
    public readonly code: XOAuthErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "XOAuthError";
  }
}

function classifyXOAuthError(status: number): XOAuthErrorCode {
  if (status === 403) return "x_api_access";
  if (status === 429) return "x_rate_limited";
  return "x";
}

async function xOAuthResponseError(operation: "token exchange" | "profile fetch", response: Response): Promise<XOAuthError> {
  let problem: string | null = null;
  try {
    const payload = await response.json() as { type?: unknown; reason?: unknown };
    const rawProblem = typeof payload.type === "string" ? payload.type : typeof payload.reason === "string" ? payload.reason : null;
    const label = rawProblem?.split(/[\/#]/).pop() ?? null;
    if (label && /^[a-z0-9._-]{1,80}$/i.test(label)) problem = label;
  } catch {
    // X does not guarantee a JSON error body. The status remains actionable.
  }

  const problemSuffix = problem ? ` (${problem})` : "";
  return new XOAuthError(
    `X ${operation} failed: ${response.status}${problemSuffix}`,
    classifyXOAuthError(response.status),
    response.status,
  );
}

export function getXOAuthErrorCode(error: unknown): XOAuthErrorCode {
  return error instanceof XOAuthError ? error.code : "x";
}

export function isXOAuthConfigured(): boolean {
  return readProviderEnv("X") !== null;
}

/** `state` must already have been signed with the matching PKCE `codeVerifier` embedded (see provider.ts). */
export function buildXAuthorizeUrl(state: string, codeChallenge: string, options?: { posting?: boolean }): string {
  const config = readProviderEnv("X");
  if (!config) throw new Error("X OAuth is not configured");

  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", options?.posting ? "tweet.read tweet.write users.read media.write" : "tweet.read users.read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeXCodeWithAccessToken(code: string, codeVerifier: string): Promise<{ profile: OAuthProfile; accessToken: string }> {
  const config = readProviderEnv("X");
  if (!config) throw new Error("X OAuth is not configured");

  const tokenResponse = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw await xOAuthResponseError("token exchange", tokenResponse);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch(X_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw await xOAuthResponseError("profile fetch", profileResponse);
  }

  const { data } = (await profileResponse.json()) as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };

  return {
    accessToken,
    profile: {
      providerUserId: data.id,
      username: normalizeXHandle(data.username),
      displayName: data.name,
      avatarUrl: data.profile_image_url?.replace("_normal", "_400x400") ?? null,
    },
  };
}

export async function exchangeXCode(code: string, codeVerifier: string): Promise<OAuthProfile> {
  return (await exchangeXCodeWithAccessToken(code, codeVerifier)).profile;
}

export async function postImageToX(accessToken: string, params: { mediaBase64: string; mediaType: "image/png" | "image/jpeg" | "image/webp"; text: string }): Promise<string> {
  const mediaResponse = await fetch("https://api.x.com/2/media/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ media: params.mediaBase64, media_category: "tweet_image", media_type: params.mediaType, shared: false }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!mediaResponse.ok) throw new Error(`X media upload failed: ${mediaResponse.status}`);
  const mediaPayload = await mediaResponse.json() as { data?: { id?: string } };
  if (!mediaPayload.data?.id) throw new Error("X media upload did not return a media id");

  const postResponse = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: params.text, media: { media_ids: [mediaPayload.data.id] } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!postResponse.ok) throw new Error(`X post creation failed: ${postResponse.status}`);
  const postPayload = await postResponse.json() as { data?: { id?: string } };
  if (!postPayload.data?.id) throw new Error("X post creation did not return a post id");
  return postPayload.data.id;
}
