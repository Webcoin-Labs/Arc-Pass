-- Prevent the same email from submitting more than one Founder Pass request,
-- mirroring the existing request_x_username uniqueness. Partial (NULL
-- request_email rows, including all legacy Typeform imports, are excluded)
-- and re-runnable.
CREATE UNIQUE INDEX IF NOT EXISTS founder_applications_request_email_unique
  ON founder_applications (request_email)
  WHERE request_email IS NOT NULL;
