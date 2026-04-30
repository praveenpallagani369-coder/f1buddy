import { createClient } from "@/lib/supabase/server";
import { getGroqClient, MODELS } from "@/lib/ai/groq";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { NextResponse } from "next/server";

const MAX_USERS_PER_RUN = 15; // stay comfortably within 30 RPM

export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const today = new Date();
  const currentYear = today.getFullYear();
  const todayStr = format(today, "yyyy-MM-dd");
  const thirtyDaysOut = format(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

  // Find users with pending deadlines in the next 30 days who haven't gotten an AI insight today
  const { data: users } = await supabase
    .from("compliance_deadlines")
    .select("user_id")
    .eq("status", "pending")
    .gte("deadline_date", todayStr)
    .lte("deadline_date", thirtyDaysOut)
    .limit(MAX_USERS_PER_RUN * 3); // fetch extra to filter by "no alert today"

  if (!users || users.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  const uniqueUserIds = Array.from(new Set(users.map(u => u.user_id))).slice(0, MAX_USERS_PER_RUN * 2);

  // Filter out users who already got an AI insight notification today
  const { data: recentAlerts } = await supabase
    .from("notifications")
    .select("user_id")
    .in("user_id", uniqueUserIds)
    .eq("type", "system")
    .gte("created_at", `${todayStr}T00:00:00Z`)
    .ilike("title", "%AI Insight%");

  const alreadyAlerted = new Set((recentAlerts ?? []).map(a => a.user_id));
  const eligibleUserIds = uniqueUserIds.filter(id => !alreadyAlerted.has(id)).slice(0, MAX_USERS_PER_RUN);

  if (eligibleUserIds.length === 0) {
    return NextResponse.json({ success: true, processed: 0, skipped: "all users already alerted today" });
  }

  const groq = getGroqClient();
  let processed = 0;
  const errors: string[] = [];

  for (const userId of eligibleUserIds) {
    try {
      const [profileRes, optRes, deadlinesRes, travelRes] = await Promise.all([
        supabase.from("users").select("name,program_end_date,home_country").eq("id", userId).single(),
        supabase.from("opt_status").select("opt_type,ead_end_date,unemployment_days_used,unemployment_limit").eq("user_id", userId).single(),
        supabase.from("compliance_deadlines").select("title,deadline_date,severity").eq("user_id", userId).eq("status", "pending").gte("deadline_date", todayStr).order("deadline_date").limit(3),
        supabase.from("travel_records").select("days_outside,return_date").eq("user_id", userId).gte("departure_date", `${currentYear}-01-01`),
      ]);

      const profile = profileRes.data;
      const opt = optRes.data;
      const deadlines = deadlinesRes.data ?? [];
      const travelDays = (travelRes.data ?? []).reduce((sum: number, r: { days_outside: number }) => sum + (r.days_outside ?? 0), 0);
      const currentlyAbroad = (travelRes.data ?? []).some((r: { return_date: string | null }) => !r.return_date);

      const contextLines: string[] = [`Today: ${todayStr}`];
      if (opt?.ead_end_date) {
        const eadDays = differenceInCalendarDays(parseISO(opt.ead_end_date), today);
        contextLines.push(`EAD expires in ${eadDays} days (${opt.ead_end_date})`);
      }
      if (opt?.unemployment_days_used != null && opt.unemployment_limit != null) {
        contextLines.push(`OPT unemployment: ${opt.unemployment_days_used}/${opt.unemployment_limit} days used`);
      }
      if (travelDays > 0) contextLines.push(`Days outside US this year: ${travelDays}${currentlyAbroad ? " (currently abroad)" : ""}`);
      deadlines.forEach(d => {
        const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
        contextLines.push(`Deadline: "${d.title}" in ${days} days [${d.severity}]`);
      });
      if (profile?.program_end_date) {
        const progDays = differenceInCalendarDays(parseISO(profile.program_end_date), today);
        if (progDays > 0 && progDays <= 180) contextLines.push(`Program ends in ${progDays} days`);
      }

      if (contextLines.length <= 1) continue; // nothing interesting to alert about

      const completion = await groq.chat.completions.create({
        model: MODELS.fallback, // use 8B for cron to conserve rate limits
        messages: [
          {
            role: "system",
            content: "You are an F-1 visa compliance assistant. Generate ONE concise, actionable insight or reminder for an F-1 student. 1-2 sentences max. Be specific. No fluff. No greeting.",
          },
          {
            role: "user",
            content: `Student context:\n${contextLines.join("\n")}\n\nGenerate one specific, actionable insight they should know today.`,
          },
        ],
        temperature: 0.4,
        max_tokens: 150,
      });

      const insight = completion.choices[0]?.message?.content?.trim();
      if (!insight) continue;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "system",
        title: "AI Insight for Today",
        message: insight,
        link: "/dashboard/ai",
        is_read: false,
        is_email_sent: false,
      });

      processed++;
    } catch (e) {
      errors.push(`${userId}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return NextResponse.json({ success: true, processed, errors: errors.length > 0 ? errors : undefined });
}
