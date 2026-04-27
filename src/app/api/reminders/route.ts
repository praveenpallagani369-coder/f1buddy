import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendDeadlineReminder } from "@/lib/email/resend";
import { ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { differenceInCalendarDays, parseISO } from "date-fns";

const REMINDER_THRESHOLDS = [30, 14, 7, 3, 1];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return handleCronReminders();
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED();

  const today = new Date();
  const { data: deadlines } = await supabase
    .from("compliance_deadlines")
    .select("title, deadline_date, severity")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("deadline_date");

  const upcoming = (deadlines ?? []).map((d) => ({
    ...d,
    daysRemaining: differenceInCalendarDays(parseISO(d.deadline_date), today),
  }));

  return ok({ deadlines: upcoming });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return err("UNAUTHORIZED", "Invalid cron secret", 401);
  }
  return handleCronReminders();
}

async function handleCronReminders() {
  const supabase = await createAdminClient();
  const today = new Date();

  const { data: allDeadlines, error: dbErr } = await supabase
    .from("compliance_deadlines")
    .select("id, user_id, title, deadline_date, severity, reminder_30d_sent, reminder_14d_sent, reminder_7d_sent, reminder_3d_sent, reminder_1d_sent")
    .eq("status", "pending");

  if (dbErr || !allDeadlines) {
    return err("DB_ERROR", "Failed to fetch deadlines", 500);
  }

  type DeadlineRow = (typeof allDeadlines)[number];
  const actionable: DeadlineRow[] = [];

  for (const d of allDeadlines) {
    const daysLeft = differenceInCalendarDays(parseISO(d.deadline_date), today);
    const threshold = REMINDER_THRESHOLDS.find((t) => daysLeft === t);
    if (!threshold) continue;
    const flagField = `reminder_${threshold}d_sent` as keyof DeadlineRow;
    if (d[flagField]) continue;
    actionable.push(d);
  }

  if (actionable.length === 0) return ok({ usersNotified: 0 });

  const userIds = Array.from(new Set(actionable.map((d) => d.user_id)));
  const { data: users } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", userIds);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const grouped: Record<string, DeadlineRow[]> = {};
  for (let i = 0; i < actionable.length; i++) {
    const d = actionable[i];
    if (!grouped[d.user_id]) grouped[d.user_id] = [];
    grouped[d.user_id].push(d);
  }

  let usersNotified = 0;
  const groupedEntries = Object.entries(grouped);

  for (let i = 0; i < groupedEntries.length; i++) {
    const [userId, deadlines] = groupedEntries[i];
    const user = userMap.get(userId);
    if (!user?.email) continue;

    await sendDeadlineReminder({
      to: user.email,
      studentName: user.name ?? "Student",
      deadlines: deadlines.map((d) => ({
        title: d.title,
        daysRemaining: differenceInCalendarDays(parseISO(d.deadline_date), today),
        severity: d.severity,
        deadlineDate: d.deadline_date,
      })),
    });

    for (let j = 0; j < deadlines.length; j++) {
      const d = deadlines[j];
      const daysLeft = differenceInCalendarDays(parseISO(d.deadline_date), today);
      const threshold = REMINDER_THRESHOLDS.find((t) => daysLeft === t);
      if (!threshold) continue;
      await supabase
        .from("compliance_deadlines")
        .update({ [`reminder_${threshold}d_sent`]: true })
        .eq("id", d.id);
    }

    usersNotified++;
  }

  return ok({ usersNotified });
}
