-- Direct X media sharing is an explicit, one-shot OAuth flow. Draft media is
-- kept only long enough to survive the provider redirect and is deleted after
-- posting (or by expiry cleanup on the next request).
CREATE TABLE IF NOT EXISTS x_share_drafts (
  id text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pass_type text NOT NULL CHECK (pass_type IN ('founder', 'builder')),
  pass_id integer NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image/png', 'image/jpeg', 'image/webp')),
  media_base64 text NOT NULL,
  post_text text NOT NULL,
  return_to text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS x_share_drafts_expiry_idx ON x_share_drafts (expires_at);
