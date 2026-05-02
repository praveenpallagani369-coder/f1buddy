-- ============================================================
-- Migration 007: Missing tables (push subscriptions + biometric auth)
-- These tables exist in the Drizzle schema but were not in
-- Supabase migrations, causing 500 errors on push notification
-- subscription and WebAuthn biometric auth.
-- ============================================================

-- Push Subscriptions (Web Push API)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_own" ON push_subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WebAuthn Credentials (Biometric Auth)
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT        NOT NULL UNIQUE,
  public_key    TEXT        NOT NULL,
  counter       INTEGER     NOT NULL DEFAULT 0,
  device_name   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webauthn_own" ON webauthn_credentials
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- WebAuthn Challenges (temporary, expire quickly)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge   TEXT        NOT NULL,
  type        TEXT        NOT NULL, -- 'registration' | 'authentication'
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webauthn_challenges_own" ON webauthn_challenges
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-clean expired challenges (runs via cron or on insert)
CREATE OR REPLACE FUNCTION cleanup_webauthn_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
