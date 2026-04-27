"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { addMonths, parseISO, differenceInCalendarDays, format, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// STEM OPT requires 4 validation reports: at 6, 12, 18, 24 months
// Student must report to DSO within 10 business days (~14 calendar days) of each milestone
// DSO then has 10 business days to enter in SEVIS — MISSING IS NON-RECOVERABLE
const REPORT_MONTHS = [6, 12, 18, 24];
// Months 12 and 24 also require a self-evaluation (I-983 page 5) in addition to validation report
const SELF_EVAL_MONTHS = new Set([12, 24]);

// I-983 validation checklist items required for each report
const VALIDATION_CHECKLIST = [
  { id: "employer_sign", label: "Employer supervisor signs I-983 Section 7 (Employer Attestation)", critical: true },
  { id: "student_sign", label: "Student signs I-983 Section 6 (Student Attestation)", critical: true },
  { id: "training_eval", label: "Training goals evaluated — mark achieved, ongoing, or modified", critical: true },
  { id: "salary_confirm", label: "Confirm salary is equivalent to US workers in same role and location", critical: true },
  { id: "submit_dso", label: "Submit completed I-983 to DSO (do not send to USCIS directly)", critical: true },
  { id: "sevis_update", label: "Confirm DSO updated your SEVIS record in the SEVP portal", critical: true },
  { id: "copy_keep", label: "Keep a copy of the signed I-983 for your records", critical: false },
];

interface ReportWindow {
  index: number;
  month: number;
  reportDate: Date;           // exact date the report is due
  windowEnd: Date;            // ~14 calendar days (10 business days) after report date
  label: string;
  daysUntilReport: number;
  daysUntilWindowEnd: number;
  status: "completed" | "active_window" | "upcoming" | "missed";
  isCurrentWindow: boolean;
  urgency: "critical" | "warning" | "ok" | "missed";
  requiresSelfEvaluation: boolean;
}

function buildReportWindows(stemStartDate: string): ReportWindow[] {
  const start = parseISO(stemStartDate);
  const today = new Date();

  return REPORT_MONTHS.map((month, i) => {
    const reportDate = addMonths(start, month);
    // 10 business days ≈ 14 calendar days — student must report to DSO within this window
    const windowEnd = addDays(reportDate, 14);
    const daysUntilReport = differenceInCalendarDays(reportDate, today);
    const daysUntilWindowEnd = differenceInCalendarDays(windowEnd, today);

    let status: ReportWindow["status"];
    let urgency: ReportWindow["urgency"];

    if (daysUntilWindowEnd < 0) {
      status = "missed"; urgency = "missed";
    } else if (today >= reportDate && today <= windowEnd) {
      status = "active_window"; urgency = daysUntilWindowEnd <= 7 ? "critical" : "warning";
    } else if (daysUntilReport <= 30) {
      status = "upcoming"; urgency = "warning";
    } else {
      status = "upcoming"; urgency = "ok";
    }

    return {
      index: i,
      month,
      reportDate,
      windowEnd,
      label: `${month}-Month Validation Report${SELF_EVAL_MONTHS.has(month) ? " + Self-Evaluation" : ""}`,
      daysUntilReport,
      daysUntilWindowEnd,
      status,
      isCurrentWindow: status === "active_window",
      urgency,
      requiresSelfEvaluation: SELF_EVAL_MONTHS.has(month),
    };
  });
}

export default function STEMReportsPage() {
  const supabase = createClient();
  const [opt, setOpt] = useState<{ opt_type: string | null; ead_start_date: string | null; [key: string]: unknown } | null>(null);
  const [completedReports, setCompletedReports] = useState<Set<number>>(new Set());
  const [hasStemDeadlines, setHasStemDeadlines] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("opt_status").select("*").eq("user_id", user.id).single();
      setOpt(data);

      // Load completed report records from deadlines marked as completed
      const { data: deadlines } = await supabase
        .from("compliance_deadlines")
        .select("title, status")
        .eq("user_id", user.id)
        .like("title", "%STEM Validation Report%")
        .eq("status", "completed");

      const completed = new Set<number>();
      deadlines?.forEach(d => {
        REPORT_MONTHS.forEach(m => {
          if (d.title.includes(`${m}-Month`) && d.status === "completed") completed.add(m);
        });
      });
      setCompletedReports(completed);

      // Check if STEM deadlines exist at all (for existing STEM users)
      const { count } = await supabase
        .from("compliance_deadlines")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .like("title", "%STEM OPT%Validation Report%");
      setHasStemDeadlines((count ?? 0) > 0);

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markReportComplete(report: ReportWindow) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark the deadline as completed, create if not exists
    const title = `STEM OPT ${report.month}-Month Validation Report`;
    const { data: existing } = await supabase
      .from("compliance_deadlines")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", title)
      .single();

    if (existing) {
      await supabase.from("compliance_deadlines")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("compliance_deadlines").insert({
        user_id: user.id,
        title,
        description: `${report.month}-month I-983 validation report submitted to DSO`,
        deadline_date: format(report.windowEnd, "yyyy-MM-dd"),
        category: "opt",
        severity: "critical",
        status: "completed",
        is_system_generated: true,
      });
    }

    setCompletedReports(prev => new Set(Array.from(prev).concat(report.month)));
    setSaving(false);
  }

  async function generateSTEMDeadlines(stemStartDate: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const start = parseISO(stemStartDate);
    const deadlines = REPORT_MONTHS.map(month => ({
      user_id: user.id,
      title: `STEM OPT ${month}-Month Validation Report${SELF_EVAL_MONTHS.has(month) ? " + Self-Evaluation" : ""}`,
      description: SELF_EVAL_MONTHS.has(month)
        ? `Submit I-983 validation report AND self-evaluation (I-983 page 5, signed by you and employer) to DSO. You have 10 business days from this date to report. CFR: 8 CFR 214.2(f)(10)(ii)(C).`
        : `Submit I-983 validation report to DSO. You have 10 business days from this date to report to DSO. CFR: 8 CFR 214.2(f)(10)(ii)(C).`,
      deadline_date: format(addMonths(start, month), "yyyy-MM-dd"),
      category: "opt",
      severity: "critical",
      status: "pending",
      is_system_generated: true,
    }));

    // Upsert — don't duplicate
    for (const d of deadlines) {
      await supabase.from("compliance_deadlines").upsert(d, { onConflict: "user_id,title", ignoreDuplicates: true });
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isStemOPT = opt?.opt_type === "stem_extension";
  const stemStart = isStemOPT ? (opt?.ead_start_date ?? null) : null;
  const reports = stemStart ? buildReportWindows(stemStart) : [];

  const activeWindow = reports.find(r => r.isCurrentWindow);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-gray-400 hover:text-gray-600 text-sm">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900">STEM OPT Validation Reports</h1>
      </div>

      {/* Critical warning banner */}
      <div className="p-4 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm font-bold text-red-700 mb-2">🚨 Non-Recoverable Deadline — Read This First</p>
        <p className="text-sm text-red-800 leading-relaxed">
          STEM OPT requires 4 validation reports (I-983) submitted to your DSO at 6, 12, 18, and 24 months from your STEM EAD start date.
          You have <strong>10 business days (~14 calendar days)</strong> to report to your DSO after each milestone.
          At months 12 and 24, a <strong>self-evaluation (I-983 page 5)</strong> is also required.
          Missing these deadlines can jeopardize your STEM OPT authorization.
        </p>
        <p className="text-xs text-red-600 mt-2 font-mono">Source: 8 CFR 214.2(f)(10)(ii)(C) — 10 business days to DSO, DSO has 10 business days to update SEVIS</p>
      </div>

      {!isStemOPT ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-3">🔬</p>
            <p className="text-gray-900 font-medium mb-1">STEM OPT Extension Not Set Up</p>
            <p className="text-gray-500 text-sm mb-4">Set your OPT type to &ldquo;STEM Extension&rdquo; in the OPT Tracker to see your validation report schedule.</p>
            <Link href="/dashboard/opt"><Button>Go to OPT Tracker →</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active window alert */}
          {activeWindow && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="font-semibold text-amber-700 mb-1">
                ⚠️ ACTIVE: {activeWindow.label} — {activeWindow.daysUntilWindowEnd} days left in 10-business-day window
              </p>
              <p className="text-sm text-amber-800">
                You must report to your DSO by {format(activeWindow.windowEnd, "MMMM d, yyyy")}.
                {activeWindow.requiresSelfEvaluation && " This milestone also requires a self-evaluation (I-983 page 5)."}
                {" "}Submit your I-983 to your DSO NOW.
              </p>
              <button
                onClick={() => setExpandedReport(activeWindow.index)}
                className="text-sm text-amber-700 underline mt-2 block"
              >
                View checklist →
              </button>
            </div>
          )}

          {/* No deadlines banner for existing STEM users */}
          {!hasStemDeadlines && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-700 mb-1">📅 Your STEM report deadlines are not in your Deadlines list</p>
              <p className="text-sm text-amber-800 mb-3">
                Your 4 validation report deadlines (6, 12, 18, 24 months) have not been added to your tracking list yet. Add them now so you get reminders.
              </p>
              <Button onClick={async () => { await generateSTEMDeadlines(stemStart!); setHasStemDeadlines(true); }}>
                📅 Add All 4 STEM Report Deadlines Now
              </Button>
            </div>
          )}

          {/* Generate deadlines button (compact when deadlines already exist) */}
          {hasStemDeadlines && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => generateSTEMDeadlines(stemStart!)}>
                📅 Refresh Deadlines
              </Button>
            </div>
          )}

          {/* Report timeline */}
          <div className="space-y-4">
            {reports.map((report) => {
              const isDone = completedReports.has(report.month);
              const isExpanded = expandedReport === report.index;
              const urgencyStyles = {
                critical: "border-red-200 bg-red-50",
                warning:  "border-amber-200 bg-amber-50",
                ok:       "border-gray-200",
                missed:   "border-gray-200 opacity-60",
              }[report.urgency];

              return (
                <Card key={report.month} className={`${urgencyStyles} ${isDone ? "opacity-70" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Status circle */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm border-2 ${
                          isDone ? "bg-emerald-600 border-emerald-600 text-gray-900" :
                          report.isCurrentWindow ? "bg-amber-600/20 border-amber-500 text-amber-700" :
                          report.status === "missed" ? "bg-red-900/30 border-red-700 text-red-600" :
                          "bg-white border-gray-200 text-gray-500"
                        }`}>
                          {isDone ? "✓" : report.status === "missed" ? "!" : `${report.month}M`}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className={`font-semibold ${isDone ? "text-gray-500 line-through" : "text-gray-900"}`}>
                              {report.label}
                            </p>
                            {isDone && <Badge variant="success" className="text-xs">✓ Submitted</Badge>}
                            {report.isCurrentWindow && <Badge variant="warning" className="text-xs">Window Open Now</Badge>}
                            {report.status === "missed" && !isDone && <Badge variant="critical" className="text-xs">Window Closed</Badge>}
                          </div>

                          <div className="text-sm text-gray-500 space-y-0.5">
                            <p>Milestone date: <span className="text-gray-700">{format(report.reportDate, "MMM d, yyyy")}</span></p>
                            <p>DSO report by (10 bus. days): <span className={report.daysUntilWindowEnd <= 7 && !isDone ? "text-red-600 font-medium" : "text-gray-700"}>
                              {format(report.windowEnd, "MMM d, yyyy")} ({report.daysUntilWindowEnd > 0 ? `${report.daysUntilWindowEnd}d remaining` : "closed"})
                            </span></p>
                            {report.requiresSelfEvaluation && (
                              <p className="text-violet-400 text-xs">+ Self-evaluation (I-983 page 5) required at this milestone</p>
                            )}
                          </div>

                          {!isDone && report.daysUntilReport <= 30 && report.daysUntilWindowEnd > 0 && (
                            <p className="text-xs text-amber-600 mt-1 font-medium">
                              {report.isCurrentWindow
                                ? `🔴 Submit NOW — ${report.daysUntilWindowEnd} days until window closes`
                                : `⏰ Upcoming in ${report.daysUntilReport} days — prepare I-983 with employer`}
                            </p>
                          )}
                          {report.status === "missed" && !isDone && (
                            <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                              <p className="font-medium mb-1">Window Closed — Contact Your DSO Immediately</p>
                              <p className="leading-relaxed">The 10 business-day reporting window has passed. Contact your DSO as soon as possible. Explain the missed deadline — your DSO may be able to work with SEVP, but this is not guaranteed. Document all attempts to contact your DSO in writing.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        {!isDone && report.daysUntilWindowEnd > 0 && (
                          <button
                            onClick={() => setExpandedReport(isExpanded ? null : report.index)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-200 px-2 py-1 rounded"
                          >
                            {isExpanded ? "Hide" : "Show"} Checklist
                          </button>
                        )}
                        {!isDone && (
                          <button
                            onClick={() => markReportComplete(report)}
                            disabled={saving}
                            className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 px-2 py-1 rounded"
                          >
                            ✓ Mark Submitted
                          </button>
                        )}
                      </div>
                    </div>

                    {/* I-983 Checklist */}
                    {isExpanded && !isDone && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <p className="text-sm font-medium text-gray-900 mb-3">I-983 Submission Checklist</p>
                        <div className="space-y-2">
                          {VALIDATION_CHECKLIST.map((item) => (
                            <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={checklist[`${report.month}-${item.id}`] ?? false}
                                onChange={(e) => setChecklist(c => ({ ...c, [`${report.month}-${item.id}`]: e.target.checked }))}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <span className={`text-sm ${checklist[`${report.month}-${item.id}`] ? "text-gray-400 line-through" : "text-gray-600"}`}>
                                {item.label}
                                {item.critical && <span className="text-red-600 ml-1 text-xs">*required</span>}
                              </span>
                            </label>
                          ))}
                        </div>
                        {report.requiresSelfEvaluation && (
                          <div className="mt-4 p-3 rounded-lg bg-violet-900/20 border border-violet-800/30">
                            <p className="text-sm font-medium text-violet-300 mb-2">Also required at {report.month} months: Self-Evaluation (I-983 page 5)</p>
                            <div className="space-y-2">
                              {[
                                { id: "self_eval_student", label: "Student completes I-983 page 5 (Student Self-Evaluation)", critical: true },
                                { id: "self_eval_employer", label: "Employer supervisor completes I-983 page 5 (Employer Evaluation)", critical: true },
                                { id: "self_eval_submit", label: "Submit completed self-evaluation to DSO together with validation report", critical: true },
                              ].map((item) => (
                                <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checklist[`${report.month}-${item.id}`] ?? false}
                                    onChange={(e) => setChecklist(c => ({ ...c, [`${report.month}-${item.id}`]: e.target.checked }))}
                                    className="mt-0.5 flex-shrink-0"
                                  />
                                  <span className={`text-sm ${checklist[`${report.month}-${item.id}`] ? "text-gray-400 line-through" : "text-violet-200"}`}>
                                    {item.label}
                                    {item.critical && <span className="text-red-600 ml-1 text-xs">*required</span>}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-4 p-3 rounded-lg bg-gray-100 text-xs text-gray-500">
                          <p className="font-medium text-gray-600 mb-1">After submitting to DSO:</p>
                          <ol className="space-y-1 list-decimal list-inside">
                            <li>Confirm DSO received and updated SEVIS in the SEVP Portal</li>
                            <li>Ask DSO to send you confirmation that SEVIS was updated</li>
                            <li>Keep signed I-983 copy indefinitely</li>
                          </ol>
                        </div>
                        <div className="mt-3">
                          <Link href="/dashboard/dso-email?template=stem_recommendation">
                            <button className="text-xs text-indigo-600 hover:underline">✉️ Generate DSO Email for this report →</button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Completion summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Reports submitted</p>
                <div className="flex gap-1">
                  {REPORT_MONTHS.map(m => (
                    <div key={m} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      completedReports.has(m) ? "bg-emerald-600 text-gray-900" : "bg-gray-100 text-gray-400"
                    }`}>
                      {completedReports.has(m) ? "✓" : `${m}M`}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {completedReports.size} of 4 required reports submitted
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
