export interface OAuthProfile {
  providerUserId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** Legacy Discord discriminator. Modern Discord accounts return null/"0". */
  discriminator?: string | null;
}

export type OAuthIntent = "login" | "link" | "share";

export interface OAuthState {
  intent: OAuthIntent;
  /** The authenticated user id at redirect-start time, required when intent === "link". */
  linkUserId?: number;
  /** Where the browser should land after the callback completes. */
  returnTo: string;
  /** Random per-flow value; not separately checked but keeps the JWT unguessable/unique. */
  nonce: string;
  /** PKCE code_verifier restored from the consumed server-side OAuth-state row. */
  codeVerifier?: string;
  /** One-shot X media draft; present only for explicit share authorization. */
  shareDraftId?: string;
  /** Optional public lookup identity that the verified OAuth account must match. */
  expectedIdentity?: {
    provider: "x" | "discord";
    username: string;
    discriminator: string | null;
  };
}
