-- Shared API rate limiting uses an HMAC fingerprint as the bucket key. No raw
-- IP address or request content is stored, and the primary key keeps updates
-- atomic across multiple API workers.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_started_at_idx
  ON api_rate_limits (window_started_at);
