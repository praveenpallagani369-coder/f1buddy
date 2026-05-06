import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, parseISO, format } from "date-fns";

/** Creates compliance deadlines at 6, 12, 18, 24 months after STEM EAD start (I-983 validation milestones). */
export async function upsertStemValidationDeadlines(
  supabase: SupabaseClient,
  userId: string,
  stemEadStartDateISO: string
): Promise<void> {
  const start = parseISO(stemEadStartDateISO);
  const selfEvalMonths = new Set([12, 24]);

  const stemDeadlines = [6, 12, 18, 24].map((month) => ({
    user_id: userId,
    title: `STEM OPT ${month}-Month Validation Report${selfEvalMonths.has(month) ? " + Self-Evaluation" : ""}`,
    description: selfEvalMonths.has(month)
      ? `Submit I-983 validation report AND self-evaluation (I-983 page 5, signed by you and employer) to DSO within 10 business days of ${format(addMonths(start, month), "MMM d, yyyy")}. 8 CFR 214.2(f)(10)(ii)(C).`
      : `Submit I-983 validation report to your DSO within 10 business days of ${format(addMonths(start, month), "MMM d, yyyy")}. 8 CFR 214.2(f)(10)(ii)(C).`,
    deadline_date: format(addMonths(start, month), "yyyy-MM-dd"),
    category: "opt" as const,
    severity: "critical" as const,
    status: "pending" as const,
    is_system_generated: true,
  }));

  const { data: existing } = await supabase
    .from("compliance_deadlines")
    .select("title")
    .eq("user_id", userId)
    .like("title", "STEM OPT %");

  const existingTitles = new Set(existing?.map((d) => d.title) || []);

  for (const d of stemDeadlines) {
    if (!existingTitles.has(d.title)) {
      await supabase.from("compliance_deadlines").insert(d);
    }
  }
}
