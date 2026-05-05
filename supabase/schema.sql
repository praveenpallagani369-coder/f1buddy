-- ============================================================
-- F1Buddy Supabase Schema
-- Run this in Supabase SQL Editor to set up your database
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ---- Enums ----
create type visa_type as enum ('F1', 'J1', 'M1');
create type user_role as enum ('student', 'premium', 'university_admin', 'admin');
create type deadline_category as enum ('opt','visa','travel','tax','sevis','document','custom');
create type deadline_severity as enum ('critical', 'warning', 'info');
create type deadline_status as enum ('pending', 'acknowledged', 'completed', 'overdue');
create type employment_type as enum ('full_time', 'part_time', 'volunteer', 'unpaid_intern');
create type opt_type as enum ('pre_completion', 'post_completion', 'stem_extension');
create type travel_purpose as enum ('vacation', 'family', 'conference', 'interview', 'other');
create type document_type as enum ('i20','ead','passport','visa_stamp','i94','offer_letter','pay_stub','tax_return','transcript','other');
create type notification_type as enum ('deadline_reminder','document_expiry','opt_alert','travel_warning','system','tax_reminder');
create type subscription_plan as enum ('free', 'premium', 'university');
create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing');
create type tax_filing_status as enum ('nonresident_1040nr', 'resident_1040', 'exempt_treaty', 'not_required');

-- ---- Users ----
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  avatar_url text,
  visa_type visa_type default 'F1',
  sevis_id_encrypted text,
  i94_number_encrypted text,
  passport_number_encrypted text,
  passport_expiry date,
  school_name text,
  program_name text,
  degree_level text,
  program_start_date date,
  program_end_date date,
  dso_name text,
  dso_email text,
  dso_phone text,
  home_country text,
  port_of_entry text,
  role user_role not null default 'student',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---- Compliance Deadlines ----
create table compliance_deadlines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  deadline_date date not null,
  category deadline_category not null,
  severity deadline_severity not null default 'warning',
  status deadline_status not null default 'pending',
  is_system_generated boolean not null default false,
  reminder_30d_sent boolean not null default false,
  reminder_14d_sent boolean not null default false,
  reminder_7d_sent boolean not null default false,
  reminder_3d_sent boolean not null default false,
  reminder_1d_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_deadlines_user_date on compliance_deadlines(user_id, deadline_date);
create index idx_deadlines_status on compliance_deadlines(status, deadline_date);

-- ---- OPT Status ----
create table opt_status (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references users(id) on delete cascade,
  opt_type opt_type not null,
  ead_category text,
  ead_start_date date,
  ead_end_date date,
  unemployment_days_used integer not null default 0,
  unemployment_limit integer not null default 90,
  application_date date,
  approval_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- OPT Employment ----
create table opt_employment (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  employer_name text not null,
  employer_ein text,
  position_title text,
  start_date date not null,
  end_date date,
  is_current boolean not null default true,
  employment_type employment_type not null,
  is_stem_related boolean not null default true,
  e_verify_employer boolean not null default false,
  reported_to_school boolean not null default false,
  reported_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_employment_user_current on opt_employment(user_id, is_current);

-- ---- Travel Records ----
create table travel_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  departure_date date not null,
  return_date date,
  destination_country text not null,
  purpose travel_purpose not null default 'vacation',
  days_outside integer not null default 0,
  documents_carried jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_travel_user_departure on travel_records(user_id, departure_date);

-- ---- Documents ----
create table documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  doc_type document_type not null,
  file_url text not null,
  file_name text,
  file_size_bytes integer,
  mime_type text,
  expiration_date date,
  is_current_version boolean not null default true,
  previous_version_id uuid references documents(id),
  notes text,
  ai_extracted_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_documents_user_type on documents(user_id, doc_type);

-- ---- Tax Records ----
create table tax_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  tax_year integer not null,
  filing_status tax_filing_status,
  treaty_country text,
  treaty_article text,
  substantial_presence_days integer,
  form_8843_filed boolean not null default false,
  federal_filed boolean not null default false,
  state_filed boolean not null default false,
  state_name text,
  filed_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- Notifications ----
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  is_email_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user_read on notifications(user_id, is_read);

-- ---- Community Posts ----
create table community_posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null,
  is_anonymous boolean not null default false,
  upvotes integer not null default 0,
  answer_count integer not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_posts_category on community_posts(category, created_at desc);

-- ---- Community Answers ----
create table community_answers (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  is_verified boolean not null default false,
  is_accepted boolean not null default false,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- Subscriptions ----
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan subscription_plan not null default 'free',
  status subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS) — Users only see their own data
-- ============================================================

alter table users enable row level security;
alter table compliance_deadlines enable row level security;
alter table opt_status enable row level security;
alter table opt_employment enable row level security;
alter table travel_records enable row level security;
alter table documents enable row level security;
alter table tax_records enable row level security;
alter table notifications enable row level security;
alter table community_posts enable row level security;
alter table community_answers enable row level security;
alter table subscriptions enable row level security;

-- Users: can only read/update own row
create policy "users_select_own" on users for select using (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);

-- All other tables: user can CRUD their own rows only
create policy "deadlines_own" on compliance_deadlines for all using (auth.uid() = user_id);
create policy "opt_status_own" on opt_status for all using (auth.uid() = user_id);
create policy "employment_own" on opt_employment for all using (auth.uid() = user_id);
create policy "travel_own" on travel_records for all using (auth.uid() = user_id);
create policy "documents_own" on documents for all using (auth.uid() = user_id);
create policy "tax_own" on tax_records for all using (auth.uid() = user_id);
create policy "notifications_own" on notifications for all using (auth.uid() = user_id);
create policy "subscriptions_own" on subscriptions for all using (auth.uid() = user_id);

-- Community: anyone authenticated can read, own user can write
create policy "posts_read_all" on community_posts for select using (auth.role() = 'authenticated');
create policy "posts_write_own" on community_posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on community_posts for update using (auth.uid() = user_id);
create policy "answers_read_all" on community_answers for select using (auth.role() = 'authenticated');
create policy "answers_write_own" on community_answers for insert with check (auth.uid() = user_id);
create policy "answers_update_own" on community_answers for update using (auth.uid() = user_id);

-- Feedback (also shipped as migrations/008_feedback.sql)
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  submitter_email text not null,
  submitter_name text,
  message text not null,
  category text not null default 'general',
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_created_at on feedback (created_at desc);
alter table feedback enable row level security;
create policy "feedback_insert_own" on feedback for insert with check (auth.uid() = user_id);
create policy "feedback_select_own" on feedback for select using (auth.uid() = user_id);
create policy "feedback_select_admin" on feedback for select using (
  exists (select 1 from users u where u.id = auth.uid() and u.role = 'admin')
);
