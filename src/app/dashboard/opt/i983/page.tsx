"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO, format, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const I983_STEPS = [
  {
    id: "get_form",
    title: "Download Latest I-983 Form",
    detail: "Download Form I-983 (Training Plan for STEM OPT Students) from uscis.gov. Use the most current version — older versions may be rejected.",
    action: "Download from uscis.gov/i-983",
    critical: true,
  },
  {
    id: "fill_student",
    title: "Complete Sections 1–4 (Student Sections)",
    detail: "Fill in: student information, employer information, training objectives, and the connection between your training and your STEM degree. Be specific — vague descriptions are a common reason for RFEs.",
    action: "Be specific about how the job relates to your degree field",
    critical: true,
  },
  {
    id: "employer_sign",
    title: "Employer Signs Section 5 (Employer Certification)",
    detail: "Your employer's authorized representative must sign. This is typically HR or a hiring manager. They certify: the position is STEM-related, salary is equivalent to US workers, and they are E-Verify enrolled.",
    action: "Send form to HR or manager — allow 3-5 business days",
    critical: true,
  },
  {
    id: "evverify_confirm",
    title: "Confirm Employer E-Verify Enrollment",
    detail: "STEM OPT is ONLY valid with an E-Verify enrolled employer. Ask HR for the E-Verify Company ID. Verify at e-verify.uscis.gov. If employer is NOT enrolled, you cannot work on STEM OPT with them.",
    action: "Search employer at e-verify.uscis.gov or ask HR for E-Verify ID",
    critical: true,
  },
  {
    id: "submit_dso",
    title: "Submit Signed I-983 to Your DSO",
    detail: "Email the completed, signed I-983 to your DSO. Do NOT send to USCIS — they don't receive I-983 directly. Your DSO uploads it to the SEVP portal and updates your SEVIS record.",
    action: "Email DSO with subject: 'STEM OPT I-983 — [Your Name] — [Employer Name]'",
    critical: true,
  },
  {
    id: "sevis_update",
    title: "Confirm DSO Updated SEVIS",
    detail: "Follow up with your DSO to confirm they updated your SEVIS record in the SEVP portal. Ask for written confirmation. This is what authorizes you to work — without the SEVIS update, your employment is unauthorized.",
    action: "Ask DSO: 'Has my SEVIS record been updated with the new employer?'",
    critical: true,
  },
  {
    id: "start_work",
    title: "Begin Employment",
    detail: "You may begin working once: (1) your EAD start date has arrived, (2) the I-983 is signed, and (3) DSO has updated SEVIS. Do not start before all three are complete.",
    action: "Keep a copy of signed I-983 and DSO confirmation email",
    critical: false,
  },
];

const SEVP_CHECKLIST = [
  "Report employment end to DSO within 10 days of last day",
  "If laid off: report to DSO within 10 days, unemployment clock starts immediately",
  "Submit I-983 final evaluation when employment ends (DSO sends employer the form)",
  "If changing employers: complete new I-983 before starting with new employer",
  "Check-in reports every 6 months while on STEM OPT (see STEM Reports tab)",
];

export default function I983Page() {
  const supabase = createClient();
  const [currentEmployer, setCurrentEmployer] = useState<any>(null);
  const [latestDeadline, setLatestDeadline] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [opt, setOpt] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [empRes, deadlineRes, optRes] = await Promise.all([
        supabase.from("opt_employment").select("*").eq("user_id", user.id).eq("is_current", true).single(),
        supabase.from("compliance_deadlines")
          .select("*").eq("user_id", user.id)
          .like("title", "%Report New Employer%")
          .eq("status", "pending")
          .order("deadline_date")
          .limit(1),
        supabase.from("opt_status").select("opt_type").eq("user_id", user.id).single(),
      ]);
      setCurrentEmployer(empRes.data);
      setLatestDeadline(deadlineRes.data?.[0] ?? null);
      setOpt(optRes.data);
      setLoading(false);
    }
    load();
  }, []);

  function toggleStep(id: string) {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function markEmployerReported() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !currentEmployer) return;
    await supabase.from("opt_employment").update({ reported_to_school: true }).eq("id", currentEmployer.id);
    if (latestDeadline) {
      await supabase.from("compliance_deadlines")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", latestDeadline.id);
    }
    setCurrentEmployer((e: any) => ({ ...e, reported_to_school: true }));
    setLatestDeadline(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const daysLeft = latestDeadline
    ? differenceInCalendarDays(parseISO(latestDeadline.deadline_date), new Date())
    : null;

  const completedCount = completedSteps.size;
  const allDone = completedCount === I983_STEPS.length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-slate-500 hover:text-slate-300 text-sm">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-white">Employment Change + I-983 Guide</h1>
      </div>

      {/* 10-day countdown alert */}
      {latestDeadline && daysLeft !== null && (
        <div className={`p-4 rounded-xl border text-sm ${
          daysLeft <= 3 ? "bg-red-900/20 border-red-800/30 text-red-300"
          : daysLeft <= 7 ? "bg-amber-900/20 border-amber-800/30 text-amber-300"
          : "bg-blue-900/20 border-blue-800/30 text-blue-300"
        }`}>
          <p className="font-bold mb-1">
            {daysLeft <= 0 ? "🚨 OVERDUE" : `⏱️ ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`} — Report New Employer to DSO
          </p>
          <p>
            {daysLeft <= 0
              ? "The 10-day window has passed. Contact your DSO immediately — explain the delay and complete the I-983 process now."
              : `You must report your new employer to your DSO by ${latestDeadline.deadline_date}. Complete the I-983 steps below.`}
          </p>
          <div className="flex gap-3 mt-3 flex-wrap">
            <Link href="/dashboard/dso-email?template=new_employer">
              <button className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-600/30 hover:bg-indigo-600/30 transition-colors">
                ✉️ Generate DSO Email
              </button>
            </Link>
            {currentEmployer?.reported_to_school ? null : (
              <button onClick={markEmployerReported} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/30">
                ✓ Mark as Reported
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current employer status */}
      {currentEmployer && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Employer</p>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white font-medium">{currentEmployer.employer_name}</p>
                <p className="text-slate-400 text-sm">{currentEmployer.position_title ?? currentEmployer.employment_type}</p>
                <p className="text-xs text-slate-500">Started: {currentEmployer.start_date}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                {currentEmployer.reported_to_school
                  ? <Badge variant="success" className="text-xs">✓ Reported to DSO</Badge>
                  : <Badge variant="critical" className="text-xs">Not Reported</Badge>}
                {currentEmployer.e_verify_employer
                  ? <Badge variant="info" className="text-xs">E-Verify ✓</Badge>
                  : opt?.opt_type === "stem_extension"
                    ? <Badge variant="critical" className="text-xs">E-Verify Status Unknown</Badge>
                    : null}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 bg-slate-800 rounded-full h-2">
          <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(completedCount / I983_STEPS.length) * 100}%` }} />
        </div>
        <span className="text-sm text-slate-400 whitespace-nowrap">{completedCount}/{I983_STEPS.length} steps</span>
        {allDone && <Badge variant="success">Complete ✓</Badge>}
      </div>

      {/* I-983 Steps */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">I-983 Training Plan — Step by Step</h2>
        {I983_STEPS.map((step, i) => {
          const done = completedSteps.has(step.id);
          return (
            <Card key={step.id} className={done ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                      done ? "bg-emerald-600 border-emerald-600 text-white" : "bg-slate-900 border-slate-600 text-slate-400 hover:border-indigo-500"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-medium text-sm ${done ? "line-through text-slate-500" : "text-white"}`}>{step.title}</p>
                      {step.critical && !done && <span className="text-xs text-red-400 font-medium">Required</span>}
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{step.detail}</p>
                    {step.action && !done && (
                      <div className="mt-2 flex items-start gap-2">
                        <span className="text-indigo-400 text-xs flex-shrink-0">→</span>
                        <p className="text-xs text-indigo-300">{step.action}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ongoing SEVP obligations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ongoing STEM OPT Obligations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {SEVP_CHECKLIST.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-400">
                <span className="text-amber-400 flex-shrink-0 mt-0.5">△</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <Link href="/dashboard/opt/stem-reports">
              <button className="text-sm text-indigo-400 hover:underline">→ Go to STEM Validation Reports (6/12/18/24 month)</button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
