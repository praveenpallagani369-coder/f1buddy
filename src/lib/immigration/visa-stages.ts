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
  const f1End = eadStart ?? progEnd;
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
  if (eadStart && eadEnd && input.optType !== "stem_extension") {
    const daysLeft = differenceInCalendarDays(eadEnd, today);
    stages.push({
      id: "opt_active",
      label: "OPT Active",
      icon: "💼",
      color: "emerald",
      startDate: input.eadStartDate,
      endDate: input.eadEndDate,
      isCurrent: today >= eadStart && today <= eadEnd,
      isCompleted: today > eadEnd,
      isFuture: today < eadStart,
      rules: [
        "Work must be directly related to your degree field",
        "Full-time (40h/wk) or part-time (20h/wk minimum) — both are valid",
        "Max 90 days unemployment — days while abroad also count",
        "Report new employer to DSO within 10 days of starting",
        "Report job end to DSO within 10 days",
        "Maintain valid EAD — cannot work after EAD expiry",
      ],
      warnings: daysLeft <= 90 && daysLeft > 0
        ? [`EAD expires in ${daysLeft} days — ${daysLeft <= 30 ? "apply for STEM extension IMMEDIATELY" : "apply for STEM extension if eligible"}`]
        : [],
      nextStep: (input.optType as string) !== "stem_extension"
        ? "Apply for STEM OPT extension if your degree qualifies (STEM list)"
        : "Prepare for H-1B lottery or alternative status",
    });
  }

  // ── Stage 4: STEM OPT Active ─────────────────────────────
  if (input.optType === "stem_extension" && eadStart && eadEnd) {
    const daysLeft = differenceInCalendarDays(eadEnd, today);
    stages.push({
      id: "stem_opt_active",
      label: "STEM OPT Extension",
      icon: "🔬",
      color: "violet",
      startDate: input.eadStartDate,
      endDate: input.eadEndDate,
      isCurrent: today >= eadStart && today <= eadEnd,
      isCompleted: today > eadEnd,
      isFuture: today < eadStart,
      rules: [
        "Employer MUST be E-Verify enrolled — no self-employment, no 1099, no unpaid/volunteer work",
        "I-983 Training Plan must be signed by employer AND submitted to DSO before starting",
        "Validation reports due at 6, 12, 18, 24 months — student has 10 business days to report to DSO",
        "Self-evaluations (I-983 page 5) due at 12 and 24 months — signed by student AND employer",
        "150 days is the CUMULATIVE unemployment cap across ALL of OPT + STEM OPT combined — not a fresh counter",
        "Time abroad while unemployed counts toward the 150-day cap",
        "Report employer changes to DSO within 10 days; new I-983 required within 10 days of new employer",
        "Employer must report termination/departure to DSO within 5 business days",
      ],
      warnings: daysLeft <= 90 && daysLeft > 0
        ? [`STEM OPT expires in ${daysLeft} days — ${daysLeft <= 180 ? "file H-1B or prepare to change status" : ""}`]
        : [],
      nextStep: "File H-1B petition or explore EB-2 NIW, O-1A, or other pathways",
    });
  }

  // ── Stage 5: Grace Period ─────────────────────────────────
  const activeEadEnd = eadEnd;
  if (activeEadEnd) {
    const graceEnd = addDays(activeEadEnd, 60);
    stages.push({
      id: "grace_period",
      label: "60-Day Grace Period",
      icon: "⏱️",
      color: "orange",
      startDate: input.eadEndDate,
      endDate: format(graceEnd, "yyyy-MM-dd"),
      isCurrent: today > activeEadEnd && today <= graceEnd,
      isCompleted: today > graceEnd,
      isFuture: today <= activeEadEnd,
      rules: [
        "You CANNOT work during the grace period",
        "Use this time to: change status, depart the US, or receive H-1B cap-gap",
        "60 days from OPT/STEM end date — not flexible",
        "If H-1B was filed and selected in lottery, cap-gap may extend authorization",
      ],
      warnings: today > activeEadEnd && today <= graceEnd
        ? [`Grace period ends ${format(graceEnd, "MMM d, yyyy")} — ${differenceInCalendarDays(graceEnd, today)} days remaining`]
        : [],
      nextStep: "Change to H-1B, depart US, or file for another status change",
    });
  }

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
