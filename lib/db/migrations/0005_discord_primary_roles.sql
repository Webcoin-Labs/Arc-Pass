ALTER TABLE users
  ADD COLUMN IF NOT EXISTS discord_arc_primary_roles jsonb;
