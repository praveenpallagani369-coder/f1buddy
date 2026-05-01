# VisaBuddy — Future Features

## Immigration Attorney Community (High Priority)

Connect verified immigration attorneys with F-1 students through the community Q&A.

**How it works:**
- Attorneys create accounts and apply to join the program
- Admin verifies them (bar number, license check)
- Their community answers show credentials + "Book Consultation →" button
- Students can browse a `/attorneys` listing page and book directly

**Business model:**
- Attorneys pay a monthly listing fee for verified profile + lead access
- VisaBuddy takes a small cut on consultations booked through the platform
- Students get reliable, attorney-reviewed answers (not just peer advice)
- Attorneys get warm leads from students who already trust them

**What to build:**
- `lawyer_profiles` table (bio, bar number, states licensed, consultation URL, hourly rate, is_verified)
- Attorney badge on community answers with booking link
- `/attorneys` public listing page
- `/for-lawyers` landing page with "Apply to join" form
- Admin verification flow

**When to do this:** Once community has enough traffic that attorneys see value in joining (~500+ MAU)

---

## Stripe Checkout for Premium

Wire the existing pricing page CTA to an actual Stripe checkout flow.

- Free → Premium upgrade modal inside dashboard
- Webhook already scaffolded, subscription table exists
- Gate: AI assistant, email reminders, unlimited uploads behind premium check

**When to do this:** Once waitlist has 20+ signups showing intent to pay

---

## Daily Compliance Brief (Push Notification)

Morning push/email that gives each user their one-line status for the day.

- OPT students: "Day 34 of 90 — you're all clear"
- Employed students: "✅ Employed at Acme Corp — next deadline in 23 days"
- Traveling students: "✈️ Day 12 abroad — 138 days remaining this year"

Cron infra already exists (`/api/reminders`). Needs a separate daily digest job.

**When to do this:** Anytime — infra is ready, just needs the digest template
