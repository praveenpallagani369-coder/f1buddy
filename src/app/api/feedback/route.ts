import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimitDB } from "@/lib/rate-limit";
import { canViewAllFeedback } from "@/lib/feedback/viewers";
import { sendFeedbackNotification } from "@/lib/email/resend";
import { z } from "zod";

const createSchema = z.object({
  message: z.string().min(3).max(8000),
  category: z.enum(["bug", "idea", "general"]).default("general"),
});

export async function GET() {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { data: profile } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "student";
  const email = profile?.email ?? user.email ?? "";

  if (canViewAllFeedback(role, email)) {
    const admin = await createAdminClient();
    const { data, error: qErr } = await admin
      .from("feedback")
      .select("id, user_id, submitter_email, submitter_name, message, category, created_at")
      .order("created_at", { ascending: false });
    if (qErr) return err("DB_ERROR", "Failed to load feedback", 500);
    return ok(data ?? []);
  }

  const { data, error: qErr } = await supabase
    .from("feedback")
    .select("id, user_id, submitter_email, submitter_name, message, category, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (qErr) return err("DB_ERROR", "Failed to load feedback", 500);
  return ok(data ?? []);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { allowed } = await rateLimitDB(supabase, `feedback:${user.id}`, 10, 3600);
  if (!allowed) return err("RATE_LIMIT", "Too many feedback submissions. Try again later.", 429);

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", user.id)
    .single();

  const { data, error: insErr } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      submitter_email: profile?.email ?? user.email ?? "",
      submitter_name: profile?.name ?? null,
      message: parsed.data.message.trim(),
      category: parsed.data.category,
    })
    .select()
    .single();

  if (insErr) return err("DB_ERROR", "Could not save feedback", 500);

  // Send notification email to admin asynchronously
  sendFeedbackNotification({
    submitterName: profile?.name ?? null,
    submitterEmail: profile?.email ?? user.email ?? "",
    category: parsed.data.category,
    message: parsed.data.message,
  }).catch((e) => console.error("Failed to send feedback email:", e));

  return ok(data, 201);
}
