// ============================================================
// Visa Stage Engine — determines current F-1 stage and rules
// ============================================================
import { differenceInCalendarDays, parseISO, addDays, format } from "date-fns";

export type VisaStage =
  | "f1_active"
  | "cpt"
  | "opt_pending"
  | "opt_active"
  | "stem_opt_active"
  | "grace_period"
  | "h1b_cap_gap"
  | "program_ended";

export interface StageInfo {
  id: VisaStage;
  label: string;
  icon: string;
  color: string;       // tailwind color class
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  isCompleted: boolean;
  isFuture: boolean;
  rules: string[];
  warnings: string[];
  nextStep: string | null;
}

export interface VisaTimelineInput {
  programStartDate: string | null;
  programEndDate: string | null;
  optType: "pre_completion" | "post_completion" | "stem_extension" | null;
  eadStartDate: string | null;
  eadEndDate: string | null;
  stemEndDate: string | null;       // end date of STEM OPT extension EAD
  optApplicationDate: string | null; // when I-765 was filed
  h1bPetitionFiled: boolean;
}

export function buildVisaTimeline(input: VisaTimelineInput): StageInfo[] {
  const today = new Date();
  const stages: StageInfo[] = [];

  const progStart = input.programStartDate ? parseISO(input.programStartDate) : null;
  const progEnd = input.programEndDate ? parseISO(input.programEndDate) : null;
  const eadStart = input.eadStartDate ? parseISO(input.eadStartDate) : null;
  const eadEnd = input.eadEndDate ? parseISO(input.eadEndDate) : null;

  // ── Stage 1: F-1 Student Active ───────────────────────────
  // When on STEM OPT, F-1 ended at program end (not at STEM EAD start)
  const isOnStemOpt = input.optType === "stem_extension";
  const f1End = isOnStemOpt ? progEnd : (eadStart ?? progEnd);
  stages.push({
    id: "f1_active",
    label: "F-1 Student",
    icon: "🎓",
    color: "indigo",
    startDate: input.programStartDate,
    endDate: f1End ? format(f1End, "yyyy-MM-dd") : input.programEndDate,
    isCurrent: !!(progStart && today >= progStart && progEnd && today <= progEnd && !eadStart),
    isCompleted: !!(eadStart && today > eadStart) || !!(progEnd && today > progEnd),
    isFuture: !!(progStart && today < progStart),
    rules: [
      "Full-time enrollment required (12 credit hours for undergrad, 9 for grad)",
      "On-campus work: max 20 hours/week during semester, full-time during breaks",
      "Off-campus work: NOT allowed without authorization",
      "Must maintain valid I-20 and report address changes within 10 days",
      "Annual SEVIS fee required for each new program",
    ],
    warnings: progEnd && differenceInCalendarDays(progEnd, today) <= 90 && differenceInCalendarDays(progEnd, today) > 0
      ? [`Program ends in ${differenceInCalendarDays(progEnd, today)} days — apply for OPT now if eligible`]
      : [],
    nextStep: "Apply for OPT or CPT before program ends",
  });

  // ── Stage 2: OPT Pending ──────────────────────────────────
  if (input.optApplicationDate && !eadStart) {
    const appDate = parseISO(input.optApplicationDate);
    stages.push({
      id: "opt_pending",
      label: "OPT Application Pending",
      icon: "⏳",
      color: "amber",
      startDate: input.optApplicationDate,
      endDate: null,
      isCurrent: today >= appDate && !eadStart,
      isCompleted: !!eadStart,
      isFuture: false,
      rules: [
        "DO NOT start working — application pending does NOT authorize employment",
        "You may remain in the US during processing",
        "Track your case at egov.uscis.gov with your receipt number",
        "Typical processing: 3-5 months",
      ],
      warnings: ["You cannot work until you have the physical EAD card in hand"],
      nextStep: "Wait for EAD card — track at egov.uscis.gov",
    });
  }

  // ── Stage 3: OPT Active ───────────────────────────────────
  const optStart = eadStart || (progEnd ? addDays(progEnd, 1) : null);
  const optEnd = eadEnd || (optStart ? addDays(optStart, 364) : null);
  
  stages.push({
    id: "opt_active",
    label: "OPT Active",
    icon: "💼",
    color: "emerald",
    startDate: optStart ? format(optStart, "yyyy-MM-dd") : null,
    endDate: optEnd ? format(optEnd, "yyyy-MM-dd") : null,
    isCurrent: !!(eadStart && eadEnd && today >= eadStart && today <= eadEnd && input.optType !== "stem_extension"),
    isCompleted: !!(eadEnd && today > eadEnd && input.optType !== "stem_extension") || isOnStemOpt,
    isFuture: !eadStart || (eadStart && today < eadStart),
    rules: [
      "Work must be directly related to your degree field",
      "Full-time (40h/wk) or part-time (20h/wk minimum) — both are valid",
      "Max 90 days unemployment — days while abroad also count",
      "Report new employer to DSO within 10 days of starting",
      "Report job end to DSO within 10 days",
      "Maintain valid EAD — cannot work after EAD expiry",
    ],
    warnings: eadEnd && input.optType !== "stem_extension" && differenceInCalendarDays(eadEnd, today) <= 90 && differenceInCalendarDays(eadEnd, today) > 0
      ? [`EAD expires in ${differenceInCalendarDays(eadEnd, today)} days — apply for STEM extension if eligible`]
      : [],
    nextStep: "Apply for STEM OPT extension (24 months) if degree qualifies",
  });

  // ── Stage 4: STEM OPT Active ─────────────────────────────
  const stemStart = isOnStemOpt ? eadStart : (eadEnd ? addDays(eadEnd, 1) : null);
  const stemEnd = input.stemEndDate ? parseISO(input.stemEndDate) : (stemStart ? addDays(stemStart, 729) : null);

  stages.push({
    id: "stem_opt_active",
    label: "STEM OPT Extension",
    icon: "🔬",
    color: "violet",
    startDate: stemStart ? format(stemStart, "yyyy-MM-dd") : null,
    endDate: stemEnd ? format(stemEnd, "yyyy-MM-dd") : null,
    isCurrent: !!(isOnStemOpt && eadStart && eadEnd && today >= eadStart && today <= eadEnd),
    isCompleted: !!(isOnStemOpt && eadEnd && today > eadEnd),
    isFuture: !isOnStemOpt,
    rules: [
      "Employer MUST be E-Verify enrolled — no self-employment, no 1099",
      "I-983 Training Plan must be signed and submitted to DSO before starting",
      "Validation reports due at 6, 12, 18, 24 months (10-day window)",
      "Self-evaluations (I-983 p.5) due at 12 and 24 months",
      "150 days CUMULATIVE unemployment cap (Total across OPT + STEM)",
      "Report employer changes within 10 days; new I-983 required",
    ],
    warnings: isOnStemOpt && eadEnd && differenceInCalendarDays(eadEnd, today) <= 180 && differenceInCalendarDays(eadEnd, today) > 0
      ? [`STEM OPT expires in ${differenceInCalendarDays(eadEnd, today)} days — plan for H-1B or next steps`]
      : [],
    nextStep: "Plan for H-1B lottery or other career transitions",
  });

  // ── Stage 5: Grace Period ─────────────────────────────────
  const finalEadEnd = eadEnd; // Either OPT or STEM end
  const graceStart = finalEadEnd ? addDays(finalEadEnd, 1) : null;
  const graceEnd = graceStart ? addDays(graceStart, 59) : null;

  stages.push({
    id: "grace_period",
    label: "60-Day Grace Period",
    icon: "⏱️",
    color: "orange",
    startDate: graceStart ? format(graceStart, "yyyy-MM-dd") : null,
    endDate: graceEnd ? format(graceEnd, "yyyy-MM-dd") : null,
    isCurrent: !!(graceStart && graceEnd && today >= graceStart && today <= graceEnd),
    isCompleted: !!(graceEnd && today > graceEnd),
    isFuture: !graceStart || (graceStart && today < graceStart),
    rules: [
      "You CANNOT work during the grace period",
      "Use this time to: change status, depart the US, or receive H-1B cap-gap",
      "60 days from OPT/STEM end date — not flexible",
    ],
    warnings: graceStart && graceEnd && today >= graceStart && today <= graceEnd
      ? [`Grace period ends ${format(graceEnd, "MMM d, yyyy")} — ${differenceInCalendarDays(graceEnd, today)} days remaining`]
      : [],
    nextStep: "Depart US or change to a new status (e.g., H-1B, H-4, New I-20)",
  });

  // ── Stage 6: H-1B Cap-Gap ────────────────────────────────
  if (input.h1bPetitionFiled) {
    // Cap-gap extends until Oct 1 of the H-1B fiscal year (the next Oct 1 after EAD ends)
    const capGapRef = activeEadEnd ?? today;
    const oct1SameYear = new Date(capGapRef.getFullYear(), 9, 1);
    const h1bStartDate = capGapRef < oct1SameYear ? oct1SameYear : new Date(capGapRef.getFullYear() + 1, 9, 1);
    const h1bStartStr = format(h1bStartDate, "yyyy-MM-dd");

    stages.push({
      id: "h1b_cap_gap",
      label: "H-1B Cap-Gap",
      icon: "🏢",
      color: "blue",
      startDate: activeEadEnd ? format(addDays(activeEadEnd, 1), "yyyy-MM-dd") : null,
      endDate: h1bStartStr,
      isCurrent: activeEadEnd ? today > activeEadEnd && today < h1bStartDate : false,
      isCompleted: today >= h1bStartDate,
      isFuture: activeEadEnd ? today <= activeEadEnd : true,
      rules: [
        "H-1B petition filed and selected in lottery",
        "Cap-gap extends OPT work authorization until H-1B start (Oct 1)",
        "Employer must have filed the H-1B petition on your behalf",
        "Keep I-797 receipt notice as proof of cap-gap authorization",
      ],
      warnings: [],
      nextStep: "H-1B starts October 1 — work with employer on I-94 update",
    });
  }

  return stages;
}

export function getCurrentStage(stages: StageInfo[]): StageInfo | null {
  return stages.find(s => s.isCurrent) ?? null;
}
