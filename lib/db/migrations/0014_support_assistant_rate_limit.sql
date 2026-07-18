-- Public support chat uses a hashed network fingerprint and a rolling
-- response window. No raw IP address or conversation content is stored.
CREATE TABLE IF NOT EXISTS support_assistant_usage (
  visitor_key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  response_count integer NOT NULL DEFAULT 0 CHECK (response_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
