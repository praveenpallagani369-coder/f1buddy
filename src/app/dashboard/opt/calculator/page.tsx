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
    note: "You must FILE with USCIS in this window. Apply as early as possible.",
  });

  results.push({
    label: "Recommended Application Date",
    value: format(subDays(progEnd, 90), "MMM d, yyyy"),
    status: isAfter(today, subDays(progEnd, 90)) ? "critical" : "warning",
    note: "Apply on or before this date to get the earliest possible EAD start date.",
  });

  if (input.optStartDate) {
    const optStart = parseISO(input.optStartDate);
    results.push({
      label: "Earliest Work Start Date",
      value: format(optStart, "MMM d, yyyy"),
      status: "success",
      note: "This is the date printed on your EAD. You CANNOT work before this date, even if application is approved early.",
    });

    results.push({
      label: "60-Day Grace Period Starts",
      value: format(optStart, "MMM d, yyyy"),
      status: "info",
      note: `You have a 60-day grace period after your OPT expires to prepare to leave or change status. NOT extra work authorization.`,
    });

    // Gap between program end and OPT start
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
    const gracePeriod = addDays(eadEnd, 60);

    results.push({
      label: "OPT Authorization Ends",
      value: format(eadEnd, "MMM d, yyyy"),
      status: daysToEnd < 30 ? "critical" : daysToEnd < 90 ? "warning" : "info",
      note: `${daysToEnd > 0 ? `${daysToEnd} days remaining` : "Expired"}. You must stop working on this date unless STEM extension is approved.`,
    });

    results.push({
      label: "60-Day Grace Period Ends",
      value: format(gracePeriod, "MMM d, yyyy"),
      status: "info",
      note: "Last day to depart, change status, or have STEM extension approved. You CANNOT work during grace period.",
    });

    // STEM extension deadline
    if (input.optType === "stem_eligible") {
      const stemApplyBy = subDays(eadEnd, 90);
      results.push({
        label: "STEM Extension Apply By",
        value: format(stemApplyBy, "MMM d, yyyy"),
        status: isAfter(today, stemApplyBy) ? "critical" : differenceInCalendarDays(stemApplyBy, today) < 30 ? "warning" : "info",
        note: "Must FILE STEM extension application at least 90 days before OPT expires. If pending when OPT expires, you have a 180-day automatic extension to continue working.",
      });

      results.push({
        label: "Cap-Gap Work Authorization (if STEM pending)",
        value: "180 days past OPT expiry",
        status: "info",
        note: "If STEM extension was timely filed and is pending when OPT expires, you get an automatic 180-day extension to keep working.",
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
      note: "After this date, your work authorization ends. Options: H-1B cap-gap, change of status, or depart US.",
    });

    results.push({
      label: "Total OPT Work Authorization",
      value: input.optStartDate
        ? `${differenceInCalendarDays(stemEnd, parseISO(input.optStartDate))} days`
        : "—",
      status: "success",
      note: "12 months OPT + 24 months STEM extension = up to 36 months total for eligible STEM degree holders.",
    });
  }

  return results;
}

const STATUS_STYLES = {
  info: { bg: "bg-blue-900/20 border-blue-800/30", dot: "bg-blue-400", text: "text-blue-300" },
  warning: { bg: "bg-amber-900/20 border-amber-800/30", dot: "bg-amber-400", text: "text-amber-300" },
  critical: { bg: "bg-red-900/20 border-red-800/30", dot: "bg-red-400", text: "text-red-300" },
  success: { bg: "bg-emerald-900/20 border-emerald-800/30", dot: "bg-emerald-400", text: "text-emerald-300" },
};

export default function CalculatorPage() {
  const [form, setForm] = useState({
    programEndDate: "",
    optType: "standard",
    optStartDate: "",
    eadEndDate: "",
    stemEndDate: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const results = calculate(form);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-slate-500 hover:text-slate-300 text-sm">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-white">Employment Authorization Calculator</h1>
      </div>
      <p className="text-slate-400 text-sm -mt-4">
        Enter your dates to see exactly when you can work, when you must stop, and all critical deadlines.
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Your Dates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">OPT Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "standard", label: "Standard OPT", sub: "12 months" },
                    { value: "stem_eligible", label: "STEM OPT", sub: "12 + 24 months" },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => set("optType", opt.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${form.optType === opt.value ? "border-indigo-600 bg-indigo-600/10" : "border-slate-700 hover:border-slate-600"}`}>
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Program End Date *</label>
                <Input type="date" value={form.programEndDate} onChange={(e) => set("programEndDate", e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">The I-20 program end date (not graduation date)</p>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">OPT Start Date (EAD)</label>
                <Input type="date" value={form.optStartDate} onChange={(e) => set("optStartDate", e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">The start date printed on your EAD card</p>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">OPT End Date (EAD)</label>
                <Input type="date" value={form.eadEndDate} onChange={(e) => set("eadEndDate", e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">The end date printed on your EAD card</p>
              </div>
              {form.optType === "stem_eligible" && (
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">STEM Extension End Date</label>
                  <Input type="date" value={form.stemEndDate} onChange={(e) => set("stemEndDate", e.target.value)} />
                  <p className="text-xs text-slate-500 mt-1">If STEM extension approved: end date on new EAD</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key rules */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-400">Key Rules — Know These</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-500">
                <li className="flex gap-2"><span className="text-red-400">✗</span> Cannot work before EAD start date printed on card</li>
                <li className="flex gap-2"><span className="text-red-400">✗</span> Cannot work after EAD end date (unless STEM extension approved)</li>
                <li className="flex gap-2"><span className="text-red-400">✗</span> Receipt notice does NOT authorize work — only physical EAD card</li>
                <li className="flex gap-2"><span className="text-amber-400">△</span> STEM: must have E-Verify employer</li>
                <li className="flex gap-2"><span className="text-amber-400">△</span> STEM: timely filed = 180-day automatic extension</li>
                <li className="flex gap-2"><span className="text-emerald-400">✓</span> Grace period = 60 days to change status, NOT to work</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
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
                      <p className="text-xs text-slate-500 mb-0.5">{r.label}</p>
                      <p className={`font-semibold text-sm ${s.text}`}>{r.value}</p>
                      {r.note && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.note}</p>}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {results.length > 0 && (
            <div className="text-xs text-slate-600 text-center pt-2">
              Always verify with your DSO or immigration attorney. Rules change.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
