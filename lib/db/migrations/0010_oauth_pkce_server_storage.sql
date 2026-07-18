-- PKCE verifiers are confidential and must not be embedded in the
-- browser/provider-visible signed state parameter.
ALTER TABLE oauth_states
  ADD COLUMN IF NOT EXISTS code_verifier text;
