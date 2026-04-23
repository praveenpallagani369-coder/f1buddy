// POST /api/onboarding — called after onboarding wizard completes
// Auto-generates system deadlines based on student profile
import { NextResponse } from "next/server";
import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { generateSystemDeadlines } from "@/lib/immigration/rules";
import { format } from "date-fns";

export async function POST() {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { data: profile } = await supabase
    .from("users")
    .select("program_end_date, passport_expiry, program_start_date")
    .eq("id", user.id)
    .single();

  const { data: opt } = await supabase
    .from("opt_status")
    .select("ead_end_date, opt_type, unemployment_days_used, unemployment_limit")
    .eq("user_id", user.id)
    .single();

  // Build input for deadline generator
  const deadlineInput = {
    programEndDate: profile?.program_end_date ?? null,
    eadEndDate: opt?.ead_end_date ?? null,
    passportExpiry: profile?.passport_expiry ?? null,
    optType: (opt?.opt_type as "pre_completion" | "post_completion" | "stem_extension" | null) ?? null,
    unemploymentDaysUsed: opt?.unemployment_days_used ?? 0,
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
