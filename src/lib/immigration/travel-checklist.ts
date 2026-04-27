// ============================================================
// Pre-Travel Checklist Generator — Domain Logic
// CFR: 8 CFR 214.2(f)(5), 22 CFR 41.112 (visa stamp)
// ============================================================
import { differenceInCalendarDays, parseISO, format, addMonths, isAfter } from "date-fns";

export type CheckStatus = "pass" | "warn" | "fail" | "unknown";

export interface CheckItem {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
  action: string | null;
  cfr: string | null;
}

export interface TravelChecklistInput {
  departureDate: string;
  returnDate: string | null;
  // User profile fields
  i20TravelSignatureDate: string | null;
  visaStampExpiry: string | null;
  passportExpiry: string | null;
  programEndDate: string | null;
  // OPT status
  hasEAD: boolean;
  eadEndDate: string | null;
  unemploymentDaysUsed: number;
  unemploymentLimit: number;
  optType: string | null;
  // Documents
  documents: { docType: string; expirationDate: string | null }[];
}

export function generateTravelChecklist(input: TravelChecklistInput): CheckItem[] {
  const departure = parseISO(input.departureDate);
  const returnDate = input.returnDate ? parseISO(input.returnDate) : null;
  const tripDays = returnDate ? differenceInCalendarDays(returnDate, departure) : null;

  const items: CheckItem[] = [];

  // ── 1. Passport validity ──────────────────────────────────
  if (!input.passportExpiry) {
    items.push({
      id: "passport",
      title: "Valid Passport",
      status: "unknown",
      detail: "Passport expiry date not recorded. Add it in your Documents vault.",
      action: "Upload passport to Document Vault",
      cfr: null,
    });
  } else {
    const exp = parseISO(input.passportExpiry);
    const checkDate = returnDate ?? new Date(departure.getTime() + 90 * 86400000);
    const daysValid = differenceInCalendarDays(exp, checkDate);
    items.push({
      id: "passport",
      title: "Passport Valid for Entire Trip",
      status: daysValid < 0 ? "fail" : daysValid < 60 ? "warn" : "pass",
      detail: daysValid < 0
        ? `Your passport expired on ${input.passportExpiry}. You cannot travel internationally.`
        : daysValid < 60
        ? `Passport expires ${input.passportExpiry} — only ${daysValid} days after your return. Many countries require 6-month validity.`
        : `Passport valid until ${input.passportExpiry} ✓`,
      action: daysValid < 180 ? "Renew passport before travel — allow 6-10 weeks for processing" : null,
      cfr: null,
    });
  }

  // ── 2. F-1 Visa Stamp ────────────────────────────────────
  // Auto-revalidation applies if traveling to Canada, Mexico, or adjacent islands
  // and visa stamp expired less than 30 days ago
  if (!input.visaStampExpiry) {
    items.push({
      id: "visa_stamp",
      title: "F-1 Visa Stamp Validity",
      status: "unknown",
      detail: "Visa stamp expiry not recorded. Add it to your profile.",
      action: "Add visa stamp expiry in Profile → Edit Profile",
      cfr: "22 CFR 41.112",
    });
  } else {
    const exp = parseISO(input.visaStampExpiry);
    const daysAtReturn = returnDate ? differenceInCalendarDays(exp, returnDate) : differenceInCalendarDays(exp, departure);
    items.push({
      id: "visa_stamp",
      title: "F-1 Visa Stamp Valid for Re-Entry",
      status: daysAtReturn < 0 ? "fail" : daysAtReturn < 30 ? "warn" : "pass",
      detail: daysAtReturn < 0
        ? `Your F-1 visa stamp expired ${input.visaStampExpiry}. You must get a new visa stamp at a US consulate abroad before returning, unless eligible for automatic revalidation (travel to Canada, Mexico, or adjacent islands only).`
        : daysAtReturn < 30
        ? `Visa stamp expires ${input.visaStampExpiry} — very close to your return date. Confirm eligibility before traveling.`
        : `Visa stamp valid until ${input.visaStampExpiry} ✓`,
      action: daysAtReturn < 0 ? "Schedule visa appointment at nearest US consulate or embassy" : null,
      cfr: "22 CFR 41.112",
    });
  }

  // ── 3. I-20 Travel Signature ──────────────────────────────
  // Standard: travel signature valid 1 year
  // On OPT: travel signature valid 6 months
  const sigValidMonths = input.hasEAD ? 6 : 12;
  const sigLabel = input.hasEAD ? "6 months (OPT requirement)" : "12 months";

  if (!input.i20TravelSignatureDate) {
    items.push({
      id: "i20_signature",
      title: "I-20 Travel Signature",
      status: "fail",
      detail: `No travel signature date recorded. Your DSO must sign your I-20 within the last ${sigLabel} for you to re-enter the US.`,
      action: "Contact your DSO immediately to get a travel signature before departing",
      cfr: "8 CFR 214.2(f)(5)(iv)",
    });
  } else {
    const sigDate = parseISO(input.i20TravelSignatureDate);
    const expiryDate = addMonths(sigDate, sigValidMonths);
    const checkDate = returnDate ?? departure;
    const daysValid = differenceInCalendarDays(expiryDate, checkDate);
    const sigExpiry = format(expiryDate, "MMM d, yyyy");
    items.push({
      id: "i20_signature",
      title: "I-20 Travel Signature Current",
      status: daysValid < 0 ? "fail" : daysValid < 30 ? "warn" : "pass",
      detail: daysValid < 0
        ? `Your I-20 travel signature expired ${sigExpiry}. It was valid for ${sigLabel} from ${input.i20TravelSignatureDate}. You need a new signature to re-enter.`
        : daysValid < 30
        ? `Travel signature expires ${sigExpiry} — only ${daysValid} days after return. Get a fresh signature to be safe.`
        : `Travel signature valid until ${sigExpiry} ✓`,
      action: daysValid < 60 ? "Email DSO to request a travel signature on your I-20" : null,
      cfr: "8 CFR 214.2(f)(5)(iv)",
    });
  }

  // ── 4. Program validity ───────────────────────────────────
  if (input.programEndDate) {
    const progEnd = parseISO(input.programEndDate);
    const daysToEnd = differenceInCalendarDays(progEnd, departure);
    const programStatus: CheckStatus =
      daysToEnd < 0 ? "fail" : daysToEnd < 30 ? "warn" : "pass";
    items.push({
      id: "program",
      title: "Program End Date",
      status: programStatus,
      detail: daysToEnd < 0
        ? `Your program ended ${input.programEndDate}. If you have not filed for OPT or a program extension, your F-1 status may be affected.`
        : daysToEnd < 30
        ? `Program ends ${input.programEndDate} — only ${daysToEnd} days away. Confirm your post-program status (OPT/extension) before traveling.`
        : `Program valid until ${input.programEndDate} ✓`,
      action: daysToEnd < 60 ? "Confirm OPT application or I-20 extension with DSO before travel" : null,
      cfr: "8 CFR 214.2(f)(5)",
    });
  }

  // ── 5. EAD (if on OPT) ────────────────────────────────────
  if (input.hasEAD) {
    if (!input.eadEndDate) {
      items.push({
        id: "ead",
        title: "EAD Card (Required for OPT Re-Entry)",
        status: "unknown",
        detail: "EAD end date not recorded. Add it in OPT Tracker.",
        action: "Update EAD dates in OPT Tracker",
        cfr: "8 CFR 274a.12(c)(3)",
      });
    } else {
      const eadExp = parseISO(input.eadEndDate);
      const checkDate = returnDate ?? departure;
      const daysValid = differenceInCalendarDays(eadExp, checkDate);
      items.push({
        id: "ead",
        title: "EAD Card Valid for Return",
        status: daysValid < 0 ? "fail" : daysValid < 30 ? "warn" : "pass",
        detail: daysValid < 0
          ? `Your EAD expired ${input.eadEndDate}. You cannot re-enter on OPT without a valid EAD unless a STEM extension is pending.`
          : daysValid < 30
          ? `EAD expires ${input.eadEndDate} — apply for STEM extension before traveling if eligible.`
          : `EAD valid until ${input.eadEndDate} ✓`,
        action: daysValid < 60 ? "Apply for STEM OPT extension if eligible, or plan return before EAD expiry" : null,
        cfr: "8 CFR 274a.12(c)(3)",
      });
    }

    // OPT unemployment check — traveling while unemployed burns days
    const remaining = input.unemploymentLimit - input.unemploymentDaysUsed;
    if (tripDays !== null && remaining > 0) {
      const afterTrip = input.unemploymentDaysUsed + (tripDays > 0 ? tripDays : 0);
      items.push({
        id: "unemployment",
        title: "OPT Unemployment Days",
        status: afterTrip >= input.unemploymentLimit ? "fail" : afterTrip >= input.unemploymentLimit * 0.8 ? "warn" : "pass",
        detail: `You have used ${input.unemploymentDaysUsed}/${input.unemploymentLimit} unemployment days. Days abroad while unemployed count toward your limit. This ${tripDays}-day trip could bring you to ${Math.min(afterTrip, input.unemploymentLimit)} days used.`,
        action: afterTrip >= input.unemploymentLimit * 0.8 ? "Confirm employment status with DSO before extended travel" : null,
        cfr: "8 CFR 214.2(f)(10)(ii)(E)",
      });
    }
  }

  // ── 6. Trip length (5-month rule) ────────────────────────
  // CFR: 8 CFR 214.2(f)(5)(iv) — 5 calendar months, not a fixed day count
  if (tripDays !== null && tripDays >= 120) {
    const fiveMonthsLater = addMonths(departure, 5);
    const effectiveReturn = returnDate ?? new Date(departure.getTime() + tripDays * 86400000);
    const exceedsFiveMonths = isAfter(effectiveReturn, fiveMonthsLater);
    items.push({
      id: "five_month",
      title: "Trip Length — 5-Month Rule",
      status: exceedsFiveMonths ? "fail" : "warn",
      detail: exceedsFiveMonths
        ? `This trip exceeds 5 calendar months (${format(fiveMonthsLater, "MMM d, yyyy")}). Staying outside the US for 5+ consecutive months may result in automatic SEVIS termination.`
        : `This trip is ${tripDays} days. Approaching the 5-month limit. Consult your DSO before travel.`,
      action: "Speak with your DSO before any trip longer than 5 calendar months",
      cfr: "8 CFR 214.2(f)(5)(iv)",
    });
  }

  return items;
}

export function getOverallStatus(items: CheckItem[]): "pass" | "warn" | "fail" {
  if (items.some((i) => i.status === "fail")) return "fail";
  if (items.some((i) => i.status === "warn" || i.status === "unknown")) return "warn";
  return "pass";
}
