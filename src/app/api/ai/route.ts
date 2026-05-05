import { createClient } from "@/lib/supabase/server";
import { getGroqClient, MODELS, IMMIGRATION_SYSTEM_PROMPT } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/api/cache";
import { ok, UNAUTHORIZED } from "@/lib/api/helpers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { calculateUnemploymentDays } from "@/lib/immigration/rules";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4000;

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(MAX_MESSAGE_LENGTH),
  })).min(1).max(MAX_MESSAGES),
});

interface ProfileData {
  name: string | null;
  school_name: string | null;
  program_name: string | null;
  degree_level: string | null;
  program_end_date: string | null;
  home_country: string | null;
}

interface OPTData {
  opt_type: string | null;
  ead_start_date: string | null;
  ead_end_date: string | null;
  ead_category: string | null;
  unemployment_days_used: number | null;
  unemployment_limit: number | null;
  application_date: string | null;
}

interface EmployerData {
  employer_name: string;
  position_title: string | null;
  e_verify_employer: boolean;
  reported_to_school: boolean;
}

interface DeadlineData {
  title: string;
  deadline_date: string;
  severity: string;
}

interface TravelRecord {
  days_outside: number;
  return_date: string | null;
}

interface DocExpiry {
  doc_type: string;
  expiration_date: string;
}

interface TaxRecord {
  tax_year: number;
  filing_status: string | null;
  federal_filed: boolean;
  form_8843_filed: boolean;
}

const DOC_LABELS: Record<string, string> = {
  i20: "I-20", ead: "EAD Card", passport: "Passport", visa_stamp: "Visa Stamp",
  i94: "I-94", ssn_card: "SSN Card", offer_letter: "Offer Letter",
  pay_stub: "Pay Stub", tax_return: "Tax Return", transcript: "Transcript", other: "Other",
};

function buildProfileContext(
  profile: ProfileData | null,
  opt: OPTData | null,
  employer: EmployerData | null,
  deadlines: DeadlineData[],
  travelRecords: TravelRecord[],
  docsExpiring: DocExpiry[],
  tax: TaxRecord | null,
  /** From calculateUnemploymentDays(opt employment periods); not raw DB column */
  optUnemploymentDaysLive: number,
): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  const lines: string[] = ["=== Student Profile Context ==="];

  if (profile) {
    lines.push(`Name: ${profile.name ?? "Unknown"}`);
    lines.push(`School: ${profile.school_name ?? "Unknown"}, Program: ${profile.program_name ?? "Unknown"} (${profile.degree_level ?? "Unknown"})`);
    if (profile.program_end_date) {
      const days = differenceInCalendarDays(parseISO(profile.program_end_date), today);
      lines.push(`Program End Date: ${profile.program_end_date} (${days > 0 ? `${days} days remaining` : "ended"})`);
    }
    if (profile.home_country) lines.push(`Home Country: ${profile.home_country}`);
  }

  if (opt) {
    lines.push(`\nOPT Status: ${opt.opt_type?.replace(/_/g, " ") ?? "None"}`);
    if (opt.ead_start_date) lines.push(`EAD: ${opt.ead_start_date} to ${opt.ead_end_date} (Category: ${opt.ead_category ?? "Unknown"})`);
    if (opt.ead_end_date) {
      const daysLeft = differenceInCalendarDays(parseISO(opt.ead_end_date), today);
      lines.push(`EAD days remaining: ${daysLeft}`);
    }
    const unemployLimit = opt.unemployment_limit ?? 90;
    lines.push(`Unemployment days used: ${optUnemploymentDaysLive}/${unemployLimit} (${unemployLimit - optUnemploymentDaysLive} remaining)`);
    if (opt.application_date && !opt.ead_start_date) lines.push(`OPT application filed: ${opt.application_date} — still pending`);
  } else {
    lines.push("\nOPT Status: Not on OPT");
  }

  if (employer) {
    lines.push(`\nCurrent Employer: ${employer.employer_name} — ${employer.position_title ?? "Unknown role"}`);
    lines.push(`E-Verify: ${employer.e_verify_employer ? "Yes" : "No"}, Reported to DSO: ${employer.reported_to_school ? "Yes" : "No"}`);
  }

  // Travel context
  const daysAbroadThisYear = travelRecords.reduce((sum, r) => sum + (r.days_outside ?? 0), 0);
  const currentlyAbroad = travelRecords.some(r => !r.return_date);
  if (daysAbroadThisYear > 0 || currentlyAbroad) {
    lines.push(`\nTravel (${currentYear}): ${daysAbroadThisYear} days outside US${currentlyAbroad ? " (currently abroad)" : ""}`);
    if (daysAbroadThisYear >= 120) lines.push(`  ⚠️ Approaching 5-month travel limit`);
  }

  // Expiring documents
  if (docsExpiring.length > 0) {
    lines.push(`\nDocuments expiring within 60 days:`);
    docsExpiring.forEach(d => {
      const days = differenceInCalendarDays(parseISO(d.expiration_date), today);
      lines.push(`  - ${DOC_LABELS[d.doc_type] ?? d.doc_type}: ${days} days (${d.expiration_date})`);
    });
  }

  // Tax context
  if (tax) {
    const filed = tax.federal_filed ? "Federal filed" : "Federal NOT filed";
    const f8843 = tax.form_8843_filed ? "Form 8843 filed" : "Form 8843 not filed";
    lines.push(`\nTax ${tax.tax_year}: ${tax.filing_status?.replace(/_/g, " ") ?? "Unknown status"} — ${filed}, ${f8843}`);
  } else {
    lines.push(`\nTax ${currentYear}: No tax record on file`);
  }

  if (deadlines.length > 0) {
    lines.push(`\nUpcoming Deadlines (next ${Math.min(deadlines.length, 5)}):`);
    deadlines.slice(0, 5).forEach((d) => {
      if (!d.deadline_date || !d.title) return;
      const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
      if (isNaN(days)) return;
      lines.push(`  - ${d.title}: ${days === 0 ? "TODAY" : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`} [${d.severity}]`);
    });
  }

  lines.push("\n=== End of student context. Use this to give personalized, specific answers. Do not reveal raw field names. ===");
  return lines.join("\n");
}

// GET — load stored conversation history
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED();

  const { data } = await supabase
    .from("ai_conversations")
    .select("messages, updated_at")
    .eq("user_id", user.id)
    .single();

  return ok({ messages: data?.messages ?? [], updatedAt: data?.updated_at ?? null });
}

// DELETE — clear conversation history
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED();

  await supabase.from("ai_conversations").delete().eq("user_id", user.id);
  return ok({ cleared: true });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
  }

  const { allowed } = await rateLimitDB(supabase, `ai:${user.id}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ success: false, error: { code: "RATE_LIMIT", message: "Too many requests. Please wait a moment." } }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Invalid request body" } }, { status: 400 });
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const sixtyDaysOut = format(new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const [profileRes, optRes, employmentRes, deadlinesRes, travelRes, docsExpiringRes, taxRes] = await Promise.all([
    supabase.from("users").select("name,school_name,program_name,degree_level,program_end_date,home_country").eq("id", user.id).single(),
    supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
    supabase.from("opt_employment").select("employer_name,position_title,e_verify_employer,reported_to_school,is_current,start_date,end_date").eq("user_id", user.id).order("start_date"),
    supabase.from("compliance_deadlines").select("title,deadline_date,severity").eq("user_id", user.id).eq("status", "pending").order("deadline_date").limit(5),
    supabase.from("travel_records").select("days_outside,return_date").eq("user_id", user.id).gte("departure_date", `${currentYear}-01-01`),
    supabase.from("documents").select("doc_type,expiration_date").eq("user_id", user.id).is("deleted_at", null).not("expiration_date", "is", null).lte("expiration_date", sixtyDaysOut).gte("expiration_date", todayStr).order("expiration_date"),
    supabase.from("tax_records").select("tax_year,filing_status,federal_filed,form_8843_filed").eq("user_id", user.id).eq("tax_year", currentYear).single(),
  ]);

  const employmentRows = employmentRes.data ?? [];
  const currentEmployerRow = employmentRows.find((e: { is_current: boolean }) => e.is_current);
  const employerForContext: EmployerData | null = currentEmployerRow
    ? {
        employer_name: currentEmployerRow.employer_name,
        position_title: currentEmployerRow.position_title,
        e_verify_employer: currentEmployerRow.e_verify_employer,
        reported_to_school: currentEmployerRow.reported_to_school,
      }
    : null;

  const optRow = optRes.data;
  const optUnemploymentDaysLive =
    optRow?.ead_start_date
      ? calculateUnemploymentDays(
          optRow.ead_start_date,
          employmentRows.map((e: { start_date: string; end_date: string | null }) => ({
            startDate: e.start_date,
            endDate: e.end_date,
          })),
          today
        )
      : (optRow?.unemployment_days_used ?? 0);

  const profileContext = buildProfileContext(
    profileRes.data,
    optRow,
    employerForContext,
    deadlinesRes.data ?? [],
    travelRes.data ?? [],
    docsExpiringRes.data ?? [],
    taxRes.data,
    optUnemploymentDaysLive,
  );

  const systemPromptWithContext = `${IMMIGRATION_SYSTEM_PROMPT}\n\n${profileContext}`;

  const sanitizedMessages = parsed.data.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content.slice(0, MAX_MESSAGE_LENGTH),
  }));

  const isSingleQuestion = sanitizedMessages.length === 1 && sanitizedMessages[0].role === "user";
  const cacheKey = isSingleQuestion ? `ai:${user.id}:${sanitizedMessages[0].content.toLowerCase().trim().slice(0, 200)}` : null;

  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: { answer: cached, cached: true } });
    }
  }

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: MODELS.primary,
      messages: [
        { role: "system", content: systemPromptWithContext },
        ...sanitizedMessages,
      ],
      temperature: 0.3,
      max_tokens: 2048,
    });

    const answer = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";

    if (cacheKey) {
      setCache(cacheKey, answer, 30 * 60 * 1000);
    }

    // Persist conversation (best-effort, don't block response)
    const updatedMessages = [
      ...sanitizedMessages,
      { role: "assistant" as const, content: answer, timestamp: new Date().toISOString() },
    ].slice(-MAX_MESSAGES).map(m => ({ ...m, timestamp: (m as { timestamp?: string }).timestamp ?? new Date().toISOString() }));

    supabase.from("ai_conversations").upsert(
      { user_id: user.id, messages: updatedMessages, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    ).then(() => {/* fire and forget */});

    return NextResponse.json({ success: true, data: { answer } });
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      try {
        const client = getGroqClient();
        const fallback = await client.chat.completions.create({
          model: MODELS.fallback,
          messages: [{ role: "system", content: systemPromptWithContext }, ...sanitizedMessages],
          temperature: 0.3,
          max_tokens: 2048,
        });
        const answer = fallback.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
        return NextResponse.json({ success: true, data: { answer } });
      } catch {
        // fall through
      }
    }
    if (process.env.NODE_ENV === "development") console.error("Groq API error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ success: false, error: { code: "AI_ERROR", message: "AI service temporarily unavailable. Please try again." } }, { status: 503 });
  }
}
