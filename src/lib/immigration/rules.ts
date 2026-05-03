// ============================================================
// VisaBuddy Immigration Rules Engine (DDD Domain Layer)
// All F-1 immigration rules codified here.
// CFR references included per rule.
// ============================================================
import { differenceInCalendarDays, parseISO, isAfter, isBefore, isValid, startOfYear, endOfYear, format, addMonths } from "date-fns";

// Safe wrapper — returns null instead of Invalid Date
function safeParse(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = parseISO(dateStr);
  return isValid(d) ? d : null;
}

// ---- OPT Unemployment Counter ----
// CFR: 8 CFR 214.2(f)(10)(ii)(E)
// Post-completion OPT: 90 cumulative days unemployment max
// STEM OPT extension: 150 cumulative days unemployment max (includes 90 from OPT)

export function calculateUnemploymentDays(
  eadStartDate: string,
  employmentPeriods: { startDate: string; endDate: string | null }[],
  today: Date = new Date()
): number {
  const ead = safeParse(eadStartDate);
  if (!ead || isAfter(ead, today)) return 0;

  // Total calendar days on OPT (inclusive of both endpoints)
  const totalDays = differenceInCalendarDays(today, ead) + 1;

  // Build intervals clipped to [ead, today], filter out invalid/empty ones, sort by start
  const intervals = employmentPeriods
    .map((p) => {
      const s = safeParse(p.startDate);
      const e = p.endDate ? safeParse(p.endDate) : today;
      if (!s || !e) return null;
      return {
        start: isAfter(s, ead) ? s : ead,
        end: isAfter(e, today) ? today : e,
      };
    })
    .filter((p): p is { start: Date; end: Date } => p !== null && !isAfter(p.start, p.end))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping/adjacent intervals then sum employed days
  const merged: { start: Date; end: Date }[] = [];
  for (const p of intervals) {
    const last = merged[merged.length - 1];
    if (!last || isAfter(p.start, last.end)) {
      merged.push({ start: p.start, end: p.end });
    } else if (isAfter(p.end, last.end)) {
      last.end = p.end;
    }
  }

  const employedDays = merged.reduce(
    (sum, p) => sum + differenceInCalendarDays(p.end, p.start) + 1,
    0
  );

  return Math.max(0, totalDays - employedDays);
}

export function getUnemploymentLimit(optType: "pre_completion" | "post_completion" | "stem_extension"): number {
  // CFR: 8 CFR 214.2(f)(10)(ii)(E)
  return optType === "stem_extension" ? 150 : 90;
}

export function getUnemploymentSeverity(daysUsed: number, limit: number): "critical" | "warning" | "info" {
  const pct = daysUsed / limit;
  if (pct >= 0.9) return "critical";
  if (pct >= 0.7) return "warning";
  return "info";
}

// ---- Days Outside US Calculator ----
// CFR: 8 CFR 214.2(f)(5)(iv)
// Staying outside the US for more than 5 months terminates SEVIS

export function calculateDaysOutsideUS(
  travelRecords: { departureDate: string; returnDate: string | null }[],
  year: number = new Date().getFullYear(),
  today: Date = new Date()
): number {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));
  const effectiveEnd = isBefore(today, yearEnd) ? today : yearEnd;

  let totalDays = 0;
  for (const trip of travelRecords) {
    const departure = safeParse(trip.departureDate);
    const returnDate = trip.returnDate ? safeParse(trip.returnDate) : effectiveEnd;
    if (!departure || !returnDate) continue;

    // Clip to this year
    const start = isAfter(departure, yearStart) ? departure : yearStart;
    const end = isBefore(returnDate, effectiveEnd) ? returnDate : effectiveEnd;

    if (isAfter(start, end)) continue;
    totalDays += differenceInCalendarDays(end, start);
  }
  return totalDays;
}

export function checkFiveMonthRule(
  travelRecords: { departureDate: string; returnDate: string | null }[]
): { violated: boolean; maxConsecutiveDays: number } {
  // CFR: 8 CFR 214.2(f)(5)(iv) — absence exceeding 5 CALENDAR MONTHS terminates SEVIS
  // Must use addMonths() comparison, NOT 150 days (months have different lengths)
  let maxConsecutive = 0;
  let violated = false;
  const today = new Date();

  for (const trip of travelRecords) {
    const departure = safeParse(trip.departureDate);
    if (!departure) continue;
    const returnDate = trip.returnDate ? (safeParse(trip.returnDate) ?? today) : today;
    const days = differenceInCalendarDays(returnDate, departure);
    if (days > maxConsecutive) maxConsecutive = days;
    if (isAfter(returnDate, addMonths(departure, 5))) violated = true;
  }

  return { violated, maxConsecutiveDays: maxConsecutive };
}

// ---- Substantial Presence Test ----
// IRS Publication 519 — determines resident vs nonresident alien for taxes

export function calculateSubstantialPresence(
  daysInUS: { year: number; days: number }[],
  currentYear: number
): { isResident: boolean; total: number } {
  const current = daysInUS.find((d) => d.year === currentYear)?.days ?? 0;
  const prior1 = daysInUS.find((d) => d.year === currentYear - 1)?.days ?? 0;
  const prior2 = daysInUS.find((d) => d.year === currentYear - 2)?.days ?? 0;

  // IRS formula: full current year + 1/3 of prior year + 1/6 of two years ago
  const total = current + Math.floor(prior1 / 3) + Math.floor(prior2 / 6);
  return { isResident: total >= 183, total };
}

// ---- System Deadline Generator ----
// Generates all standard deadlines from a student profile

export interface StudentDeadlineInput {
  programEndDate: string | null;
  eadEndDate: string | null;
  passportExpiry: string | null;
  optType: "pre_completion" | "post_completion" | "stem_extension" | null;
  unemploymentDaysUsed: number;
  unemploymentLimit: number;
}

export interface GeneratedDeadline {
  title: string;
  description: string;
  deadlineDate: string;
  category: "opt" | "visa" | "travel" | "tax" | "sevis" | "document" | "custom";
  severity: "critical" | "warning" | "info";
}

export function generateSystemDeadlines(student: StudentDeadlineInput): GeneratedDeadline[] {
  const deadlines: GeneratedDeadline[] = [];
  const today = new Date();

  // OPT application window (90 days before program end)
  if (student.programEndDate) {
    const programEnd = safeParse(student.programEndDate);
    if (!programEnd) return deadlines;
    const optApplyBy = new Date(programEnd);
    optApplyBy.setDate(optApplyBy.getDate() - 90);
    if (isAfter(optApplyBy, today)) {
      deadlines.push({
        title: "Apply for Post-Completion OPT",
        description:
          "USCIS recommends applying 90 days before your program end date. EAD processing takes 3-5 months.",
        deadlineDate: format(optApplyBy, "yyyy-MM-dd"),
        category: "opt",
        severity: differenceInCalendarDays(optApplyBy, today) < 30 ? "critical" : "warning",
      });
    }
  }

  // EAD expiration
  if (student.eadEndDate) {
    const eadEnd = safeParse(student.eadEndDate);
    if (!eadEnd) return deadlines;
    const daysToEAD = differenceInCalendarDays(eadEnd, today);
    if (daysToEAD > 0 && daysToEAD <= 90) {
      deadlines.push({
        title: "EAD Card Expiring Soon",
        description: `Your Employment Authorization Document expires on ${student.eadEndDate}. Apply for STEM OPT extension if eligible.`,
        deadlineDate: student.eadEndDate,
        category: "opt",
        severity: daysToEAD <= 30 ? "critical" : "warning",
      });
    }
  }

  // Passport expiry (alert at 6 months out — needed for visa stamp renewal)
  if (student.passportExpiry) {
    const passportExp = safeParse(student.passportExpiry);
    if (!passportExp) return deadlines;
    const daysToPassport = differenceInCalendarDays(passportExp, today);
    if (daysToPassport > 0 && daysToPassport <= 180) {
      deadlines.push({
        title: "Passport Expiring — Renew Before Travel",
        description:
          "Your passport expires within 6 months. Most countries require 6-month validity for entry. Renew before your next international trip.",
        deadlineDate: student.passportExpiry,
        category: "document",
        severity: daysToPassport <= 60 ? "critical" : "warning",
      });
    }
  }

  // Tax deadline (April 15 each year) — always show the next upcoming deadline
  let taxDeadline = new Date(today.getFullYear(), 3, 15); // April 15
  if (differenceInCalendarDays(taxDeadline, today) <= 0) {
    // This year's deadline has passed — show next year's
    taxDeadline = new Date(today.getFullYear() + 1, 3, 15);
  }
  const daysToTax = differenceInCalendarDays(taxDeadline, today);
  deadlines.push({
    title: `File ${taxDeadline.getFullYear() - 1} Tax Return (Form 1040-NR)`,
    description:
      "F-1 students must file Form 1040-NR by April 15. Even with no income, file Form 8843. Use Sprintax or Glacier Tax Prep.",
    deadlineDate: format(taxDeadline, "yyyy-MM-dd"),
    category: "tax",
    severity: daysToTax <= 14 ? "critical" : daysToTax <= 60 ? "warning" : "info",
  });

  // Unemployment warning
  if (student.unemploymentDaysUsed > 0 && student.unemploymentLimit > 0) {
    const remaining = student.unemploymentLimit - student.unemploymentDaysUsed;
    if (remaining <= 30) {
      const estimatedLimitDate = new Date(today);
      estimatedLimitDate.setDate(estimatedLimitDate.getDate() + remaining);
      deadlines.push({
        title: "OPT Unemployment Limit Approaching",
        description: `You have ${remaining} unemployment days remaining (${student.unemploymentDaysUsed}/${student.unemploymentLimit} used). Exceeding the limit will terminate your OPT authorization.`,
        deadlineDate: format(estimatedLimitDate, "yyyy-MM-dd"),
        category: "opt",
        severity: remaining <= 10 ? "critical" : "warning",
      });
    }
  }

  return deadlines;
}

// ---- Re-entry Document Checklist ----
export function generateReentryChecklist(student: {
  hasEAD: boolean;
  optType: string | null;
  i20TravelSignatureDate: string | null;
}): { item: string; required: boolean; note: string }[] {
  const items = [
    {
      item: "Valid passport (6+ months validity beyond return date)",
      required: true,
      note: "If passport expires soon, renew before travel",
    },
    {
      item: "Valid F-1 visa stamp in passport",
      required: true,
      note: "Not required if eligible for automatic revalidation (Canada/Mexico/Caribbean)",
    },
    {
      item: student.hasEAD
        ? "Form I-20 with travel signature less than 6 months old (OPT/STEM OPT rule)"
        : "Form I-20 with travel signature less than 12 months old",
      required: true,
      note: student.i20TravelSignatureDate
        ? `Your travel signature is from ${student.i20TravelSignatureDate}${student.hasEAD ? " — verify it is within 6 months" : ""}`
        : "Contact your DSO to get travel signature before departing",
    },
    {
      item: "Printed I-94 admission record",
      required: true,
      note: "Print from cbp.dhs.gov/I94",
    },
    {
      item: "Proof of enrollment / student status letter",
      required: false,
      note: "Request from registrar — helpful if questioned by CBP",
    },
  ];

  if (student.hasEAD) {
    items.push({
      item: "EAD (Employment Authorization Document)",
      required: true,
      note: "Required for re-entry if on OPT. Keep original, bring copy too.",
    });
    items.push({
      item: "Employment letter from employer",
      required: false,
      note: "Strongly recommended — proves you have authorized employment",
    });
    items.push({
      item: "Recent pay stubs (last 2-3 months)",
      required: false,
      note: "Additional proof of employment status on OPT",
    });
  }

  return items;
}
