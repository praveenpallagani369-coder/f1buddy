import { createClient } from "@/lib/supabase/server";
import { getGroqClient, MODELS, IMMIGRATION_SYSTEM_PROMPT } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/api/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { differenceInCalendarDays, parseISO } from "date-fns";

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

function buildProfileContext(
  profile: ProfileData | null,
  opt: OPTData | null,
  employer: EmployerData | null,
  deadlines: DeadlineData[]
): string {
  const today = new Date();
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
    lines.push(`\nOPT Status: ${opt.opt_type?.replace("_", " ") ?? "None"}`);
    if (opt.ead_start_date) lines.push(`EAD: ${opt.ead_start_date} to ${opt.ead_end_date} (Category: ${opt.ead_category ?? "Unknown"})`);
    if (opt.ead_end_date) {
      const daysLeft = differenceInCalendarDays(parseISO(opt.ead_end_date), today);
      lines.push(`EAD days remaining: ${daysLeft}`);
    }
    const unemployDays = opt.unemployment_days_used ?? 0;
    const unemployLimit = opt.unemployment_limit ?? 90;
    lines.push(`Unemployment days used: ${unemployDays}/${unemployLimit} (${unemployLimit - unemployDays} remaining)`);
    if (opt.application_date && !opt.ead_start_date) lines.push(`OPT application filed: ${opt.application_date} — still pending`);
  } else {
    lines.push("\nOPT Status: Not on OPT");
  }

  if (employer) {
    lines.push(`\nCurrent Employer: ${employer.employer_name} — ${employer.position_title ?? "Unknown role"}`);
    lines.push(`E-Verify: ${employer.e_verify_employer ? "Yes" : "No"}, Reported to DSO: ${employer.reported_to_school ? "Yes" : "No"}`);
  }

  if (deadlines.length > 0) {
    lines.push(`\nUpcoming Deadlines (next 3):`);
    deadlines.slice(0, 3).forEach((d) => {
      const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
      lines.push(`  - ${d.title}: ${days === 0 ? "TODAY" : days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`} [${d.severity}]`);
    });
  }

  lines.push("\n=== Use this context to give personalized, specific answers. Do not reveal raw DB field names. ===");
  return lines.join("\n");
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

  // Fetch profile context in parallel with request parsing
  const [profileRes, optRes, employerRes, deadlinesRes] = await Promise.all([
    supabase.from("users").select("name,school_name,program_name,degree_level,program_end_date,home_country").eq("id", user.id).single(),
    supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
    supabase.from("opt_employment").select("*").eq("user_id", user.id).eq("is_current", true).single(),
    supabase.from("compliance_deadlines").select("title,deadline_date,severity").eq("user_id", user.id).eq("status", "pending").order("deadline_date").limit(5),
  ]);

  const profileContext = buildProfileContext(
    profileRes.data,
    optRes.data,
    employerRes.data,
    deadlinesRes.data ?? []
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
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";

    if (cacheKey) {
      setCache(cacheKey, answer, 30 * 60 * 1000);
    }

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
          max_tokens: 1024,
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
