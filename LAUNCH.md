# VisaBuddy — Launch Checklist & Strategy

> From now to live, paying users, and first university contract.
> Each item is either **code** (already done or doable in the repo) or
> **your action** (requires you to click, sign up, or write something).
> Items marked ✅ are already done in the codebase.

---

## PHASE 1 — FOUNDATION (Days 1–5)
*Get the app production-ready before any human sees it.*

### Code Fixes ✅ (already done this session)
- [x] NaN guard on AI deadline context builder
- [x] Rate limiting on document AI parsing endpoint (5 req/min)
- [x] 90-day AI conversation cleanup cron (`/api/cron/cleanup-conversations`, runs Sundays 3am UTC)
- [x] `/api/health` endpoint for uptime monitoring
- [x] Documents page `any[]` types replaced with `DocumentRecord` interface
- [x] Community page dark mode filter button fix (`text-gray-900` → `text-white`)
- [x] Travel page `TripRecord` interface (no more `any[]`)
- [x] Community page `CommunityPost` / `CommunityAnswer` interfaces
- [x] Stripe checkout infrastructure (`/api/payments/create-checkout`)
- [x] Stripe payment success page (`/payments/success`)
- [x] Pricing page CTA updated (mailto → real Stripe checkout links)
- [x] Phase-aware AI suggested questions (6 questions per OPT phase)
- [x] Post-onboarding OPT setup banner on dashboard
- [x] AI route NaN guards for date calculations
- [x] `STRIPE_PRICE_MONTHLY_ID` and `STRIPE_PRICE_YEARLY_ID` added to `.env.example`

---

### YOUR ACTION — Stripe Setup (1 hour)

**Step 1: Create your Stripe account**
1. Go to https://dashboard.stripe.com
2. Sign up with your email → verify email
3. Complete business profile (can use "Sole Proprietor" for now)

**Step 2: Create your products**
1. In Stripe Dashboard → click **Products** in the left menu
2. Click **+ Add Product** → name it "VisaBuddy Premium"
3. Add Price 1:
   - Amount: **$6.99**
   - Billing period: **Monthly**
   - Click **Save**
   - Copy the **Price ID** (looks like `price_1abc...`) — save it
4. Add Price 2 (on the same product):
   - Amount: **$59.99**
   - Billing period: **Yearly**
   - Click **Save**
   - Copy the **Price ID** — save it

**Step 3: Add to your environment**
Add these to your `.env.local` file (and in Vercel → Settings → Environment Variables):
```
STRIPE_PRICE_MONTHLY_ID=price_xxxx   ← your monthly price ID
STRIPE_PRICE_YEARLY_ID=price_xxxx    ← your yearly price ID
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**Step 4: Test checkout**
1. In Stripe Dashboard → switch to **Test mode** (top right toggle)
2. Go to your app → `/pricing` → click "Subscribe Monthly"
3. Use test card: `4242 4242 4242 4242`, any future date, any CVC
4. Confirm you land on `/payments/success`
5. When satisfied → switch Stripe to **Live mode**, copy live keys to env vars

---

### YOUR ACTION — Vercel Environment Variables (15 minutes)

Go to https://vercel.com → your project → **Settings → Environment Variables**

Add these if not already set:
```
NEXT_PUBLIC_APP_URL          = https://your-actual-domain.vercel.app
STRIPE_PRICE_MONTHLY_ID      = price_xxxx
STRIPE_PRICE_YEARLY_ID       = price_xxxx
STRIPE_SECRET_KEY            = sk_live_xxxx  (switch to live when ready)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_xxxx
```

Then redeploy: Vercel Dashboard → your project → **Redeploy**.

---

### YOUR ACTION — Privacy Policy Update (30 minutes)

Add this paragraph to your `/privacy` page, under the "Data We Collect" section:

> **Immigration Document Data**
> VisaBuddy allows you to optionally store immigration document numbers
> (SEVIS ID, passport number, I-94 number) for compliance tracking purposes.
> These values are encrypted using AES-256-GCM encryption before storage.
> The encryption key is held by VisaBuddy and never stored alongside your data.
> VisaBuddy does not share this information with USCIS, ICE, DHS, or any
> government agency except as required by a valid, specific legal process
> (such as a court order). You may delete your account and all associated
> data at any time from your Profile settings.

---

### YOUR ACTION — Uptime Monitoring (20 minutes)

1. Go to https://betteruptime.com → sign up free
2. Click **New Monitor** → URL: `https://your-domain.vercel.app/api/health`
3. Check interval: **3 minutes**
4. Alert via: your email (or SMS)
5. Done — you'll get a text if the app goes down

---

## PHASE 2 — SOFT LAUNCH (Days 6–14)
*Get 50 real users before ProductHunt. Fix what breaks.*

### YOUR ACTION — Reddit Posts (3 posts over 5 days)

**Post 1 — r/f1visa (Day 6)**
Title: `Built a free OPT tracker that counts unemployment days and warns you before deadlines — no ads, no paywall for core features`

Body: Write 2–3 paragraphs:
- Open with a personal pain point (e.g., "I almost missed my 90-day limit because I was counting manually in a spreadsheet")
- Describe what VisaBuddy does (compliance dashboard, OPT counter, travel tracker, AI assistant)
- End with: "It's free. Here's the link: [your URL]. Would love feedback from anyone who's been through OPT."
- DO NOT make it sound like an ad. Be a student helping students.

**Post 2 — r/OPT (Day 9)**
Title: `PSA: Built a free tool that auto-calculates your OPT unemployment days so you don't have to count manually`

Focus on the unemployment counter specifically — this is the biggest pain point in that sub.

**Post 3 — r/internationalstudents (Day 12)**
Title: `Free app for F-1 students: tracks OPT days, travel limits, document expiry, and has an AI that knows your specific situation`

Broader angle — mention travel tracker and AI assistant.

---

### YOUR ACTION — Watch & Fix (Days 6–14)

After each Reddit post:
1. Open **PostHog** (your analytics) → watch real-time sessions
2. Open **Supabase** → Table Editor → `users` table → watch signups
3. Read every Reddit comment — users will tell you exactly what's broken
4. Fix the top 3 issues you find before the next post

The most common first-user problems to watch for:
- "I can't find where to add my OPT dates" → onboarding is confusing
- "The AI didn't know my situation" → profile not filled in
- "I got an error when uploading my I-20" → check Supabase Storage permissions

---

### YOUR ACTION — Activate the DSO Email Viral Loop

In the DSO Email page (`/dashboard/dso-email`), after users generate an email draft, add an opt-in checkbox:

> ☐ Add "Sent via VisaBuddy (free compliance tool for F-1 students)" to the email footer

When checked, this puts your tool name in the inbox of hundreds of DSO officers at universities — free B2B marketing every time a student emails their advisor.

*(This is a code task — ask your developer to add it, or come back and ask Claude Code.)*

---

## PHASE 3 — PRODUCTHUNT LAUNCH (Day 21)

### YOUR ACTION — Prepare Assets (Days 15–18)

**Screenshots needed (take these from your live app):**
1. Dashboard showing all 4 stat cards + phase banner (the main selling shot)
2. OPT tracker with unemployment progress bar
3. AI assistant answering a real question
4. Travel tracker with trip history
5. Mobile screenshot of dashboard (phones represent 60% of PH traffic)

**Write your ProductHunt tagline** (60 chars max):
> "Stay in F-1 status. OPT tracker + AI compliance assistant."

**Write your ProductHunt description** (3 paragraphs):
- Para 1: The problem (1.1M students, one missed deadline = deportation)
- Para 2: What VisaBuddy does (list the 5 core features)
- Para 3: Why it's free and how you built it

**Write your founder story blog post** (publish on your site or Medium):
Title: `"Why I Built VisaBuddy: The Day I Almost Lost My OPT Status"`
This single post will drive more signups than any ad. Personal stories about immigration anxiety resonate deeply.

---

### YOUR ACTION — Launch Day (Day 21, Tuesday 4am PST)

**48 hours before:**
- Tell 50 friends, colleagues, and people in F-1 communities to upvote on Tuesday
- Post in developer communities (IndieHackers, Twitter/X, LinkedIn) — "Launching on PH Tuesday, would love your support"
- Post in your university's international student Facebook group / WhatsApp

**Launch day:**
1. Submit at exactly **4:00am PST Tuesday** at https://www.producthunt.com/posts/new
2. Use your best screenshot as the thumbnail
3. In the first comment, write your founder story (3–4 paragraphs, personal)
4. Respond to EVERY comment within 2 hours — PH rewards engagement
5. Post "We're live on ProductHunt today!" on Twitter/X, LinkedIn

**After launch:**
- Email every Reddit commenter who gave feedback: "We launched on PH today — your feedback made it better"
- Share the PH link in r/f1visa one more time

---

## PHASE 4 — SEO CONTENT (Weeks 3–8)
*The best F-1 user acquisition channel is Google. It's free and compounding.*

### YOUR ACTION — Write These 10 Blog Posts

Each post targets a high-intent search term. Write one per week.

| # | Title | Target Keyword | Est. Monthly Searches |
|---|-------|---------------|----------------------|
| 1 | "OPT Unemployment Days: The Complete 2026 Guide" | OPT unemployment days | High |
| 2 | "STEM OPT Extension: Step-by-Step Timeline" | STEM OPT extension timeline | High |
| 3 | "Can I Travel While My OPT Application is Pending?" | travel OPT pending | High |
| 4 | "F-1 to H-1B: What Happens After OPT Expires" | F-1 H-1B transition | High |
| 5 | "Form 8843: Who Needs to File and How" | form 8843 filing | Medium |
| 6 | "The 5-Month Travel Rule for F-1 Students Explained" | F-1 5 month travel rule | Medium |
| 7 | "OPT EAD Card: Category C3B vs C3C — What's the Difference?" | EAD C3B C3C | Medium |
| 8 | "How to Report a New Employer to Your DSO (10-Day Rule)" | DSO employer reporting | Medium |
| 9 | "F-1 Substantial Presence Test: Are You a Tax Resident?" | substantial presence test | Medium |
| 10 | "SEVIS Transfer: Complete Guide for Students Changing Schools" | SEVIS transfer | Medium |

**Publishing tips:**
- Each post should be 1,500–2,500 words
- Include your compliance disclaimer at the bottom of every post
- Link to the relevant VisaBuddy feature in the post (e.g., OPT article → link to OPT tracker)
- Add a CTA: "Track your OPT automatically with VisaBuddy — free for all F-1 students"

---

## PHASE 5 — B2B UNIVERSITY OUTREACH (Month 2+)
*One university deal = $15,000–$60,000/year. This is the real business.*

### YOUR ACTION — Build the Target List

Google search: `"international student services" site:edu`

Build a spreadsheet of 50 universities with:
- University name
- Number of international students (from their SEVIS data / website)
- ISSS director name (LinkedIn)
- ISSS office email

Start with universities where you have a personal connection (your own school, friend's school).

---

### YOUR ACTION — Email Template

Send this to the ISSS director at each university:

---
Subject: Free compliance tool your F-1 students are already using

Hi [Name],

I'm [your name], an F-1 student who built VisaBuddy — a free compliance dashboard that helps international students track OPT deadlines, travel limits, and document expirations in one place.

We have [X] students from [University] already using it. Students tell us it reduces the anxiety around compliance because they can see their exact status at a glance instead of trying to remember rules from the ISSS handbook.

I'd love to offer [University] a free pilot of our university admin dashboard, which gives your ISSS office a read-only compliance overview across all enrolled international students. You can see who has expiring documents, who's approaching their unemployment limit, and who has upcoming deadlines — without emailing each student individually.

It's completely free for the pilot period. No installation, no IT requirement — just a web login.

Would you be open to a 20-minute call this week?

[Your name]
VisaBuddy — https://visabuddy.app
---

---

### YOUR ACTION — Pricing for University Contracts

When a university says yes, price it at:
- **Under 500 international students:** $10/student/year = $5,000/year minimum
- **500–2,000 students:** $18/student/year
- **2,000+ students:** $22/student/year (volume discount)
- **Payment:** Annual invoice, Net 30

Get payment by ACH/wire (universities don't pay by credit card). Use Stripe Invoicing.

---

## PHASE 6 — ONGOING GROWTH (Month 2+)

### Social Media (30 min/week)

**Twitter/X — Post 3x per week:**
- F-1 compliance tips (mini-threads)
- "Did you know: if you travel abroad while on OPT unemployment, those days still count toward your 90-day limit"
- Share your SEO blog posts
- Respond to every tweet that mentions "OPT", "F-1 visa", "international student" and contains a question you can answer

**LinkedIn — 2x per week:**
- Target: HR managers, immigration attorneys, ISSS officers
- Posts: "We just added X feature" / "Interesting data from 1,000 F-1 students using our tool"
- B2B-oriented: speak to the university audience here

**TikTok/Instagram Reels (optional but high upside):**
- 60-second videos: "The 3 OPT rules that get students deported (and how to track them)"
- Young international students are heavily on TikTok
- One viral video can drive thousands of signups overnight

---

### Retention Hooks (Build These in Months 1–3)

These features create daily/weekly habits that keep users coming back:

1. **Weekly email digest** — "Here's your compliance status this week" (Resend, already integrated)
2. **30-day streak** — badge on dashboard for checking in 30 days in a row (gamification)
3. **"Share your countdown"** — a shareable OPT countdown card (goes viral during H-1B lottery season)
4. **Referral program** — "Invite a classmate and both get 1 month Premium free"

---

## SUMMARY TIMELINE

| Week | Priority | Time Required |
|------|----------|--------------|
| 1 | Stripe setup + env vars + privacy policy | 2–3 hours |
| 1 | Set up uptime monitoring | 30 minutes |
| 2 | Reddit post 1 (r/f1visa) | 1 hour to write |
| 2 | Watch analytics, fix top issues | Ongoing |
| 2 | Reddit post 2 (r/OPT) | 30 minutes |
| 3 | Reddit post 3 (r/internationalstudents) | 30 minutes |
| 3 | ProductHunt assets (screenshots, copy) | 3 hours |
| 3 | Founder story blog post | 2–3 hours |
| 3 | ProductHunt LAUNCH (Tuesday 4am PST) | Full day |
| 4–8 | Write 10 SEO blog posts (1/week) | 2 hours/week |
| 8+ | University outreach (50 cold emails) | 3 hours to set up |
| 8+ | First university demo call | As they respond |

---

## COST TO LAUNCH

| Item | Cost |
|------|------|
| Hosting (Vercel Hobby) | $0/month |
| Database (Supabase free) | $0/month |
| AI (Groq free tier) | $0/month |
| Email (Resend free) | $0/month |
| Analytics (PostHog free) | $0/month |
| Errors (Sentry free) | $0/month |
| Uptime (Better Uptime free) | $0/month |
| Domain | ~$12/year |
| **Total before first paying user** | **~$1/month** |

---

## THE NORTH STAR METRICS

Track these weekly in PostHog:

| Metric | Target by Month 3 |
|--------|------------------|
| Signups/week | 100+ |
| Week-1 retention (users who return) | >40% |
| Profile completion rate (OPT set up) | >60% |
| Premium conversion rate | >8% |
| MRR | $1,000+ |
| University demos booked | 3+ |

---

*Last updated: April 2026 · Generated by VisaBuddy startup team analysis*
