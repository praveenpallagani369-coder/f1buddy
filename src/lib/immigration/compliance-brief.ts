import { differenceInDays, parseISO } from "date-fns";

export interface ComplianceStatus {
  status: "all_clear" | "warning" | "critical";
  oneLiner: string;
  daysRemaining?: number;
  category: string;
}

export function generateComplianceBrief(data: {
  optStatus?: any;
  deadlines?: any[];
  travelRecords?: any[];
  documents?: any[];
}): ComplianceStatus {
  const today = new Date();

  // 1. Check OPT Unemployment (Highest Priority)
  if (data.optStatus) {
    const used = data.optStatus.unemployment_days_used || 0;
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

  // 4. Check Travel Rules
  const activeTrip = data.travelRecords?.find(t => !t.return_date);
  if (activeTrip) {
    const daysOut = differenceInDays(today, parseISO(activeTrip.departure_date));
    if (daysOut >= 120) { // Close to 5-month rule
      return {
        status: "warning",
        oneLiner: `✈️ Day ${daysOut} abroad — remember the 5-month rule for F-1 students.`,
        daysRemaining: 150 - daysOut,
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
