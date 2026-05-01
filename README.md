# VisaBuddy — International Student Life Manager

Full-stack Next.js 14 app for F-1 visa compliance. Built to be completely free to run.

## Quick Start

### Step 1: Create Supabase Project (free at supabase.com)
1. New Project → copy Project URL, Anon Key, Service Role Key
2. SQL Editor → run contents of `supabase/schema.sql`
3. Authentication → Providers → Enable Google + GitHub

### Step 2: Get Groq API Key (free at console.groq.com)

### Step 3: Setup & Run
```bash
cp .env.example .env.local   # fill in Supabase + Groq keys
npm install
npm run dev                  # http://localhost:3000
```

## Pages
- `/` Landing page
- `/auth/login` + `/auth/register` Auth
- `/onboarding` 4-step wizard
- `/dashboard` Compliance overview
- `/dashboard/deadlines` All deadlines
- `/dashboard/opt` OPT employment tracker
- `/dashboard/travel` Trip log + days-outside counter
- `/dashboard/documents` Document vault
- `/dashboard/tax` Tax filing status
- `/dashboard/ai` AI immigration assistant (Groq/Llama 3.3)
- `/dashboard/community` Q&A community
- `/dashboard/profile` Student profile

## Stack (All Free)
Next.js 14 · Supabase (DB+Auth+Storage) · Groq AI · Tailwind CSS · Vercel hosting
