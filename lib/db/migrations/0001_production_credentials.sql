ALTER TABLE wallets ADD COLUMN IF NOT EXISTS ownership_verified_at timestamptz;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS signature_method text;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS last_analysed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS wallets_address_unique ON wallets (lower(address));

CREATE TABLE IF NOT EXISTS wallet_challenges (
  id serial PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_address text NOT NULL, nonce_hash text NOT NULL UNIQUE, domain text NOT NULL,
  expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS oauth_states (
  id serial PRIMARY KEY, nonce_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
  consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS builder_supply (
  id serial PRIMARY KEY, phase_name text NOT NULL DEFAULT 'Phase 1',
  phase_claim_limit integer NOT NULL DEFAULT 2000, total_claimed_count integer NOT NULL DEFAULT 0,
  total_minted_count integer NOT NULL DEFAULT 0, active_count integer NOT NULL DEFAULT 0,
  revoked_count integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO builder_supply (id, total_claimed_count, total_minted_count, active_count, revoked_count)
SELECT 1,
  count(*) FILTER (WHERE claim_status IN ('claimed', 'minted')),
  count(*) FILTER (WHERE claim_status = 'minted'),
  count(*) FILTER (WHERE claim_status = 'minted' AND NOT is_revoked),
  count(*) FILTER (WHERE claim_status = 'minted' AND is_revoked)
FROM builder_passes
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS founder_applications (
  id serial PRIMARY KEY, source text NOT NULL DEFAULT 'manual', typeform_response_id text UNIQUE,
  full_name text NOT NULL, work_email text, personal_email text, x_username text, discord_username text,
  company_name text, company_website text, founder_role text, company_category text, startup_stage text,
  description text, logo_url text, status text NOT NULL DEFAULT 'under_review', reviewer_id integer,
  internal_notes text, submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
  raw_external_payload_reference jsonb
);

CREATE TABLE IF NOT EXISTS admin_users (
  id serial PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL, role text NOT NULL DEFAULT 'reviewer',
  is_active boolean NOT NULL DEFAULT true, failed_login_count integer NOT NULL DEFAULT 0, locked_until timestamptz,
  last_login_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id serial PRIMARY KEY, admin_user_id integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id serial PRIMARY KEY, admin_user_id integer REFERENCES admin_users(id), action text NOT NULL,
  entity_type text NOT NULL, entity_id text, metadata jsonb, ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
