"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays, subDays, parseISO, differenceInCalendarDays, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface STEMStep {
  id: string;
  order: number;
  title: string;
  description: string;
  targetDate: Date | null;
  isCompleted: boolean;
  completedDate: string | null;
  isCritical: boolean;
  tip: string;
  cfr?: string;
}

function buildSTEMTimeline(optEadEndDate: Date): STEMStep[] {
  // STEM OPT must be filed within 90 days before OPT EAD expiry
  const applyDeadline = subDays(optEadEndDate, 1); // must be filed before OPT expires
  const applyOpenDate = subDays(optEadEndDate, 90); // earliest filing date

  return [
    {
      id: "stem_eligibility",
      order: 1,
      title: "Verify STEM Degree Eligibility",
      description: "Confirm your degree is on the DHS STEM Designated Degree Program List. Not all STEM degrees qualify — CIP code must match.",
      targetDate: subDays(applyOpenDate, 30),
      isCompleted: false,
      completedDate: null,
      isCritical: true,
      tip: "Check stemlist.uscis.gov. Look up your CIP code on your transcript or from your registrar. If your degree is not listed, STEM OPT is not available to you.",
      cfr: "8 CFR 214.2(f)(10)(ii)(C)(2)",
    },
    {
      id: "stem_employer_verify",
      order: 2,
      title: "Confirm Employer is E-Verify Enrolled",
      description: "Your employer MUST be enrolled in E-Verify. Self-employment, 1099 work, and unpaid/volunteer work are not allowed under STEM OPT.",
      targetDate: subDays(applyOpenDate, 21),
      isCompleted: false,
      completedDate: null,
      isCritical: true,
      tip: "Verify at e-verify.uscis.gov/web/myeverify. Ask your HR department for their E-Verify Company ID. If employer is NOT E-Verify enrolled, you cannot use STEM OPT with them — period.",
      cfr: "8 CFR 214.2(f)(10)(ii)(C)(3)",
    },
    {
      id: "stem_i983_draft",
      order: 3,
      title: "Draft and Sign I-983 Training Plan",
      description: "Work with your employer to complete Form I-983 (Training Plan for STEM OPT Students). The employer supervisor signs the employer sections; you sign the student sections.",
      targetDate: subDays(applyOpenDate, 14),
      isCompleted: false,
      completedDate: null,
      isCritical: true,
      tip: "Download I-983 from uscis.gov. Sections 1–4 describe the training goals. Section 6 is the student attestation. Section 7 is the employer attestation. The training plan must show how the job relates to your STEM degree — be specific.",
      cfr: "8 CFR 214.2(f)(10)(ii)(C)(4)",
    },
    {
      id: "stem_dso_request",
      order: 4,
      title: "Request STEM OPT I-20 from DSO",
      description: "Submit the signed I-983 to your DSO and request an updated I-20 with STEM OPT recommendation. DSO updates your SEVIS record and issues a new I-20.",
      targetDate: subDays(applyOpenDate, 7),
      isCompleted: false,
      completedDate: null,
      isCritical: true,
      tip: "Give your DSO 5–10 business days to process. Make sure the new I-20 shows 'STEM OPT Extension' and the new end date (24 months from original OPT end). Review for errors before filing.",
    },
    {
      id: "stem_file_i765",
      order: 5,
      title: "File Form I-765 with USCIS",
      description: `Submit Form I-765 (Application for Employment Authorization) within 90 days before OPT EAD expiry. Application window: ${format(applyOpenDate, "MMM d, yyyy")} to ${format(applyDeadline, "MMM d, yyyy")}.`,
      targetDate: applyOpenDate,
      isCompleted: false,
      completedDate: null,
      isCritical: true,
      tip: "Required documents: Form I-765 (checked 'STEM Extension'), new STEM OPT I-20, copy of current OPT EAD, signed I-983, passport copy, 2 passport photos. Mail to correct USCIS lockbox address (check uscis.gov for current address). USCIS processing: 3–5 months.",
      cfr: "8 CFR 274a.12(c)(3)(iii)",
    },
    {
      id: "stem_receipt",
      order: 6,
      title: "Receive Receipt Notice (I-797)",
      description: "USCIS mails Form I-797 receipt notice (arrives 2–4 weeks after filing). This confirms they received your application.",
      targetDate: addDays(applyOpenDate, 21),
      isCompleted: false,
      completedDate: null,
      isCritical: false,
      tip: "Keep the receipt notice — if your current OPT EAD expires before your STEM EAD arrives, the I-797 + a copy of your pending I-765 + current EAD extends your work authorization for up to 180 days (the automatic extension).",
    },
    {
      id: "stem_ead_received",
      order: 7,
      title: "Receive STEM OPT EAD Card — Update DSO",
      description: "Physical STEM OPT EAD arrives. Category on card should be C3C. Update your DSO with the new EAD start/end dates so SEVIS reflects your STEM OPT status.",
      targetDate: addDays(applyOpenDate, 120),
      isCompleted: false,
      completedDate: null,
      isCritical: true,
      tip: "Check: correct name, C3C category, dates matching your STEM OPT period (24 months). If there is any error, file Form I-90 immediately. After receiving, update your DSO. The 4 validation report deadlines (6/12/18/24 months) start from your STEM EAD start date — go to STEM Reports to set these up.",
    },
  ];
}

export default function STEMTimelinePage() {
  const supabase = createClient();
  const [opt, setOpt] = useState<any>(null);
  const [savedSteps, setSavedSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [optRes, stepsRes] = await Promise.all([
        supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
        supabase.from("opt_application_steps").select("*").eq("user_id", user.id).like("step_name", "stem_%").order("step_order"),
      ]);
      setOpt(optRes.data);
      setSavedSteps(stepsRes.data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeline = opt?.ead_end_date ? buildSTEMTimeline(parseISO(opt.ead_end_date)) : null;

  const mergedTimeline = timeline?.map((step) => {
    const saved = savedSteps.find((s) => s.step_name === step.id);
    return { ...step, isCompleted: saved?.is_completed ?? false, completedDate: saved?.completed_date ?? null };
  });

  async function toggleStep(step: STEMStep) {
    setSaving(step.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = savedSteps.find((s) => s.step_name === step.id);
    const now = format(new Date(), "yyyy-MM-dd");
    if (existing) {
      await supabase.from("opt_application_steps")
        .update({ is_completed: !existing.is_completed, completed_date: !existing.is_completed ? now : null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("opt_application_steps").insert({
        user_id: user.id,
        step_name: step.id,
        step_order: step.order,
        target_date: step.targetDate ? format(step.targetDate, "yyyy-MM-dd") : null,
        is_completed: true,
        completed_date: now,
      });
    }
    const { data } = await supabase.from("opt_application_steps").select("*").eq("user_id", user.id).like("step_name", "stem_%").order("step_order");
    setSavedSteps(data ?? []);
    setSaving(null);
  }

  const today = new Date();
  const completedCount = mergedTimeline?.filter((s) => s.isCompleted).length ?? 0;
  const totalCount = mergedTimeline?.length ?? 0;

  if (loading) return <div className="text-gray-500 text-center py-20">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-gray-400 hover:text-gray-600 text-sm">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900">STEM OPT Application Timeline</h1>
      </div>
      <p className="text-gray-500 text-sm -mt-4">
        Step-by-step guide to apply for your 24-month STEM OPT extension before your OPT EAD expires.
      </p>

      {/* Processing time info */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Application Window Opens", value: opt?.ead_end_date ? format(subDays(parseISO(opt.ead_end_date), 90), "MMM d, yyyy") : "Set OPT first", color: "text-amber-600" },
          { label: "USCIS Processing", value: "3–5 months", color: "text-gray-600" },
          { label: "STEM OPT Duration", value: "24 months", color: "text-violet-400" },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No OPT set up */}
      {!opt?.ead_end_date && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-3">💼</p>
            <p className="text-gray-900 font-medium mb-1">OPT EAD end date not set</p>
            <p className="text-gray-500 text-sm mb-4">Set up your current OPT EAD dates in the OPT Tracker to see your STEM application timeline.</p>
            <Link href="/dashboard/opt"><Button>Set Up OPT →</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Already on STEM OPT */}
      {opt?.opt_type === "stem_extension" && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <p className="text-sm font-semibold text-emerald-700">✅ You&apos;re already on STEM OPT</p>
          <p className="text-sm text-emerald-800 mt-0.5">Mark the steps below as done to keep this tracker clean. Your active STEM OPT compliance is tracked in STEM Reports.</p>
          <Link href="/dashboard/opt/stem-reports" className="text-xs text-emerald-600 underline mt-2 block">Go to STEM Reports →</Link>
        </div>
      )}

      {/* Progress bar */}
      {mergedTimeline && (
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">{completedCount}/{totalCount} steps done</span>
        </div>
      )}

      {/* Timeline steps */}
      {mergedTimeline && (
        <div className="relative">
          <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gray-100" />
          <div className="space-y-4">
            {mergedTimeline.map((step, i) => {
              const isOverdue = step.targetDate && step.targetDate < today && !step.isCompleted;
              const isUpNext = !step.isCompleted && (i === 0 || mergedTimeline[i - 1]?.isCompleted);
              const daysAway = step.targetDate ? differenceInCalendarDays(step.targetDate, today) : null;

              return (
                <div key={step.id} className="relative flex gap-4 pl-12">
                  <div className={`absolute left-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 z-10 ${
                    step.isCompleted ? "bg-violet-600 border-violet-600 text-gray-900" :
                    isOverdue ? "bg-red-900/50 border-red-600 text-red-600" :
                    isUpNext ? "bg-violet-600/20 border-violet-500 text-violet-400" :
                    "bg-white border-gray-200 text-gray-400"
                  }`}>
                    {step.isCompleted ? "✓" : step.order}
                  </div>

                  <Card className={`flex-1 ${
                    isUpNext && !step.isCompleted ? "border-violet-800/50" :
                    isOverdue ? "border-red-200" :
                    step.isCompleted ? "opacity-70" : ""
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className={`font-medium ${step.isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`}>
                              {step.title}
                            </p>
                            {step.isCritical && !step.isCompleted && <Badge variant="critical" className="text-xs">Critical</Badge>}
                            {isUpNext && <Badge variant="info" className="text-xs">Up Next</Badge>}
                            {isOverdue && !step.isCompleted && <Badge variant="critical" className="text-xs">Overdue</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                          {step.cfr && <p className="text-xs text-gray-400 font-mono mt-1">{step.cfr}</p>}

                          <div className="mt-3 p-3 rounded-lg bg-gray-100 border border-gray-200/50">
                            <p className="text-xs text-gray-400 font-medium mb-0.5">💡 Tip</p>
                            <p className="text-xs text-gray-500">{step.tip}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {step.targetDate && (
                            <div className="text-right">
                              <p className="text-xs text-gray-400">Target</p>
                              <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-600"}`}>
                                {format(step.targetDate, "MMM d, yyyy")}
                              </p>
                              {daysAway !== null && !step.isCompleted && (
                                <p className={`text-xs ${daysAway < 0 ? "text-red-600" : daysAway < 14 ? "text-amber-600" : "text-gray-400"}`}>
                                  {daysAway < 0 ? `${Math.abs(daysAway)}d ago` : `in ${daysAway}d`}
                                </p>
                              )}
                            </div>
                          )}
                          {step.completedDate && <p className="text-xs text-violet-400">Done {step.completedDate}</p>}
                          <button
                            onClick={() => toggleStep(step)}
                            disabled={saving === step.id}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              step.isCompleted
                                ? "border-gray-200 text-gray-400 hover:border-slate-600"
                                : "border-violet-700 text-violet-400 hover:bg-violet-600/10"
                            }`}
                          >
                            {saving === step.id ? "..." : step.isCompleted ? "Undo" : "Mark Done ✓"}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Common mistakes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">⚠️ Common STEM OPT Mistakes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Starting STEM OPT work before receiving the physical EAD card",
              "Employer not enrolled in E-Verify at time of hire — invalidates STEM OPT",
              "Working as a contractor (1099) or self-employed — not allowed under STEM OPT",
              "I-983 not signed before starting work — must be submitted to DSO first",
              "Missing validation reports at 6/12/18/24 months — non-recoverable deadline",
              "Forgetting self-evaluations (I-983 page 5) at months 12 and 24",
              "Traveling internationally while STEM OPT application is pending",
              "Not notifying DSO of employer changes within 10 days",
            ].map((m) => (
              <li key={m} className="flex gap-2 text-sm text-gray-500">
                <span className="text-red-600 flex-shrink-0 mt-0.5">✗</span>
                {m}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
