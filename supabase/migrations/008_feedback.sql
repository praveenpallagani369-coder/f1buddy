-- User-submitted product feedback (sidebar → Feedback)
CREATE TABLE IF NOT EXISTS feedback (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitter_email  TEXT NOT NULL,
  submitter_name   TEXT,
  message          TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'general',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback (user_id);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_own" ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedback_select_own" ON feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "feedback_select_admin" ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
