# F1Buddy — Implementation Status

> Last updated: 2026-04-23 (Session 8 — All 14 UX/rule issues from audit fully resolved)
> Build status: ✅ Compiles clean
> Spec version: F1Buddy CareCircle Feature Spec v1.0 (April 2026)

---

## 🔧 Session 7 — USCIS Rule Audit Fixes

All issues below were identified by auditing the app against 8 CFR 214.2(f) and the F1Buddy USCIS reference document.

| Bug | File | Fix |
|-----|------|-----|
| STEM OPT rules showed incorrect "21-day submission window" for student | `visa-stages.ts` | Replaced with correct rules: 10 business days to DSO, cumulative 150-day unemployment cap, self-evaluations at 12/24 months |
| Cap-gap end date hardcoded to `"2025-10-01"` | `visa-stages.ts` | Now dynamically computes the next October 1 after EAD end date; also sets `isCurrent`/`isCompleted`/`isFuture` correctly |
| Travel signature check hardcoded as "1 year" for all students | `rules.ts` | OPT/STEM OPT students now see "less than 6 months old" (hasEAD=true path); non-OPT students see "12 months" |
| STEM report window was 21 calendar days | `stem-reports/page.tsx` | Changed to 14 calendar days (≈10 business days) per 8 CFR 214.2(f)(10)(ii)(C) |
| No self-evaluation tracking at months 12 and 24 | `stem-reports/page.tsx` | Added `requiresSelfEvaluation` flag; months 12 and 24 now show separate self-evaluation checklist (I-983 page 5) in the expanded view |
| STEM banner cited wrong rule and 21-day figure | `stem-reports/page.tsx` | Updated to cite 8 CFR 214.2(f)(10)(ii)(C); corrected to "10 business days" |
| Deadline descriptions for STEM reports said "21-day window" | `stem-reports/page.tsx` | Descriptions now say "10 business days" and note self-evaluation requirement at 12/24 months |
| Active window alert didn't mention self-evaluation | `stem-reports/page.tsx` | Alert now notes "self-evaluation required" for months 12 and 24 |

---

## 🔧 Session 6 — Bugs Fixed

| Bug | File | Fix |
|-----|------|-----|
| Employer details not saving | `dashboard/opt/page.tsx` | camelCase form fields were spread directly into Supabase insert — mapped to snake_case |
| Input fields losing focus on every keystroke | `onboarding/page.tsx` | `Field` component was defined inside parent — moved outside to prevent remount on every render |
| OPT timeline showing all steps as Overdue for STEM students | `opt/timeline/page.tsx` | Added STEM OPT banner + "Mark All Done" button |
| STEM validation deadlines not auto-created | `dashboard/opt/page.tsx` | Auto-generate 6/12/18/24 month deadlines when OPT type saved as STEM extension |
| STEM OPT application window not indicated | `dashboard/opt/page.tsx` | Added smart banner triggered at 90/60/30 days before OPT EAD expiry |
| Unescaped apostrophe breaking build | `opt/timeline/page.tsx` | Replaced `'` with `&apos;` in JSX |
| Dev server `npm run dev` not working on Windows | — | Must use `node node_modules/next/dist/bin/next dev` in PowerShell |

---

## ✅ Session 6 Issues — All Resolved After Sessions 7 + 8

### Rule / Logic Issues — Resolution

| # | Issue | Status |
|---|-------|--------|
| 1 | No student phase tracking | ✅ `visa-stages.ts` covers all phases; visa timeline page shows current stage clearly |
| 2 | Unemployment counter: is STEM cap cumulative? | ✅ Confirmed cumulative — rules text updated in `visa-stages.ts` |
| 3 | 60-day grace period not tracked | ✅ Already in `visa-stages.ts` stage 5 — shows in visa timeline |
| 4 | STEM eligibility not validated | ✅ Fixed — STEM OPT form now shows requirements checklist; employer form warns on non-E-Verify or unpaid work |
| 5 | Cap-gap date hardcoded to 2025-10-01 | ✅ Fixed — now dynamically computes next October 1 |
| 6 | Travel during pending OPT/STEM application | ✅ Fixed — pre-travel checklist now shows prominent abandonment risk warning |
| 7 | 5-month travel rule: months vs days | ✅ USCIS uses 5 calendar months — implementation correct |
| 8 | STEM application window start: 90 days? | ✅ 90 days before OPT EAD expiry is correct |

### UX / Flow Issues — Resolution

| # | Issue | Status |
|---|-------|--------|
| 9 | Timeline page ambiguous label | ✅ Fixed — sidebar now shows "OPT Application Steps" vs "STEM Application Steps" |
| 10 | No STEM OPT step-by-step application flow | ✅ Fixed — new `/dashboard/opt/stem-timeline` page with 7 steps |
| 11 | EAD categories not explained | ✅ Fixed — OPT form auto-syncs EAD category based on OPT type; helper text explains each category |
| 12 | Missed STEM report gives no guidance | ✅ Fixed — "Window Closed" now expands to show DSO contact guidance |
| 13 | Dashboard deadlines don't refresh after save | ✅ Fixed — success banner with link to Deadlines after STEM setup; router.refresh() called |
| 14 | Existing STEM users have no deadlines | ✅ Fixed — stem-reports page detects zero deadlines and shows prominent generate button |

---

## P0 — MVP Launch Day Features (from spec)

| Feature | Spec Description | Status |
|---------|-----------------|--------|
| **Visa Status Timeline** | Visual F-1 → CPT → OPT → STEM OPT → H-1B timeline with exact dates | ✅ Done — `/dashboard/visa-timeline` |
| **Unemployment Day Counter** | Live counter, color-coded alerts at 60, 75, and 85 days used | ✅ Done — exact day thresholds, color-coded banners |
| **STEM OPT Reporting Reminders** | Auto-reminders for 6/12/18/24-month I-983 validation. 21-day window. Checklist included | ✅ Done — `/dashboard/opt/stem-reports` |
| **Employment Change Alert** | Detects job change, 10-day countdown to DSO report, I-983 walkthrough, SEVP Portal update guide | ✅ Done — auto-deadline on employer add, `/dashboard/opt/i983` |
| **Days Outside US Counter** | Track total days per year, alert at 4 months, separate employer-required vs personal counters | ✅ Done — split counters, 4-month alert |

**P0 Summary: 5/5 fully complete ✅**

### P0 Code Audit Notes (Session 5 — verified against spec line by line)

| Feature | Verified | Notes |
|---------|----------|-------|
| Visa Status Timeline | ✅ | Cap-gap end date now dynamic (Session 7 fix). I-20 travel signature now 6 months for OPT students (Session 7 fix). |
| Unemployment Day Counter | ✅ | `unemployment_days_used` stored in DB but no auto-increment job — must be updated manually |
| STEM OPT Reporting Reminders | ✅ | Window corrected to 10 business days (Session 7). Self-evaluation added for months 12 & 24 (Session 7). |
| Employment Change Alert | ✅ | "Detects job changes" = manual employer entry only; no auto-detection from external signal |
| Days Outside US Counter | ✅ | No gaps — split counters, 120/150-day thresholds, CFR citation, all correct |

---

## P1 — Month 2 Features (from spec)

| Feature | Status |
|---------|--------|
| Address Change Tracker (10-day DSO report) | ✅ Done — auto-creates deadline, mark-reported button |
| Travel Document Checklist (pre-trip) | ✅ Done — full 7-item checklist page with red/yellow/green |
| Travel Risk Advisor (red/yellow/green by status) | ⚠️ Partial — checklist covers it but no standalone risk score |
| Resident vs Nonresident Calculator (Substantial Presence Test) | ⚠️ Partial — logic in `rules.ts`, no UI page |
| Tax Treaty Checker (country → treaty benefits → exempt income) | ❌ Not built |
| Form 8843 Reminder | ✅ Done — auto-generated on onboarding, shows in deadlines |
| Document Scanner & Storage | ✅ Done — real Supabase Storage upload, expiry alerts |
| Expiry Alerts (passport 6mo, I-20 sig age, EAD, visa stamp) | ✅ Done — pre-travel checklist + document vault expiry badges |
| H-1B Lottery Timeline (countdown, cap-gap) | ❌ Not built |
| Employer E-Verify Checker | ❌ Not built |

---

## P2 — Month 3+ Features (from spec)

| Feature | Status |
|---------|--------|
| FICA Tax Exemption Tracker | ❌ Not built |
| Remittance Tracker | ❌ Not built |
| Secure Document Share (encrypted link) | ❌ Not built |
| Alternative Pathway Guide (EB-2 NIW, O-1A, Canadian PR) | ❌ Not built |
| Anonymous Q&A Forum | ✅ Done — community Q&A with anonymous posting + answers |
| DSO Office Directory | ❌ Not built |

---

## ✅ Built (Session 1–3 Complete)

### Infrastructure
- [x] Next.js 14 App Router, TypeScript, Tailwind CSS
- [x] Supabase (DB + Auth + Storage + RLS)
- [x] Groq AI (Llama 3.3 70B + 8B fallback)
- [x] Full folder structure and config
- [x] `.env.example` + `SETUP.md` + `README.md`

### Database & Schema
- [x] 11 tables with full RLS policies
- [x] `supabase/schema.sql` + `migrations/001_new_features.sql`
- [x] Auto-create user profile on auth signup trigger
- [x] `opt_application_steps` table for timeline tracking

### Auth Flow
- [x] Email/password login + register
- [x] Google OAuth (via Supabase)
- [x] Magic link (email)
- [x] Auth callback with onboarding redirect
- [x] Middleware protecting all `/dashboard/*` routes

### Onboarding
- [x] 4-step wizard (visa, school, DSO, review)
- [x] Auto-generates system deadlines on completion (`/api/onboarding`)

### Core Dashboard (`/dashboard`)
- [x] Compliance status (green/yellow/red) with pulse indicator
- [x] OPT unemployment days card + progress bar
- [x] Days outside US counter + 5-month warning
- [x] Upcoming deadlines list
- [x] Expiring documents count
- [x] Current employer card
- [x] Program info summary
- [x] Quick-action links

### Deadlines (`/dashboard/deadlines`)
- [x] Full list with category filter tabs
- [x] Add custom deadline (form + `/api/deadlines` POST)
- [x] Acknowledge + Mark Done actions (with ownership verification)
- [x] Severity badges, overdue detection
- [x] System-generated deadlines (auto-created on onboarding)

### OPT Tracker (`/dashboard/opt`)
- [x] OPT status card (type, EAD dates, unemployment counter + progress bar)
- [x] Setup/update OPT form
- [x] Add employer form (all fields, STEM/E-Verify/reported flags)
- [x] Employment history list
- [x] DSO reporting warning (if not reported)

### OPT Application Timeline (`/dashboard/opt/timeline`) — Session 2
- [x] 7-step tracker auto-calculated from program end date
- [x] Mark steps complete (saved to Supabase)
- [x] USCIS processing time estimates (10/16/24 weeks)
- [x] Common mistakes list

### STEM OPT Application Timeline (`/dashboard/opt/stem-timeline`) — Session 8
- [x] 7-step tracker (eligibility → E-Verify → I-983 → DSO I-20 → file I-765 → receipt → EAD)
- [x] Auto-calculated dates from OPT EAD end date
- [x] Mark steps complete (stored in `opt_application_steps` with `stem_` prefix)
- [x] Detects if already on STEM OPT and shows redirect to STEM Reports
- [x] Common STEM OPT mistakes list

### Employment Authorization Calculator (`/dashboard/opt/calculator`) — Session 2
- [x] Standard OPT + STEM OPT modes
- [x] All authorization windows, grace periods, cap-gap
- [x] Live recalculation

### Travel Tracker (`/dashboard/travel`)
- [x] Days outside US counter (current year)
- [x] Trip logging with purpose + documents carried checklist
- [x] 5-month rule warning banner
- [x] Currently abroad status

### Pre-Travel Checklist (`/dashboard/travel/checklist`) — Session 2
- [x] Passport validity check
- [x] F-1 visa stamp check
- [x] I-20 travel signature check (12mo standard / 6mo OPT)
- [x] Program end date check
- [x] EAD validity + OPT unemployment impact check
- [x] 5-month rule check for long trips
- [x] Overall pass/warn/fail verdict
- [x] Documents-to-carry list

### Document Vault (`/dashboard/documents`)
- [x] Real file upload to Supabase Storage (PDF/JPG/PNG, 10MB max)
- [x] Signed upload URL via `/api/documents`
- [x] Expiration tracking with badges
- [x] Soft delete

### Tax Filing (`/dashboard/tax`)
- [x] Filing history (1040-NR, 8843, treaty country)
- [x] April 15 countdown alert
- [x] Links to Sprintax and Glacier Tax Prep

### AI Assistant (`/dashboard/ai`)
- [x] Groq API with Llama 3.3 70B (8B fallback on rate limit)
- [x] Immigration system prompt with CFR citation instructions
- [x] Chat UI with suggested questions
- [x] `/api/ai` POST with auth + Zod validation

### Community Q&A (`/dashboard/community`)
- [x] Post questions (title, body, category, anonymous option)
- [x] View + upvote posts
- [x] Post and view answers inline
- [x] Answer upvoting
- [x] `/api/community/answers` GET + POST

### Profile + Address (`/dashboard/profile`, `/dashboard/profile/address`)
- [x] View + edit all student info
- [x] US address with 10-day SEVIS reporting reminder
- [x] Auto-creates deadline on address change
- [x] Mark-as-reported button

### SEVIS Address Reminder — Session 2
- [x] Address form + DSO reporting tracker
- [x] Auto-deadline creation (10 days, critical severity)

### DSO Email Generator (`/dashboard/dso-email`) — Session 2
- [x] 5 templates: travel signature, employer report, STEM rec, I-20 extension, address update
- [x] Auto-fills profile data
- [x] Copy + mailto links

### API Routes (Server-side validated)
- [x] `/api/ai` — Groq chat
- [x] `/api/onboarding` — system deadline generation
- [x] `/api/documents` — CRUD + signed upload URL
- [x] `/api/deadlines` — CRUD with ownership check
- [x] `/api/user` — profile GET + PATCH
- [x] `/api/community/answers` — GET + POST
- [x] `/api/seed` — demo data (dev only)
- [x] `/auth/callback` — auth callback

### Domain Logic (`lib/immigration/`)
- [x] `rules.ts` — unemployment counter, 5-month rule, substantial presence test, deadline generator, re-entry checklist
- [x] `travel-checklist.ts` — full pre-travel check engine with CFR citations

---

## ✅ All P0 Features Complete (Session 4)

| Feature | Page | What was built |
|---------|------|---------------|
| Visa Status Timeline | `/dashboard/visa-timeline` | F-1 → OPT → STEM → Grace period stages. Auto-detects current stage. Rules per stage. Expandable detail cards. |
| Unemployment Counter (60/75/85) | `/dashboard/opt` | Exact day thresholds — banners at 60 (notice), 75 (warning), 85 (critical) days. Color-coded progress bar. |
| STEM Reporting Reminders | `/dashboard/opt/stem-reports` | 4 windows at 6/12/18/24 months. 21-day window tracking. I-983 checklist per report. Missed window detection. One-click add to Deadlines. |
| Employment Change Alert | `/dashboard/opt/i983` | Auto-creates 10-day critical deadline when employer added. 7-step I-983 walkthrough. SEVP obligations checklist. Countdown banner. |
| Travel Split + 4-month Alert | `/dashboard/travel` | Employer-required vs personal split counters. Alert at 4 months (120 days) per spec. Note that personal travel while unemployed counts toward OPT limit. |

---

## 📋 Future Features (P1 — Month 2)

- [ ] **Visa Status Timeline** — P0 — visual F-1 stage tracker (see above)
- [ ] **STEM Reporting Reminders** — P0 — 6/12/18/24 month I-983 alerts (see above)
- [ ] **Employment Change I-983 Walkthrough** — P0 — 10-day countdown + form guide
- [ ] **Unemployment Alert Thresholds** — fix to trigger at exactly 60, 75, 85 days
- [ ] **Travel Type Split** — employer-required vs personal travel separate counters
- [ ] **Substantial Presence Test UI** — logic exists in `rules.ts`, needs `/dashboard/opt/substantial-presence` page
- [ ] **Tax Treaty Checker** — country selector → treaty article, exempt income amount, required forms
- [ ] **H-1B Lottery Timeline** — countdown to March registration, cap-gap explanation, STEM OPT date dependency
- [ ] **Employer E-Verify Checker** — search SAM.gov or DOL E-Verify registry
- [ ] **Travel Risk Advisor** — standalone red/yellow/green risk score based on current status (pending app, unemployed, cap-gap)
- [ ] **Email notifications via Resend** — deadline reminders at 30/14/7/1 days
- [ ] **Notification center UI** — bell icon, notification list, mark-as-read
- [ ] **Stripe subscriptions** — pricing page, checkout, plan gating
- [ ] **SEVIS ID encryption** — AES-256 for SEVIS ID + passport number fields
- [ ] **Password reset** — `/auth/reset-password` page
- [ ] **Account deletion** — GDPR-compliant full data purge

## 📋 Future Features (P2 — Month 3+)

- [ ] **FICA Tax Exemption Tracker** — current exemption status + expiry alert
- [ ] **Remittance Tracker** — log money sent home with exchange rate + tax records
- [ ] **Secure Document Share** — encrypted link with access tracking for employers/DSO/attorneys
- [ ] **Alternative Pathway Guide** — EB-2 NIW, O-1A, L-1, Canadian PR options by profile
- [ ] **DSO Office Directory** — school ISSS contacts, hours, walk-in times by case type
- [ ] **University Admin Portal** — B2B dashboard for ISSS offices
- [ ] **Streaming AI responses** — token-by-token display
- [ ] **AI context injection** — user profile + OPT status sent with every AI query
- [ ] **Conversation history** — persist AI chat across page refresh
- [ ] **Community post search** — full-text search across Q&A
- [ ] **Document version history** — multiple I-20 versions tracked
- [ ] **Mobile sidebar** — hamburger menu for small screens
- [ ] **Loading skeletons** — replace plain text "Loading..."
- [ ] **Unit tests** — Vitest for immigration rules engine
- [ ] **E2E tests** — Playwright for critical flows
- [ ] **CI/CD pipeline** — GitHub Actions
- [ ] **Vercel deployment** — production hosting config

---

## File Count (Session 3)

| Category | Count |
|----------|-------|
| Pages / Routes | 30 |
| API Routes | 8 |
| UI Components | 7 |
| Layout Components | 2 |
| Library / Domain | 8 |
| Config / SQL / Docs | 8 |
| **Total** | **63** |
