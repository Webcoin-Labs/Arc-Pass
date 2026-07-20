-- New in-product email fields for Founder Pass notifications, distinct from
-- the legacy Typeform-import work_email/personal_email columns on
-- founder_applications (never populated by the in-product flow). Named with
-- the same request_/invite_ prefixes as request_x_username / invite_handle.
ALTER TABLE founder_applications
  ADD COLUMN IF NOT EXISTS request_email text;

ALTER TABLE founder_passes
  ADD COLUMN IF NOT EXISTS invite_email text;
