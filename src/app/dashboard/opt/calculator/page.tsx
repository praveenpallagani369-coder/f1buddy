"use client";
import { useState } from "react";
import { parseISO, subDays, format, differenceInCalendarDays, isAfter, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type ResultItem = {
  label: string;
  value: string;
  status: "info" | "warning" | "critical" | "success";
  note?: string;
};

function calculate(input: {
  programEndDate: string;
  optStartDate: string;
  eadEndDate: string;
  stemEndDate: string;
  optType: string;
  stemStatus: string;
}): ResultItem[] {
  const results: ResultItem[] = [];
  const today = new Date();

  if (!input.programEndDate) return results;
  const progEnd = parseISO(input.programEndDate);
  const applyWindow = { start: subDays(progEnd, 90), end: addDays(progEnd, 60) };

  results.push({
    label: "OPT Application Window",
    value: `${format(applyWindow.start, "MMM d, yyyy")} → ${format(applyWindow.end, "MMM d, yyyy")}`,
    status: "info",
    note: "You must FILE with USCIS in this window. Apply as early as possible. [8 CFR 214.2(f)(10)(ii)(A)]",
  });

  results.push({
    label: "Recommended Application Date",
    value: format(subDays(progEnd, 90), "MMM d, yyyy"),
    status: isAfter(today, subDays(progEnd, 90)) ? "critical" : "warning",
    note: "Apply on or before this date to get the earliest possible EAD start date.",
  });

  if (!input.eadEndDate) {
    results.push({
      label: "Grace Period (No OPT Filed)",
      value: `${format(addDays(progEnd, 1), "MMM d, yyyy")} → ${format(addDays(progEnd, 60), "MMM d, yyyy")}`,
      status: "info",
      note: "If you don't apply for OPT, your 60-day grace period starts the day after your I-20 program end date. You CANNOT work during this time. Use it to depart the US, transfer, or change status. [8 CFR 214.2(f)(5)(iv)]",
    });
  }

  if (input.optStartDate) {
    const optStart = parseISO(input.optStartDate);
    results.push({
      label: "Earliest Work Start Date",
      value: format(optStart, "MMM d, yyyy"),
      status: "success",
      note: "This is the date printed on your EAD. You CANNOT work before this date, even if your application is approved early.",
    });

    const gapDays = differenceInCalendarDays(optStart, progEnd);
    if (gapDays > 0) {
      results.push({
        label: "Gap Between Program End & OPT Start",
        value: `${gapDays} days`,
        status: gapDays > 60 ? "critical" : "warning",
        note: gapDays > 60
          ? "Gap exceeds 60 days — this may indicate an issue with your application. Consult your DSO."
          : "Normal gap. You cannot work during this period.",
      });
    }
  }

  if (input.eadEndDate) {
    const eadEnd = parseISO(input.eadEndDate);
    const daysToEnd = differenceInCalendarDays(eadEnd, today);

    results.push({
      label: "OPT Authorization Ends",
      value: format(eadEnd, "MMM d, yyyy"),
      status: daysToEnd < 30 ? "critical" : daysToEnd < 90 ? "warning" : "info",
      note: `${daysToEnd > 0 ? `${daysToEnd} days remaining` : "Expired"}. You must stop working on this date unless a STEM extension is filed and pending.`,
    });

    if (input.optType === "stem_eligible") {
      const stemApplyBy = subDays(eadEnd, 90);
      const daysToApply = differenceInCalendarDays(stemApplyBy, today);
      results.push({
        label: "STEM Extension — File By",
        value: format(stemApplyBy, "MMM d, yyyy"),
        status: isAfter(today, stemApplyBy) ? "critical" : daysToApply < 30 ? "warning" : "info",
        note: "Must FILE STEM extension with USCIS before your OPT EAD expires. Your employer must be E-Verify enrolled. [8 CFR 214.2(f)(10)(ii)(C)]",
      });

      const autoExtEnd = addDays(eadEnd, 180);

      if (input.stemStatus === "pending") {
        results.push({
          label: "180-Day Auto-Extension (STEM Pending)",
          value: `${format(addDays(eadEnd, 1), "MMM d, yyyy")} → ${format(autoExtEnd, "MMM d, yyyy")}`,
          status: "success",
          note: "Your STEM extension was timely filed. You MAY continue working for up to 180 days past your OPT expiry while USCIS adjudicates. Your EAD is automatically extended. [8 CFR 274a.12(b)(6)(iv)]",
        });

        results.push({
          label: "Grace Period (if STEM Approved During Auto-Ext)",
          value: "60 days after STEM EAD end date",
          status: "info",
          note: "If STEM is approved, your 60-day grace period starts after your new STEM EAD expires — NOT after the original OPT. The auto-extension merges into STEM authorization.",
        });

        results.push({
          label: "Grace Period (if STEM Denied During Auto-Ext)",
          value: "Starts on denial date",
          status: "warning",
          note: "If USCIS denies your STEM extension, the 60-day grace period begins on the date of denial. You must STOP working immediately on denial. Use the grace period to depart, transfer, or change status. [SEVP FAQ; 8 CFR 214.2(f)(5)(iv)]",
        });

        results.push({
          label: "Auto-Extension Expires (if no decision)",
          value: format(autoExtEnd, "MMM d, yyyy"),
          status: "warning",
          note: "If USCIS hasn't decided your STEM case by this date, the 180-day auto-extension ends. You must STOP working. Your 60-day grace period then begins.",
        });

        const autoExtGraceEnd = addDays(autoExtEnd, 60);
        results.push({
          label: "Grace Period After Auto-Ext Expires",
          value: `${format(addDays(autoExtEnd, 1), "MMM d, yyyy")} → ${format(autoExtGraceEnd, "MMM d, yyyy")}`,
          status: "info",
          note: "If the 180-day auto-extension runs out with no USCIS decision, this is your final 60-day grace period. NO work allowed. Depart US, change status, or transfer.",
        });
      } else if (input.stemStatus === "not_filed") {
        const graceStart = addDays(eadEnd, 1);
        const graceEnd = addDays(eadEnd, 60);
        results.push({
          label: "60-Day Grace Period (No STEM Filed)",
          value: `${format(graceStart, "MMM d, yyyy")} → ${format(graceEnd, "MMM d, yyyy")}`,
          status: "warning",
          note: "Without a timely STEM extension filing, your 60-day grace period starts the day after your OPT EAD expires. You CANNOT work during this period. [8 CFR 214.2(f)(5)(iv)]",
        });
      } else {
        results.push({
          label: "60-Day Grace Period (After OPT Ends)",
          value: `${format(addDays(eadEnd, 1), "MMM d, yyyy")} → ${format(addDays(eadEnd, 60), "MMM d, yyyy")}`,
          status: "info",
          note: "Grace period begins the day after your OPT authorization ends. You CANNOT work during this period. Use it to depart, transfer, or change status. [8 CFR 214.2(f)(5)(iv)]",
        });
      }
    } else {
      results.push({
        label: "60-Day Grace Period Starts",
        value: format(addDays(eadEnd, 1), "MMM d, yyyy"),
        status: "info",
        note: "Grace period begins the day after your OPT authorization ends. You CANNOT work during this period. [8 CFR 214.2(f)(5)(iv)]",
      });

      results.push({
        label: "60-Day Grace Period Ends",
        value: format(addDays(eadEnd, 60), "MMM d, yyyy"),
        status: daysToEnd < 0 ? "critical" : "info",
        note: "Last day to depart, change status, or transfer. You CANNOT work during the grace period.",
      });
    }
  }

  if (input.stemEndDate && input.optType === "stem_eligible") {
    const stemEnd = parseISO(input.stemEndDate);
    const daysToStem = differenceInCalendarDays(stemEnd, today);
    results.push({
      label: "STEM Extension Ends",
      value: format(stemEnd, "MMM d, yyyy"),
      status: daysToStem < 30 ? "critical" : daysToStem < 90 ? "warning" : "info",
      note: `${daysToStem > 0 ? `${daysToStem} days remaining` : "Expired"}. After this date, your work authorization ends. Options: H-1B cap-gap, change of status, or depart US.`,
    });

    results.push({
      label: "Grace Period After STEM Ends",
      value: `${format(addDays(stemEnd, 1), "MMM d, yyyy")} → ${format(addDays(stemEnd, 60), "MMM d, yyyy")}`,
      status: daysToStem < 0 ? "critical" : "info",
      note: "60-day grace period after STEM OPT expires. NO work allowed. This is your final grace period — depart US, change status, or have H-1B cap-gap. [8 CFR 214.2(f)(5)(iv)]",
    });

    results.push({
      label: "Total OPT + STEM Work Authorization",
      value: input.optStartDate
        ? `${differenceInCalendarDays(stemEnd, parseISO(input.optStartDate))} days (~${Math.round(differenceInCalendarDays(stemEnd, parseISO(input.optStartDate)) / 30.44)} months)`
        : "—",
      status: "success",
      note: "12 months OPT + 24 months STEM extension = up to 36 months total for eligible STEM degree holders.",
    });
  }

  return results;
}

const STATUS_STYLES = {
  info: { bg: "bg-blue-50 border-blue-200", dot: "bg-blue-400", text: "text-blue-700" },
  warning: { bg: "bg-amber-50 border-amber-200", dot: "bg-amber-400", text: "text-amber-700" },
  critical: { bg: "bg-red-50 border-red-200", dot: "bg-red-400", text: "text-red-700" },
  success: { bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400", text: "text-emerald-700" },
};

export default function CalculatorPage() {
  const [form, setForm] = useState({
    programEndDate: "",
    optType: "standard",
    optStartDate: "",
    eadEndDate: "",
    stemEndDate: "",
    stemStatus: "not_filed",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const results = calculate(form);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-gray-500 hover:text-gray-700 text-sm font-medium">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Employment Authorization Calculator</h1>
      </div>
      <p className="text-gray-600 text-sm -mt-4">
        Enter your dates to see exactly when you can work, when you must stop, and all critical deadlines.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Your Dates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">OPT Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "standard", label: "Standard OPT", sub: "12 months" },
                    { value: "stem_eligible", label: "STEM OPT", sub: "12 + 24 months" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => set("optType", opt.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${form.optType === opt.value ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-400"}`}>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Program End Date *</label>
                <Input type="date" value={form.programEndDate} onChange={(e) => set("programEndDate", e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">The I-20 program end date (not graduation date)</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">OPT Start Date (EAD)</label>
                <Input type="date" value={form.optStartDate} onChange={(e) => set("optStartDate", e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">The start date printed on your EAD card</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">OPT End Date (EAD)</label>
                <Input type="date" value={form.eadEndDate} onChange={(e) => set("eadEndDate", e.target.value)} />
                <p className="text-xs text-gray-500 mt-1">The end date printed on your EAD card</p>
              </div>
              {form.optType === "stem_eligible" && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1.5">STEM Extension Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "not_filed", label: "Not Filed", sub: "Haven't applied yet" },
                        { value: "pending", label: "Pending", sub: "Filed, awaiting decision" },
                        { value: "approved", label: "Approved", sub: "Have new EAD" },
                      ].map((opt) => (
                        <button key={opt.value} onClick={() => set("stemStatus", opt.value)}
                          className={`p-2.5 rounded-lg border text-left transition-colors ${form.stemStatus === opt.value ? "border-indigo-600 bg-indigo-50" : "border-gray-200 hover:border-gray-400"}`}>
                          <p className="text-xs font-medium text-gray-900">{opt.label}</p>
                          <p className="text-[10px] text-gray-500">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {form.stemStatus === "approved" && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1.5">STEM Extension End Date</label>
                      <Input type="date" value={form.stemEndDate} onChange={(e) => set("stemEndDate", e.target.value)} />
                      <p className="text-xs text-gray-500 mt-1">End date on your new STEM EAD card</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Key rules */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-gray-700">Key Rules — Know These</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex gap-2"><span className="text-red-600">✗</span> Cannot work before EAD start date printed on card</li>
                <li className="flex gap-2"><span className="text-red-600">✗</span> Cannot work after EAD end date (unless STEM pending → 180-day auto-ext)</li>
                <li className="flex gap-2"><span className="text-red-600">✗</span> Receipt notice does NOT authorize work — only physical EAD card</li>
                <li className="flex gap-2"><span className="text-red-600">✗</span> CANNOT work during any grace period</li>
                <li className="flex gap-2"><span className="text-amber-600">△</span> STEM: must have E-Verify employer + timely file before OPT expires</li>
                <li className="flex gap-2"><span className="text-amber-600">△</span> STEM pending at OPT expiry = 180-day auto-extension to keep working</li>
                <li className="flex gap-2"><span className="text-amber-600">△</span> If STEM denied during auto-ext, grace period starts on denial date</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Grace period = 60 days to depart, transfer, or change status</li>
                <li className="flex gap-2"><span className="text-emerald-600">✓</span> Each authorization type gets its own grace period after it ends</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-amber-600">Proposed Rule Change</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600 leading-relaxed">
                USCIS has proposed reducing the post-completion OPT grace period from <strong className="text-gray-800">60 days to 30 days</strong> (NPRM published January 2025). This is NOT yet final — the current rule remains 60 days. Monitor the Federal Register for updates. This calculator uses the current 60-day rule.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              Enter your program end date to see results
            </div>
          ) : (
            results.map((r, i) => {
              const s = STATUS_STYLES[r.status];
              return (
                <div key={i} className={`p-4 rounded-xl border ${s.bg}`}>
                  <div className="flex items-start gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-medium mb-0.5">{r.label}</p>
                      <p className={`font-semibold text-sm ${s.text}`}>{r.value}</p>
                      {r.note && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{r.note}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {results.length > 0 && (
            <div className="text-xs text-gray-500 text-center pt-2">
              Always verify with your DSO or immigration attorney. Rules change.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
