import { getAuthUser, ok, UNAUTHORIZED } from "@/lib/api/helpers";
import { calculateUnemploymentDays, generateSystemDeadlines } from "@/lib/immigration/rules";
import { encryptIfPresent } from "@/lib/crypto";
import { z } from "zod";

const onboardingBody = z.object({
  sevisId: z.string().max(20).nullable().optional(),
}).strict();

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const body = await request.json().catch(() => ({}));
  const parsed = onboardingBody.safeParse(body);

  if (parsed.success && parsed.data.sevisId) {
    const encrypted = encryptIfPresent(parsed.data.sevisId);
    if (encrypted) {
      await supabase.from("users").update({ sevis_id_encrypted: encrypted }).eq("id", user.id);
    }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("program_end_date, passport_expiry, program_start_date")
    .eq("id", user.id)
    .single();

  const [{ data: opt }, { data: employmentRows }] = await Promise.all([
    supabase
      .from("opt_status")
      .select("ead_start_date,ead_end_date, opt_type, unemployment_days_used, unemployment_limit")
      .eq("user_id", user.id)
      .single(),
    supabase.from("opt_employment").select("start_date,end_date").eq("user_id", user.id).order("start_date"),
  ]);

  const today = new Date();
  const liveUnemployment =
    opt?.ead_start_date && employmentRows
      ? calculateUnemploymentDays(
          opt.ead_start_date,
          employmentRows.map((e: { start_date: string; end_date: string | null }) => ({
            startDate: e.start_date,
            endDate: e.end_date,
          })),
          today
        )
      : (opt?.unemployment_days_used ?? 0);

  // Build input for deadline generator
  const deadlineInput = {
    programEndDate: profile?.program_end_date ?? null,
    eadEndDate: opt?.ead_end_date ?? null,
    passportExpiry: profile?.passport_expiry ?? null,
    optType: (opt?.opt_type as "pre_completion" | "post_completion" | "stem_extension" | null) ?? null,
    unemploymentDaysUsed: liveUnemployment,
    unemploymentLimit: opt?.unemployment_limit ?? 90,
  };

  const systemDeadlines = generateSystemDeadlines(deadlineInput);

  if (systemDeadlines.length > 0) {
    // Remove old system-generated deadlines to avoid duplicates
    await supabase
      .from("compliance_deadlines")
      .delete()
      .eq("user_id", user.id)
      .eq("is_system_generated", true);

    // Insert fresh ones
    await supabase.from("compliance_deadlines").insert(
      systemDeadlines.map((d) => ({
        user_id: user.id,
        title: d.title,
        description: d.description,
        deadline_date: d.deadlineDate,
        category: d.category,
        severity: d.severity,
        status: "pending",
        is_system_generated: true,
      }))
    );
  }

  // Also add annual Form 8843 reminder if not already there
  const currentYear = new Date().getFullYear();
  await supabase.from("compliance_deadlines").upsert(
    [{
      user_id: user.id,
      title: `File Form 8843 for ${currentYear - 1} (even with no income)`,
      description: "Every F-1 student must file Form 8843 by April 15, even with zero US income. Use Sprintax or Glacier Tax Prep — both have free tiers.",
      deadline_date: `${currentYear}-04-15`,
      category: "tax",
      severity: "warning",
      status: "pending",
      is_system_generated: true,
    }],
    { onConflict: "user_id,title", ignoreDuplicates: true }
  );

  return ok({ generated: systemDeadlines.length });
}
