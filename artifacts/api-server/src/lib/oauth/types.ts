export interface OAuthProfile {
  providerUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export type OAuthIntent = "login" | "link";

export interface OAuthState {
  intent: OAuthIntent;
  /** The authenticated user id at redirect-start time, required when intent === "link". */
  linkUserId?: number;
  /** Where the browser should land after the callback completes. */
  returnTo: string;
  /** Random per-flow value; not separately checked but keeps the JWT unguessable/unique. */
  nonce: string;
  /** PKCE code_verifier, round-tripped through the signed state (X requires PKCE). */
  codeVerifier?: string;
}
