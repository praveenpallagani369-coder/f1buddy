# F1Buddy - International Student Life Manager

> This file is the single source of truth for architecture, conventions, security,
> and development guidelines. Claude Code MUST follow these rules exactly.

---

## Project Overview

**F1Buddy** is a compliance and life management app for F-1 visa international
students in the US. It tracks visa deadlines, OPT employment reporting, tax
filing status (1040-NR), days-outside-US counting, document storage, and SEVIS
compliance — replacing scattered emails, spreadsheets, and anxiety with a
single dashboard. Built for the 1.1M F-1 students who risk deportation over
missed deadlines.

---

## Cost Philosophy

> **$0 forever until you choose to scale.** Every tool, API, and service in
> this stack is completely FREE. There is NO paid hosting cost. Vercel Hobby
> tier hosts the app for free. Supabase replaces 3 separate services (DB +
> Auth + Storage) with one generous free tier. You pay nothing until you earn.

### Free Tier Budget Tracker

| Service              | Free Tier Limit                        | Cost if Exceeded       |
| -------------------- | -------------------------------------- | ---------------------- |
| Supabase (DB+Auth+Storage) | 500 MB DB, 1 GB storage, 50K MAU auth, unlimited API | Pro $25/mo |
| Groq API (LLM)       | 30 RPM, 14.4K req/day, 6K tokens/min  | Pay-as-you-go          |
| Vercel (hosting)     | Unlimited sites, 100 GB bandwidth     | Pro $20/mo             |
| GitHub Actions       | 2,000 min/mo (private)                | $0.008/min             |
| Sentry               | 5K errors/month                       | $26/mo (Team)          |
| PostHog              | 1M events/month                       | Pay-as-you-go          |
| Resend (email)       | 100 emails/day, 3K/month              | $20/mo (Pro)           |
| Stripe               | $0 until first transaction            | 2.9% + $0.30/txn      |
| Domain               | f1buddy.vercel.app (free subdomain)   | Custom domain ~$10/yr  |

---

## Tech Stack

| Layer            | Technology                                       | Cost    |
| ---------------- | ------------------------------------------------ | ------- |
| Frontend         | Next.js 14 (App Router), TypeScript, Tailwind CSS | FREE    |
| State Management | Zustand (client), TanStack Query (server)        | FREE    |
| UI Components    | shadcn/ui + Radix primitives                     | FREE    |
| Backend API      | Next.js Route Handlers (API routes)              | FREE    |
| Database         | Supabase PostgreSQL (500 MB free, unlimited API) | FREE    |
| ORM              | Drizzle ORM (type-safe, migration-friendly)      | FREE    |
| Auth             | Supabase Auth (50K MAU free, Google+GitHub+Email)| FREE    |
| AI/LLM           | Groq API (Llama 3.3 70B — 30 RPM, 14.4K req/day)| FREE    |
| Payments         | Stripe ($0 until first sale)                     | FREE*   |
| Email            | Resend (100/day free) + React Email templates    | FREE    |
| File Storage     | Supabase Storage (1 GB free, RLS on files)       | FREE    |
| Hosting          | Vercel Hobby (free, built for Next.js)           | FREE    |
| Testing          | Vitest (unit), Playwright (e2e), MSW (mocking)   | FREE    |
| CI/CD            | GitHub Actions (2000 min/mo free)                | FREE    |
| Monitoring       | Sentry free tier (5K errors/mo)                  | FREE    |
| Analytics        | PostHog (1M events/mo free)                      | FREE    |
| DNS/SSL          | Vercel (automatic SSL, free subdomain)           | FREE    |
|                  |                                                  |         |
| **TOTAL**        | **Everything above**                             | **$0**  |

---

## Project Structure

```
f1buddy/
├── CLAUDE.md                    # THIS FILE - project rules
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, register, forgot-password
│   │   ├── (dashboard)/         # Authenticated pages
│   │   │   ├── compliance/      # Main compliance dashboard
│   │   │   ├── deadlines/       # All deadlines list + calendar view
│   │   │   ├── opt/             # OPT employment tracker
│   │   │   ├── travel/          # Days-outside-US tracker + trip log
│   │   │   ├── documents/       # Document vault (upload, view, expiry)
│   │   │   ├── tax/             # Tax filing status + guide
│   │   │   ├── community/       # Q&A knowledge base
│   │   │   ├── profile/         # Student profile + visa info
│   │   │   └── settings/        # Account, notifications, billing
│   │   ├── api/
│   │   │   ├── auth/            # Auth endpoints
│   │   │   ├── compliance/      # Deadline CRUD + status
│   │   │   ├── opt/             # Employment records CRUD
│   │   │   ├── travel/          # Travel records CRUD
│   │   │   ├── documents/       # Upload, list, delete
│   │   │   ├── tax/             # Tax status + calculation
│   │   │   ├── notifications/   # Notification endpoints
│   │   │   ├── community/       # Posts + answers CRUD
│   │   │   ├── ai/              # Groq-powered assistant
│   │   │   ├── payments/        # Stripe webhooks + checkout
│   │   │   └── admin/           # University admin endpoints
│   │   ├── layout.tsx
│   │   └── page.tsx             # Landing page
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── compliance/          # Dashboard widgets, status cards
│   │   ├── deadlines/           # Timeline, calendar, countdown
│   │   ├── opt/                 # Employment cards, unemployment counter
│   │   ├── travel/              # Trip log, days counter, map
│   │   ├── documents/           # Upload zone, document cards, viewer
│   │   ├── tax/                 # Tax wizard, treaty selector
│   │   ├── community/           # Post cards, answer forms
│   │   ├── layout/              # Shell, sidebar, navbar, footer
│   │   └── shared/              # Reusable: CountdownBadge, StatusChip, etc.
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts        # All table definitions
│   │   │   ├── migrations/      # SQL migration files
│   │   │   └── queries/         # Reusable query functions
│   │   ├── ai/
│   │   │   ├── prompts.ts       # All Groq/Llama prompts
│   │   │   ├── assistant.ts     # Immigration Q&A logic
│   │   │   └── document-parser.ts # OCR/text extraction
│   │   ├── supabase/            # Supabase client, auth helpers, storage
│   │   ├── auth/                # Auth config & helpers (wraps Supabase Auth)
│   │   ├── stripe/              # Payment logic
│   │   ├── email/               # Templates + sending (Nodemailer)
│   │   ├── immigration/         # F-1 rules engine (deadlines, calculations)
│   │   ├── validators/          # Zod schemas for all inputs
│   │   └── utils/               # Pure utility functions
│   ├── hooks/                   # Custom React hooks
│   ├── stores/                  # Zustand stores (by feature)
│   ├── types/                   # Shared TypeScript types
│   └── styles/                  # Global styles, Tailwind config
├── public/                      # Static assets
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Feature List

### Core Features (MVP)

#### F1: User Authentication & Student Profile
- Sign up / login via Google, GitHub, or email magic link
- Student profile: name, avatar, school name, program (degree + major)
- Visa details: visa type (F-1/J-1), SEVIS ID, program start/end dates
- DSO contact info (name, email, phone) for quick access
- I-94 admission number, passport number (encrypted at rest)
- Travel preferences: home country, nearest US port of entry
- Onboarding wizard that collects all info on first login

#### F2: Compliance Dashboard (Home Screen)
- Traffic-light status overview: GREEN (all clear), YELLOW (action needed soon), RED (overdue/urgent)
- Top section: most urgent deadline with countdown timer
- Cards for each compliance area:
  - OPT unemployment days remaining (90-day or 150-day limit)
  - Days outside US this calendar year (with 5-month rule warning)
  - Next SEVIS reporting deadline
  - Document expiration alerts (EAD, passport, visa stamp, I-20)
  - Tax filing status for current year
- Quick actions: "Log a trip", "Add employer", "Upload document"
- Timeline view of all upcoming deadlines (30/60/90 day horizon)

#### F3: OPT Employment Tracker
- Log employers: company name, start date, end date, employment type (full-time, part-time, volunteer)
- Automatic 90-day unemployment counter (starts from EAD start date)
  - Pre-completion OPT: 90-day limit
  - Post-completion OPT: 90-day limit
  - STEM OPT extension: 150-day limit
- Visual progress bar showing unemployment days used vs remaining
- Employer reporting reminder: "Report new employer to DSO within 10 days"
- EAD card details: category (C3B, C3C), start/end dates
- Employment gap detection and alerts
- E-Verify employer validation reminder (STEM OPT requirement)

#### F4: Travel Tracker (Days Outside US)
- Log each trip: departure date, return date, destination, purpose
- Automatic days-outside-US counter per calendar year
- 5-month rule warning: "If you're outside the US for 5+ months, your SEVIS record may be terminated"
- Re-entry document checklist generator:
  - Valid passport (6+ months validity)
  - Valid F-1 visa stamp (or auto-revalidation eligibility check)
  - Valid I-20 with travel signature (< 1 year old, or < 6 months for OPT)
  - EAD card (if on OPT)
  - Recent pay stubs / employment letter
  - Unofficial transcript
- Trip history with total days outside per year
- Warning when approaching 330-day threshold for tax purposes (substantial presence)

#### F5: Document Vault
- Upload and store: I-20 (all pages), EAD card, passport, visa stamp, I-94, SSN card, offer letters, pay stubs, tax returns
- Document categories with icons and color coding
- Expiration date tracking with alerts at 90/60/30/14/7 days before
- Secure storage on Supabase Storage (encrypted, RLS-protected)
- Quick-share: generate temporary secure link for DSO or employer
- Document version history (new I-20 replaces old but keeps history)
- Mobile-friendly camera upload for scanning documents
- File size limit: 10MB per document, supported formats: PDF, JPG, PNG

#### F6: Deadline Alerts & Notifications
- Smart notification system:
  - Email alerts at 30, 14, 7, 3, 1 days before any deadline
  - In-app notification center with read/unread status
  - Daily morning digest email: "Here's what needs your attention today"
- Deadline types tracked:
  - OPT application window (recommend applying 90 days before program end)
  - STEM OPT extension deadline (must apply before OPT expires)
  - I-20 travel signature renewal
  - Passport renewal
  - Visa stamp expiration (for travel planning)
  - Annual tax filing (April 15 + Form 8843)
  - SEVIS address update (10 days after any move)
  - OPT employer reporting (10 days after change)
  - EAD expiration
  - Program end date
- Custom deadline creation (user-defined)

### Enhanced Features (Post-MVP)

#### F7: Tax Filing Assistant
- Substantial Presence Test calculator (count days over 3 years)
- Automatic determination: 1040-NR (nonresident) vs 1040 (resident)
- Tax treaty benefit lookup by country (with article numbers)
- Form 8843 filing reminder (even if no income)
- State tax filing guidance by state
- ITIN vs SSN guidance
- Links to free filing resources (Sprintax, GLACIER Tax Prep)
- Year-over-year tax status history

#### F8: Community Q&A
- Anonymous posting option (immigration topics are sensitive)
- Categories: OPT, CPT, Travel, Tax, Housing, Employment, Visa Renewal
- Upvote/downvote answers
- "Verified" badge for answers confirmed by immigration advisors
- Search across all posts
- AI-suggested similar questions before posting
- Moderation system (report, flag, admin review)

#### F9: University Admin Portal (B2B)
- Dashboard for ISSS offices to monitor student compliance status
- Batch deadline reminders for all enrolled students
- Aggregate statistics: % students with expiring documents, OPT employment rates
- Individual student view (with consent)
- Export compliance reports
- White-label option with university branding
- Pricing: $15-25/student/year

#### F10: AI Immigration Assistant
- Groq/Llama-powered Q&A about F-1 regulations
- Heavy disclaimers: "This is informational only, not legal advice. Consult your DSO."
- Context-aware: uses student's profile to give relevant answers
- Example queries: "Can I work off-campus?", "What happens if my OPT expires before my STEM extension is approved?"
- Sources referenced for every answer (CFR citations, USCIS policy memos)
- Conversation history per user

#### F11: CPT/OPT Application Guide
- Step-by-step wizard for each application type
- Document checklist with upload status
- Timeline estimator (processing times from USCIS)
- Common mistakes to avoid
- DSO appointment scheduling link

#### F12: Offline Mode (PWA)
- Download compliance dashboard + deadlines for offline access
- Service worker caching
- Sync when back online
- Critical for students traveling internationally

---

## Architecture Rules

### General Principles
- **Server Components by default** — only use `"use client"` when interactivity is needed
- **Colocation** — keep related files together (component + hook + test + types)
- **No barrel exports** — import directly from the file, not via index.ts
- **Composition over inheritance** — use React composition patterns
- **Single responsibility** — one component does one thing
- **No prop drilling beyond 2 levels** — use Zustand or Context

### API Design
- All API routes live in `src/app/api/`
- RESTful conventions: GET (list/read), POST (create), PUT (full update), PATCH (partial), DELETE
- Every endpoint returns consistent shape:
  ```ts
  // Success
  { success: true, data: T }
  // Error
  { success: false, error: { code: string, message: string } }
  ```
- Paginated lists: `{ data: T[], pagination: { page, pageSize, total, totalPages } }`
- Zod validation on EVERY endpoint — no exceptions
- Rate limit all public endpoints (in-memory `rate-limiter-flexible`)
- API versioning not needed initially

### Database Rules (Supabase + Drizzle)
- All schema in `src/lib/db/schema.ts` — Drizzle manages migrations
- Supabase provides the Postgres instance — connect via `DATABASE_URL`
- Use Supabase Row-Level Security (RLS) as a second layer of access control
- Every table has: `id` (UUID), `createdAt`, `updatedAt`
- `ON DELETE CASCADE` for child records
- Indexes on all WHERE/JOIN columns
- Transactions for multi-table writes
- Soft delete for user-facing records (`deletedAt` column)
- All queries in `src/lib/db/queries/` — components never import drizzle directly
- Use Supabase Storage for document uploads (RLS protects files per user)
- Use Supabase Auth for session management — no separate auth library needed

### Immigration Rules Engine
- All F-1 rules codified in `src/lib/immigration/`
- Rules must reference CFR/USCIS source in code comments
- Date calculations must handle timezone correctly (student's local time)
- 90-day unemployment counter: business days only, excludes time before EAD start
- 5-month travel rule: calendar months, not days
- Substantial Presence Test: use IRS formula exactly (current year full + 1/3 prior + 1/6 two years prior)

### State Management
- **Server state**: TanStack Query — never store API data in Zustand
- **Client state**: Zustand (UI state, wizard steps)
- **URL state**: Next.js searchParams (filters, tabs, pagination)
- **Form state**: React Hook Form + Zod resolver
- Zustand stores split by feature

### Component Rules
- Max 150 lines per component file
- All components typed — no `any`
- Loading: Suspense boundaries + skeletons
- Error: Error Boundaries with fallback UI
- Empty states: helpful messaging with call-to-action

---

## AI / Groq API Rules

- All prompts in `src/lib/ai/prompts.ts` — never inline
- Use **Groq API** with **Llama 3.3 70B** model (best quality on Groq free tier)
- Groq SDK: `groq-sdk` (npm) — OpenAI-compatible interface
- JSON mode: `response_format: { type: "json_object" }`
- Temperature 0.3 for immigration Q&A (accuracy over creativity)
- Validate all AI output against Zod schema before storing
- Retry with exponential backoff (max 3 retries)
- Stream responses for real-time chat UI (Groq supports streaming)

### Groq Free Tier Limits
- **30 requests per minute** (RPM)
- **14,400 requests per day**
- **6,000 tokens per minute** (TPM) for Llama 3.3 70B
- **Fallback model**: Llama 3.1 8B (higher rate limits if 70B is throttled)
- If rate-limited → auto-fallback to 8B → if still limited → queue + retry
- **Free tier math**: 14.4K req/day supports ~200-300 Q&A sessions/day

### Why Groq over Gemini
- Groq has a reliable, documented free tier (Gemini's has become inconsistent/restricted)
- Groq inference is 10-20x faster than competitors (custom LPU hardware)
- Llama 3.3 70B quality is competitive with GPT-4o for structured tasks
- OpenAI-compatible SDK — easy to swap models later if needed

### AI Use Cases
1. **Document text extraction**: Parse uploaded I-20, EAD photos for key dates
2. **Deadline interpretation**: "When should I apply for STEM OPT?" based on profile
3. **Tax situation analysis**: Determine filing status from days-present data
4. **Immigration Q&A**: Answer common F-1 questions with CFR citations
5. **Smart reminders**: Context-aware push ("You're traveling next week — is your I-20 travel signature current?")

### CRITICAL: AI Disclaimers
- Every AI response MUST include: "This is informational only and not legal advice. Immigration rules change frequently. Always consult your DSO or an immigration attorney for your specific situation."
- Never generate advice about unlawful employment or visa fraud
- Never store AI conversation content longer than 90 days

---

## Security Rules (NON-NEGOTIABLE)

### Authentication & Authorization
- **Supabase Auth** handles all auth — never roll custom auth
- Supabase provides Google, GitHub, and Magic Link (email) out of the box
- Every API route checks `supabase.auth.getUser()` — deny by default
- Middleware protects `(dashboard)` route group via Supabase session
- RBAC roles stored in `users.role` column: `student`, `premium`, `university_admin`, `admin`
- Use Supabase RLS (Row-Level Security) as a database-level access control layer
- Server-side permission checks only — never trust client
- Supabase manages httpOnly cookies, refresh token rotation automatically
- Account lockout after 5 failed attempts (15 min cooldown) — custom logic

### Immigration Data Protection (CRITICAL)
- **SEVIS IDs**: encrypted at rest using AES-256 (column-level encryption)
- **Passport numbers**: encrypted at rest
- **I-94 numbers**: encrypted at rest
- **Document files**: encrypted at rest on Supabase Storage
- **NEVER log**: SEVIS ID, passport number, SSN, I-94 number — not even in dev
- All PII viewable only by the student themselves (no admin access to raw PII)
- Data residency: US-only servers (immigration data should not cross borders)

### Input Validation
- Zod on ALL inputs at API boundary
- Sanitize HTML in user content (DOMPurify)
- File upload: type (PDF/JPG/PNG only), size (max 10MB), virus scan consideration
- Reject unexpected fields (`.strict()` on Zod schemas)

### Data Protection
- Parameterized queries only (Drizzle handles this)
- No sensitive data in URLs or query params
- No secrets in code — all in `.env.local`
- GDPR: data export + account deletion (with 30-day grace period)
- FERPA compliance for university admin portal
- No logging of PII — even in dev

### API Security
- CORS: production domain + localhost only
- CSRF: Supabase Auth built-in (uses PKCE flow)
- Rate limiting: 100 req/min authenticated, 20 req/min unauthenticated
- Request size: 10MB max (for document uploads)
- Stripe webhook signature verification
- No internal error details in responses

### Files That Must NEVER Be Committed
```
.env
.env.local
.env.production
*.pem
*.key
node_modules/
.next/
credentials.json
service-account.json
```

---

## Database Schema

```
users
├── id (UUID, PK)
├── email (unique, not null)
├── name, avatar_url
├── visa_type (enum: F1, J1, M1)
├── sevis_id_encrypted (text, AES-256)
├── i94_number_encrypted (text, AES-256)
├── passport_number_encrypted (text, AES-256)
├── passport_expiry (date)
├── school_name, program_name, degree_level
├── program_start_date, program_end_date
├── dso_name, dso_email, dso_phone
├── home_country, port_of_entry
├── role (enum: student, premium, university_admin, admin)
├── university_id (FK -> universities, nullable)
├── onboarding_completed (boolean, default false)
└── created_at, updated_at, deleted_at

universities (B2B)
├── id (UUID, PK)
├── name, domain, logo_url
├── subscription_type (enum: free, basic, premium)
├── max_students (int)
├── admin_email
└── created_at, updated_at

compliance_deadlines
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── title (text, not null)
├── description (text)
├── deadline_date (date, not null)
├── category (enum: opt, visa, travel, tax, sevis, document, custom)
├── severity (enum: critical, warning, info)
├── status (enum: pending, acknowledged, completed, overdue)
├── is_system_generated (boolean)
├── reminder_30d_sent, reminder_14d_sent, reminder_7d_sent, reminder_3d_sent, reminder_1d_sent (boolean)
└── created_at, updated_at

opt_employment
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── employer_name (text, not null)
├── employer_ein (text, nullable)
├── position_title (text)
├── start_date (date, not null)
├── end_date (date, nullable)
├── is_current (boolean)
├── employment_type (enum: full_time, part_time, volunteer, unpaid_intern)
├── is_stem_related (boolean)
├── e_verify_employer (boolean)
├── reported_to_school (boolean, default false)
├── reported_date (date, nullable)
└── created_at, updated_at

opt_status
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE, unique)
├── opt_type (enum: pre_completion, post_completion, stem_extension)
├── ead_category (text) -- e.g., "C3B", "C3C"
├── ead_start_date, ead_end_date (date)
├── unemployment_days_used (int, default 0)
├── unemployment_limit (int) -- 90 or 150
├── application_date, approval_date (date, nullable)
└── created_at, updated_at

travel_records
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── departure_date (date, not null)
├── return_date (date, nullable) -- null if currently abroad
├── destination_country (text, not null)
├── purpose (enum: vacation, family, conference, interview, other)
├── days_outside (int, computed)
├── documents_carried (jsonb) -- checklist of what they took
├── notes (text, nullable)
└── created_at, updated_at

documents
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── doc_type (enum: i20, ead, passport, visa_stamp, i94, ssn_card, offer_letter, pay_stub, tax_return, transcript, other)
├── file_url (text, not null) -- R2 URL
├── file_name (text)
├── file_size_bytes (int)
├── mime_type (text)
├── expiration_date (date, nullable)
├── is_current_version (boolean, default true)
├── previous_version_id (FK -> documents, nullable)
├── notes (text, nullable)
├── ai_extracted_data (jsonb, nullable) -- parsed fields from document
└── created_at, updated_at, deleted_at

tax_records
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── tax_year (int, not null)
├── filing_status (enum: nonresident_1040nr, resident_1040, exempt_treaty, not_required)
├── treaty_country (text, nullable)
├── treaty_article (text, nullable)
├── substantial_presence_days (int)
├── form_8843_filed (boolean, default false)
├── federal_filed (boolean, default false)
├── state_filed (boolean, default false)
├── state_name (text, nullable)
├── filed_date (date, nullable)
├── notes (text, nullable)
└── created_at, updated_at

notifications
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── type (enum: deadline_reminder, document_expiry, opt_alert, travel_warning, system, tax_reminder)
├── title (text, not null)
├── message (text, not null)
├── link (text, nullable) -- deep link into app
├── is_read (boolean, default false)
├── is_email_sent (boolean, default false)
└── created_at

community_posts
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE)
├── title (text, not null)
├── body (text, not null)
├── category (enum: opt, cpt, travel, tax, housing, employment, visa_renewal, general)
├── is_anonymous (boolean, default false)
├── upvotes (int, default 0)
├── answer_count (int, default 0)
├── is_pinned (boolean, default false)
└── created_at, updated_at, deleted_at

community_answers
├── id (UUID, PK)
├── post_id (FK -> community_posts, CASCADE)
├── user_id (FK -> users, CASCADE)
├── body (text, not null)
├── is_verified (boolean, default false) -- verified by admin/DSO
├── is_accepted (boolean, default false)
├── upvotes (int, default 0)
└── created_at, updated_at

subscriptions
├── id (UUID, PK)
├── user_id (FK -> users, CASCADE, unique)
├── stripe_customer_id (text)
├── stripe_subscription_id (text)
├── plan (enum: free, premium, university)
├── status (enum: active, canceled, past_due, trialing)
├── current_period_start, current_period_end (timestamp)
└── created_at, updated_at
```

### Key Indexes
- `users.email` (unique)
- `compliance_deadlines.user_id` + `deadline_date`
- `compliance_deadlines.status` + `deadline_date`
- `opt_employment.user_id` + `is_current`
- `travel_records.user_id` + `departure_date`
- `documents.user_id` + `doc_type`
- `notifications.user_id` + `is_read`
- `community_posts.category` + `created_at`

---

## API Contract / Data Shapes

```ts
// Compliance Dashboard
type ComplianceDashboard = {
  overallStatus: "green" | "yellow" | "red";
  urgentDeadline: Deadline | null;
  optStatus: {
    unemploymentDaysUsed: number;
    unemploymentLimit: number;
    daysRemaining: number;
    currentEmployer: string | null;
    eadExpiryDate: string;
  } | null;
  travelStatus: {
    daysOutsideThisYear: number;
    fiveMonthWarning: boolean;
    currentlyAbroad: boolean;
  };
  expiringDocuments: {
    docType: string;
    expirationDate: string;
    daysUntilExpiry: number;
  }[];
  taxStatus: {
    year: number;
    filingStatus: string;
    filed: boolean;
    dueDate: string;
  };
  upcomingDeadlines: Deadline[];
};

// Deadline
type Deadline = {
  id: string;
  title: string;
  description: string;
  deadlineDate: string;
  category: "opt" | "visa" | "travel" | "tax" | "sevis" | "document" | "custom";
  severity: "critical" | "warning" | "info";
  status: "pending" | "acknowledged" | "completed" | "overdue";
  daysRemaining: number;
};

// OPT Employment Record
type OPTEmployment = {
  id: string;
  employerName: string;
  positionTitle: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  employmentType: "full_time" | "part_time" | "volunteer" | "unpaid_intern";
  isStemRelated: boolean;
  eVerifyEmployer: boolean;
  reportedToSchool: boolean;
};

// Travel Record
type TravelRecord = {
  id: string;
  departureDate: string;
  returnDate: string | null;
  destinationCountry: string;
  purpose: "vacation" | "family" | "conference" | "interview" | "other";
  daysOutside: number;
  documentsCarried: string[];
};

// Document
type Document = {
  id: string;
  docType: string;
  fileName: string;
  fileSizeBytes: number;
  expirationDate: string | null;
  daysUntilExpiry: number | null;
  uploadedAt: string;
  aiExtractedData: Record<string, string> | null;
};

// AI Assistant Response
type AIAssistantResponse = {
  answer: string;
  sources: { title: string; reference: string }[];
  disclaimer: string; // ALWAYS included
  confidence: "high" | "medium" | "low";
  relatedDeadlines: Deadline[];
};
```

---

## Testing Rules

### Unit Tests (Vitest)
- Every file in `lib/` has a corresponding `.test.ts`
- Test immigration calculations thoroughly (90-day counter, substantial presence, 5-month rule)
- Test date edge cases: leap years, timezone boundaries, DST transitions
- Mock Groq API, Stripe, Supabase — never call real APIs in tests
- Minimum 90% coverage for `lib/immigration/` (these calculations are critical)

### Integration Tests
- Test API routes with real database (test database)
- Test auth flows end-to-end
- Test payment webhooks with Stripe test fixtures
- Test document upload/download flow
- Test notification generation from deadline triggers

### E2E Tests (Playwright)
- Critical flows:
  - Sign up -> Onboarding wizard -> Dashboard
  - Add employer -> See unemployment counter update
  - Log trip -> See days-outside counter update
  - Upload document -> See expiration alert
  - Receive and acknowledge deadline notification
- Test mobile viewport (375px) and desktop (1440px)

### Test File Naming
- Unit: `*.test.ts` next to source
- Integration: `tests/integration/*.test.ts`
- E2E: `tests/e2e/*.spec.ts`

---

## Performance Rules

- Images: `next/image` with WebP, lazy loading, blur placeholder
- Fonts: `next/font` — no external loading
- Bundle: initial JS under 200KB gzipped
- API: paginate lists (default 20, max 100)
- DB: connection pooling via Supabase (built-in PgBouncer)
- Caching:
  - Static pages: ISR with 1-hour revalidation
  - User data: TanStack Query with 5-min stale time
  - Immigration rules: hardcoded (not fetched) — they change rarely
  - AI responses: cache in DB per user
- Lazy load below-fold components with `next/dynamic`
- Document thumbnails: generate on upload, serve small previews

---

## Code Style & Conventions

### Naming
- Components: PascalCase (`DeadlineCard.tsx`)
- Hooks: camelCase with `use` prefix (`useUnemploymentCounter.ts`)
- Utilities: camelCase (`calculateSubstantialPresence.ts`)
- Types: PascalCase, no `I` prefix (`Student`, not `IStudent`)
- Constants: UPPER_SNAKE_CASE (`MAX_UNEMPLOYMENT_DAYS`)
- DB columns: snake_case (`sevis_id_encrypted`)
- API routes: kebab-case (`/api/opt/employment-records`)
- Enums: PascalCase members (`VisaType.F1`)

### TypeScript
- Strict mode — no `any`
- `type` for data shapes, `interface` for contracts
- `unknown` over `any` when type is unknown
- Discriminated unions for state

### Imports
- Order: React/Next -> external libs -> internal absolute -> relative
- `@/` alias for `src/`
- No circular imports

### Error Handling
- Typed error classes: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`
- API: catch in wrapper, return consistent error shape
- Client: user-friendly messages, technical details to Sentry
- Never swallow errors silently

### Git Conventions
- Branches: `feature/opt-tracker`, `fix/deadline-counter`, `chore/deps`
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- PR size: max 400 lines
- Squash merge to main

---

## Environment Variables

```env
# Supabase (DB + Auth + Storage — ALL FREE)
NEXT_PUBLIC_SUPABASE_URL=           # Project URL from Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=          # Server-only, never expose to client
DATABASE_URL=                       # Direct Postgres connection for Drizzle migrations

# AI (Groq — FREE tier)
GROQ_API_KEY=                       # console.groq.com → API Keys

# Encryption (for SEVIS ID, passport, etc.)
ENCRYPTION_KEY=                     # openssl rand -hex 32
ENCRYPTION_IV=                      # openssl rand -hex 16

# Payments (Stripe — FREE until first sale)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email (Resend — FREE: 100/day)
RESEND_API_KEY=                     # resend.com → API Keys

# Monitoring (Sentry — FREE: 5K/mo)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Analytics (PostHog — FREE: 1M events/mo)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### How to Get Each Key

| Key | Where | Cost |
|-----|-------|------|
| Supabase (DB+Auth+Storage) | supabase.com → New Project → Settings → API | FREE |
| Google OAuth (for Supabase) | console.cloud.google.com → Credentials, then add to Supabase Auth providers | FREE |
| GitHub OAuth (for Supabase) | github.com/settings/developers, then add to Supabase Auth providers | FREE |
| Groq API | console.groq.com → API Keys | FREE |
| Encryption keys | `openssl rand -hex 32` (run locally) | FREE |
| Stripe | dashboard.stripe.com → Developers → API Keys | FREE* |
| Resend | resend.com → Sign Up → API Keys | FREE |
| Sentry | sentry.io → Create Project (Developer plan) | FREE |
| PostHog | posthog.com → Sign Up (free plan) | FREE |

---

## Development Workflow

### Setup
```bash
git clone <repo>
cd f1buddy
cp .env.example .env.local    # Fill in your keys
npm install
npm run db:push               # Push schema to dev DB
npm run db:seed               # Seed sample deadlines + rules
npm run dev                   # localhost:3000
```

### Daily Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test         # Unit tests
npm run test:watch   # Watch mode
npm run test:e2e     # Playwright
npm run lint         # ESLint + Prettier
npm run lint:fix     # Auto-fix
npm run typecheck    # TypeScript strict
npm run db:generate  # Generate migration
npm run db:migrate   # Run migrations
npm run db:studio    # Drizzle Studio GUI
```

### Pre-Commit Checklist
1. `npm run typecheck` passes
2. `npm run lint` passes
3. `npm run test` passes
4. No `console.log` in code
5. No `any` types
6. No `.env` files staged
7. No PII in test fixtures

---

## Deployment (Vercel — FREE)

### Setup (~$0/mo)

| Component | Service | Cost |
|-----------|---------|------|
| App Hosting | Vercel Hobby (auto-deploy from GitHub) | FREE |
| Database | Supabase free tier | FREE |
| Auth | Supabase Auth | FREE |
| Storage | Supabase Storage | FREE |
| SSL | Vercel (automatic) | FREE |
| CDN | Vercel Edge Network (automatic) | FREE |
| Domain | f1buddy.vercel.app | FREE |
| **TOTAL** | | **$0/mo** |

### When to upgrade (future)
- Vercel Pro ($20/mo): when you need commercial use license or >100GB bandwidth
- Supabase Pro ($25/mo): when you hit 500MB DB or need daily backups
- Custom domain ($10-15/yr): when you want f1buddy.com

### Deployment Checklist
- [ ] Vercel account connected to GitHub repo
- [ ] All env vars set in Vercel dashboard (Settings → Environment Variables)
- [ ] Supabase production project created (separate from dev)
- [ ] DB migrations run on Supabase production
- [ ] Supabase Auth providers configured (Google, GitHub)
- [ ] Supabase RLS policies applied to all tables
- [ ] Stripe production webhooks set to Vercel URL
- [ ] Sentry source maps uploaded
- [ ] Supabase Storage bucket permissions locked
- [ ] GitHub Actions CI pipeline (lint + test) — Vercel handles CD automatically

---

## FREE vs PAID Summary

### Completely FREE (forever)
- Next.js, React, TypeScript, Tailwind, shadcn/ui — open source
- Drizzle ORM, Zustand, TanStack Query, React Hook Form — open source
- Vitest, Playwright, MSW — open source
- Groq SDK — open source (OpenAI-compatible)
- Google/GitHub OAuth — free forever
- Vercel SSL — automatic and free forever

### FREE Tier (generous limits — $0 total)
- Supabase — 500 MB DB, 1 GB storage, 50K MAU auth, unlimited API
- Groq — 30 RPM, 14.4K req/day, Llama 3.3 70B
- Vercel — unlimited sites, 100 GB bandwidth, auto-deploy
- Resend — 100 emails/day, 3K/month
- Sentry — 5K errors/mo
- PostHog — 1M events/mo
- GitHub Actions — 2,000 min/mo
- Stripe — $0 until first sale

### PAID (Only When You Choose)
- Custom domain — ~$10-15/year (optional, use .vercel.app free)
- Stripe fees — 2.9% + $0.30/txn (only when customers pay you)
- Vercel Pro — $20/mo (only if you need commercial license)
- Supabase Pro — $25/mo (only if you exceed 500MB DB)

---

## Monetization Model

### Free Tier
- Basic deadline tracking (system-generated only)
- 3 document uploads max
- Days-outside counter
- No AI assistant
- No tax helper
- Community read-only

### Premium ($6.99/month or $59.99/year)
- Unlimited document uploads
- AI immigration assistant
- Tax filing assistant + treaty lookup
- OPT employment tracker with full analytics
- Email alerts + daily digest
- Community posting + answers
- Export compliance report PDF
- Priority support

### University License ($15-25/student/year)
- All premium features for students
- Admin dashboard for ISSS office
- Batch compliance monitoring
- Custom branding
- Dedicated support
- API access for integration with school systems

---

## Accessibility (WCAG 2.1 AA)

- All images have alt text
- Color contrast 4.5:1 minimum
- Keyboard navigable
- ARIA labels on icon-only buttons
- Focus trap in modals
- Skip-to-content link
- Responsive 320px to 2560px
- `prefers-reduced-motion` respected
- Screen reader announcements for dynamic changes
- Visible labels on all form inputs
- Right-to-left (RTL) text support (many international students' languages)
