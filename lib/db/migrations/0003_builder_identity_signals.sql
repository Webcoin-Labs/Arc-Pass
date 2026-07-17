ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_contribution_count integer,
  ADD COLUMN IF NOT EXISTS github_contributions_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS discord_arc_member boolean,
  ADD COLUMN IF NOT EXISTS discord_arc_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS discord_arc_role_ids jsonb,
  ADD COLUMN IF NOT EXISTS discord_arc_role_names jsonb,
  ADD COLUMN IF NOT EXISTS discord_arc_membership_checked_at timestamptz;
