-- ============================================================
-- F1Buddy Migration 001 — New Feature Fields
-- Run this in Supabase SQL Editor after the initial schema.sql
-- ============================================================

-- Feature 1: Pre-Travel Checklist
-- Add I-20 travel signature date to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS i20_travel_signature_date date;
ALTER TABLE users ADD COLUMN IF NOT EXISTS visa_stamp_expiry date;

-- Feature 2: OPT Application Timeline
CREATE TABLE IF NOT EXISTS opt_application_steps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  step_name text not null,
  step_order integer not null,
  target_date date,
  completed_date date,
  is_completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_opt_steps_user on opt_application_steps(user_id, step_order);
alter table opt_application_steps enable row level security;
create policy "opt_steps_own" on opt_application_steps for all using (auth.uid() = user_id);

-- Feature 3: SEVIS Address Update
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_address_line1 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_address_city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_address_state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_address_zip text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_updated_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_reported_to_dso boolean not null default false;
