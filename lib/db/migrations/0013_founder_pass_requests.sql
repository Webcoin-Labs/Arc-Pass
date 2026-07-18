-- The in-product Founder Pass request is intentionally minimal: a normalized
-- X handle, an application note, and a non-reversible IP fingerprint used only
-- for rate limiting. Existing legacy imports keep their data unchanged.
ALTER TABLE founder_applications
  ALTER COLUMN full_name DROP NOT NULL;

ALTER TABLE founder_applications
  ADD COLUMN IF NOT EXISTS request_x_username text,
  ADD COLUMN IF NOT EXISTS request_ip_hash text;

ALTER TABLE founder_applications
  ADD CONSTRAINT founder_applications_request_x_username_unique UNIQUE (request_x_username);

CREATE INDEX IF NOT EXISTS founder_applications_request_ip_submitted_at_idx
  ON founder_applications (request_ip_hash, submitted_at DESC);
