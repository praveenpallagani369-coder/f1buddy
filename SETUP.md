# F1Buddy — Local Setup Guide (15 minutes)

## Step 1: Create Supabase Project (free, ~5 min)

1. Go to https://supabase.com → Sign up (GitHub or email)
2. Click **New Project**
   - Name: `f1buddy-dev`
   - Database password: pick a strong one (save it)
   - Region: pick closest to you
3. Wait ~2 min for project to provision
4. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Settings → Database** → copy the **Connection string (URI)** → `DATABASE_URL`
6. Go to **SQL Editor** → click **New query**
   - Paste the entire contents of `supabase/schema.sql` → click **Run**
   - Then paste contents of `supabase/migrations/001_new_features.sql` → click **Run**
7. Go to **Authentication → Settings**
   - Turn OFF **"Enable email confirmations"** (so you can test without checking email)
8. Go to **Storage → New bucket**
   - Name: `documents`
   - Toggle: **Private bucket**
   - Click **Save**

---

## Step 2: Get Groq API Key (free, ~2 min)

1. Go to https://console.groq.com → Sign up
2. Click **API Keys → Create API Key**
3. Copy the key → `GROQ_API_KEY`

---

## Step 3: Fill .env.local (~2 min)

Open `/Users/ppallagani/Desktop/projects/f1buddy/.env.local` and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres

GROQ_API_KEY=gsk_xxxxx

# Leave these as placeholders for local testing:
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
RESEND_API_KEY=re_placeholder
RESEND_FROM_EMAIL=noreply@f1buddy.app
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENCRYPTION_IV=00000000000000000000000000000000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 4: Run the App

```bash
cd ~/Desktop/projects/f1buddy
npm install       # only if not done yet
npm run dev
```

Open http://localhost:3000

---

## Step 5: Test End-to-End

### Create your account
1. Click **Get Started Free** on landing page
2. Enter your email + password → **Create Account**
3. Since email confirmations are OFF, you'll be signed in automatically
4. Complete the **4-step onboarding wizard** with your (or test) data
5. You'll land on the **Dashboard**

### Load demo data (easiest way to see everything)
- Look for the **"🌱 Load Demo Data"** button in the bottom-right corner
- Click it — it populates: profile, OPT status, employment, trips, documents, deadlines, tax records, community posts
- Refresh the page to see everything

### Test each feature
| Page | What to test |
|------|-------------|
| **Dashboard** | Compliance status, OPT counter, deadlines list, quick actions |
| **Deadlines** | Add custom deadline, filter by category, mark as done |
| **OPT Tracker** | View OPT status, add employer, see unemployment days |
| **OPT Timeline** | Enter program end date, mark steps complete |
| **Auth Calculator** | Enter your dates, see authorization windows |
| **Travel** | Log a trip, see days-outside counter update |
| **Pre-Travel Checklist** | Enter departure date, run checklist |
| **Documents** | Upload a real PDF, see it stored, check expiration |
| **Tax** | Add tax year record |
| **DSO Emails** | Select template, fill fields, copy email |
| **AI Assistant** | Ask "Can I work off-campus on F-1?" |
| **Community** | Post a question, answer someone's post |
| **Profile** | Edit your info, update address |

---

## Optional: Google OAuth

To enable "Continue with Google":
1. Go to https://console.cloud.google.com
2. New Project → APIs & Services → Credentials → OAuth 2.0 Client
3. Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy Client ID + Secret
5. In Supabase: Authentication → Providers → Google → paste keys
6. No code changes needed — the login button already works

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Invalid API key" on dashboard | Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local |
| Can't sign up | Make sure email confirmations are OFF in Supabase Auth settings |
| Dashboard shows no data | Click "🌱 Load Demo Data" button |
| SQL Editor errors | Make sure you ran schema.sql FIRST, then 001_new_features.sql |
| AI returns error | Check GROQ_API_KEY is set correctly in .env.local |
| File upload fails | Make sure "documents" Storage bucket exists in Supabase |
