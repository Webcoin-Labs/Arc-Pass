-- Modern Discord usernames do not require a discriminator, while legacy
-- identities may still use username#1234. Keep the discriminator separate so
-- username normalization and invite matching remain unambiguous.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS discord_discriminator text;

ALTER TABLE founder_passes
  ADD COLUMN IF NOT EXISTS invite_discriminator text;

UPDATE users SET x_username = lower(regexp_replace(x_username, '^@+', '')) WHERE x_username IS NOT NULL;
UPDATE users SET discord_username = lower(discord_username) WHERE discord_username IS NOT NULL;
UPDATE users SET username = lower(regexp_replace(username, '^@+', '')) WHERE provider = 'x';
UPDATE founder_passes SET invite_handle = lower(regexp_replace(invite_handle, '^@+', '')) WHERE invite_handle IS NOT NULL;

CREATE INDEX IF NOT EXISTS founder_passes_discord_invite_identity_idx
  ON founder_passes (invite_handle, invite_discriminator)
  WHERE invite_platform = 'discord';
