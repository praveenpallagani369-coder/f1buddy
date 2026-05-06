import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, subDays, parseISO, format } from "date-fns";

export const OPT_PROCESSING_FALLBACK = { optimisticWeeks: 10, typicalWeeks: 16, slowWeeks: 24 };

/** Standard post-completion OPT I-765 checkpoints (persisted under `opt_application_steps.step_name`). */
export const OPT_APPLICATION_STEP_IDS = [
  "dso_request",
  "dso_i20",
  "file_uscis",
  "receipt_notice",
  "biometrics",
  "ead_approved",
  "ead_received",
] as const;

export type OptApplicationStepId = (typeof OPT_APPLICATION_STEP_IDS)[number];

export interface OptTimelineStep {
  id: OptApplicationStepId;
  order: number;
  title: string;
  description: string;
  targetDate: Date | null;
  completedDate: string | null;
  isCompleted: boolean;
  isCritical: boolean;
  tip: string;
}

export function buildOptApplicationTimeline(
  programEndDate: Date,
  _optType: string,
  estimates = OPT_PROCESSING_FALLBACK
): OptTimelineStep[] {
  const applyBy = subDays(programEndDate, 90);
  const dsoRequestBy = subDays(applyBy, 14);
  const typicalEADDate = addDays(applyBy, estimates.typicalWeeks * 7);

  return [
    {
      id: "dso_request",
      order: 1,
      title: "Request DSO Recommendation",
      description:
        "Email your DSO to request an OPT I-20. Provide your desired OPT start date and employer (if known).",
      targetDate: dsoRequestBy,
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Give your DSO 5–10 business days to process. Be specific about your requested OPT start date. Use the DSO Email Generator in VisaBuddy.",
    },
    {
      id: "dso_i20",
      order: 2,
      title: "Receive OPT-Endorsed I-20",
      description: "DSO updates your SEVIS record and issues a new I-20 with OPT recommendation.",
      targetDate: subDays(applyBy, 5),
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Review the I-20 carefully — check that your OPT start date and degree level are correct. Errors cause delays.",
    },
    {
      id: "file_uscis",
      order: 3,
      title: "File Form I-765 with USCIS",
      description: `Submit Form I-765 (Application for Employment Authorization) to USCIS. This is the filing deadline — you must apply at least 90 days before program end or no later than 60 days after.`,
      targetDate: applyBy,
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Application window: 90 days before program end to 60 days after. Filing early = earlier EAD start date. Required documents: I-765 form, I-20 (OPT recommended), passport photo, copy of prior EAD (if any), filing fee check or fee waiver.",
    },
    {
      id: "receipt_notice",
      order: 4,
      title: "Receive USCIS Receipt Notice (Form I-797)",
      description: "USCIS mails a receipt notice (I-797) confirming they received your application. Arrives 2–4 weeks after filing.",
      targetDate: addDays(applyBy, 21),
      completedDate: null,
      isCompleted: false,
      isCritical: false,
      tip: "Keep this receipt notice — it can serve as proof your application is pending. You CANNOT work until you have a physical EAD card.",
    },
    {
      id: "biometrics",
      order: 5,
      title: "Biometrics Appointment (if required)",
      description: "Some OPT applicants are scheduled for fingerprinting. Not always required.",
      targetDate: addDays(applyBy, 35),
      completedDate: null,
      isCompleted: false,
      isCritical: false,
      tip: "Attend on the scheduled date. Missing it causes significant delays. Bring your appointment notice, passport, and receipt notice.",
    },
    {
      id: "ead_approved",
      order: 6,
      title: "Application Approved — EAD Card Mailed",
      description: "USCIS approves your application and mails the EAD card. Typical processing: 10–24 weeks.",
      targetDate: typicalEADDate,
      completedDate: null,
      isCompleted: false,
      isCritical: false,
      tip: `Typical: ${estimates.typicalWeeks} weeks. Slow period: ${estimates.slowWeeks} weeks. Track at egov.uscis.gov using your receipt number. Do NOT start working before your EAD card arrives and your authorized start date.`,
    },
    {
      id: "ead_received",
      order: 7,
      title: "EAD Card Received — You Can Start Working!",
      description: "Physical EAD card arrives. You may start working on or after the start date printed on the card.",
      targetDate: addDays(typicalEADDate, 7),
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Check: correct name, correct start/end dates, correct category (C3B for post-completion OPT). If there is any error, report it to USCIS immediately. Report your new employer to your DSO within 10 days of starting work.",
    },
  ];
}

/** Mark initial OPT checkpoints complete for users already on OPT or STEM. Idempotent upserts into `opt_application_steps`. */
export async function markPostCompletionOptStepsCompleted(
  supabase: SupabaseClient,
  userId: string,
  programEndDateISO: string | null
): Promise<void> {
  const steps = programEndDateISO
    ? buildOptApplicationTimeline(parseISO(programEndDateISO), "post_completion")
    : OPT_APPLICATION_STEP_IDS.map((id, i) => ({
        id,
        order: i + 1,
        title: "",
        description: "",
        targetDate: null as Date | null,
        completedDate: null as string | null,
        isCompleted: false,
        isCritical: false,
        tip: "",
      }));

  const updatedAt = new Date().toISOString();

  for (const step of steps) {
    const target = step.targetDate ? format(step.targetDate, "yyyy-MM-dd") : null;

    const { data: existing, error: selErr } = await supabase
      .from("opt_application_steps")
      .select("id")
      .eq("user_id", userId)
      .eq("step_name", step.id)
      .maybeSingle();

    if (selErr) continue;

    if (existing?.id) {
      await supabase
        .from("opt_application_steps")
        .update({
          is_completed: true,
          completed_date: target,
          target_date: target,
          updated_at: updatedAt,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("opt_application_steps").insert({
        user_id: userId,
        step_name: step.id,
        step_order: step.order,
        target_date: target,
        is_completed: true,
        completed_date: target,
      });
    }
  }
}

export function stemUserHasIncompleteOptSteps(
  savedRows: { step_name: string; is_completed: boolean | null }[] | null | undefined,
  programEndDateISO: string | null | undefined
): boolean {
  if (!programEndDateISO) {
    return OPT_APPLICATION_STEP_IDS.some((id) => !savedRows?.some((s) => s.step_name === id && s.is_completed));
  }
  const timeline = buildOptApplicationTimeline(parseISO(programEndDateISO), "post_completion");
  return timeline.some((step) => {
    const row = savedRows?.find((s) => s.step_name === step.id);
    return !row?.is_completed;
  });
}
