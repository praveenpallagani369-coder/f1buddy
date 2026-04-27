-- CPT Records table
-- Run this in Supabase SQL Editor: supabase.com → SQL Editor

CREATE TABLE IF NOT EXISTS cpt_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  employer_name TEXT NOT NULL,
  position_title TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  cpt_type TEXT DEFAULT 'part_time' CHECK (cpt_type IN ('part_time', 'full_time')),
  is_authorized_on_i20 BOOLEAN DEFAULT false,
  course_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cpt_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_cpt_select" ON cpt_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_own_cpt_insert" ON cpt_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_cpt_update" ON cpt_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_own_cpt_delete" ON cpt_records
  FOR DELETE USING (auth.uid() = user_id);
