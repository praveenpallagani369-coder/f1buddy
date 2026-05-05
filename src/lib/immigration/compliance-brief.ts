import { differenceInDays, parseISO, addMonths } from "date-fns";
import { checkFiveMonthRule } from "./rules";

export interface ComplianceStatus {
  status: "all_clear" | "warning" | "critical";
  oneLiner: string;
  daysRemaining?: number;
  category: string;
}

export function generateComplianceBrief(data: {
  optStatus?: any;
  /** When set (from live calculateUnemploymentDays), overrides DB unemployment_days_used */
  liveUnemploymentDays?: number;
  deadlines?: any[];
  travelRecords?: any[];
  documents?: any[];
}): ComplianceStatus {
  const today = new Date();

  // 1. Check OPT Unemployment (Highest Priority)
  if (data.optStatus) {
    const used =
      typeof data.liveUnemploymentDays === "number"
        ? data.liveUnemploymentDays
        : data.optStatus.unemployment_days_used || 0;
    const limit = data.optStatus.unemployment_limit || 90;
    const remaining = limit - used;

    if (remaining <= 7) {
      return {
        status: "critical",
        oneLiner: `CRITICAL: Only ${remaining} unemployment days left. You must report employment immediately.`,
        daysRemaining: remaining,
        category: "OPT",
      };
    }
    if (remaining <= 30) {
      return {
        status: "warning",
        oneLiner: `Day ${used} of ${limit} — you have ${remaining} unemployment days remaining.`,
        daysRemaining: remaining,
        category: "OPT",
      };
    }
  }

  // 2. Check Upcoming Critical Deadlines
  const criticalDeadline = data.deadlines?.find(d => 
    d.severity === "critical" && 
    d.status === "pending" &&
    differenceInDays(parseISO(d.deadline_date), today) <= 14
  );

  if (criticalDeadline) {
    const days = differenceInDays(parseISO(criticalDeadline.deadline_date), today);
    return {
      status: "critical",
      oneLiner: `URGENT: ${criticalDeadline.title} is due in ${days} day${days === 1 ? "" : "s"}.`,
      daysRemaining: days,
      category: "Deadline",
    };
  }

  // 3. Check Expiring Documents
  const expiringDoc = data.documents?.find(d => 
    d.expiration_date && 
    differenceInDays(parseISO(d.expiration_date), today) <= 30
  );

  if (expiringDoc) {
    const days = differenceInDays(parseISO(expiringDoc.expiration_date), today);
    return {
      status: "warning",
      oneLiner: `Your ${expiringDoc.doc_type} expires in ${days} days. Renew it soon!`,
      daysRemaining: days,
      category: "Document",
    };
  }

  // 4. Check Travel Rules — 5-month rule is a CONTINUOUS absence > 5 calendar months
  const activeTrip = data.travelRecords?.find(
    (t: { return_date: string | null; departure_date?: string }) => !t.return_date && t.departure_date
  );
  if (activeTrip?.departure_date) {
    const daysOut = differenceInDays(today, parseISO(activeTrip.departure_date));
    const mapped = {
      departureDate: activeTrip.departure_date,
      returnDate: activeTrip.return_date as string | null,
    };
    const { violated } = checkFiveMonthRule([mapped]);
    const fiveMonthMark = addMonths(parseISO(activeTrip.departure_date), 5);
    const daysToLimit = Math.max(0, differenceInDays(fiveMonthMark, today));
    const approaching = !violated && daysToLimit > 0 && daysToLimit <= 45;
    if (violated || approaching) {
      return {
        status: violated ? "critical" : "warning",
        oneLiner: violated
          ? `✈️ You've been outside the US for over 5 continuous months — SEVIS may be at risk. Contact your DSO immediately.`
          : `✈️ Day ${daysOut} abroad — approaching the 5-month continuous absence limit (${daysToLimit} calendar days to threshold).`,
        daysRemaining: daysToLimit,
        category: "Travel",
      };
    }
  }

  // 5. Default "All Clear"
  return {
    status: "all_clear",
    oneLiner: "✅ All clear — you are in full compliance with your visa requirements today.",
    category: "General",
  };
}
