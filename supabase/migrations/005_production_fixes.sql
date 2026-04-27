-- ============================================================
-- Migration 005: Production Readiness Fixes
-- 1. Missing RLS DELETE policies on community tables
-- 2. Missing INSERT policy on users table
-- 3. Serverless-safe rate limiting infrastructure
-- ============================================================

-- 1. Community DELETE policies (users can only delete their own posts/answers)
CREATE POLICY "posts_delete_own" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "answers_delete_own" ON community_answers
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Users INSERT policy (for edge cases beyond the auth trigger)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Rate limiting table (serverless-safe, replaces in-memory Map)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, NOW())
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;

  IF NOW() > v_window_start + make_interval(secs => p_window_seconds) THEN
    UPDATE rate_limits SET count = 1, window_start = NOW() WHERE key = p_key;
    RETURN TRUE;
  END IF;

  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  UPDATE rate_limits SET count = count + 1 WHERE key = p_key;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
