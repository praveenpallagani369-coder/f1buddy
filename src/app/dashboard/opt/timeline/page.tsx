"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays, subDays, parseISO, differenceInCalendarDays, format, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// Static fallback used until live data loads
const PROCESSING_FALLBACK = { optimisticWeeks: 10, typicalWeeks: 16, slowWeeks: 24 };

interface TimelineStep {
  id: string;
  order: number;
  title: string;
  description: string;
  targetDate: Date | null;
  completedDate: string | null;
  isCompleted: boolean;
  isCritical: boolean;
  tip: string;
}

function buildTimeline(programEndDate: Date, _optType: string, estimates = PROCESSING_FALLBACK): TimelineStep[] {
  const applyBy = subDays(programEndDate, 90);
  const dsoRequestBy = subDays(applyBy, 14);
  const typicalEADDate = addDays(applyBy, estimates.typicalWeeks * 7);

  return [
    {
      id: "dso_request",
      order: 1,
      title: "Request DSO Recommendation",
      description: "Email your DSO to request an OPT I-20. Provide your desired OPT start date and employer (if known).",
      targetDate: dsoRequestBy,
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Give your DSO 5–10 business days to process. Be specific about your requested OPT start date. Use the DSO Email Generator in VisaBuddy.",
    },
    {
      id: "dso_i20",
      order: 2,
      title: "Receive OPT-Endorsed I-20",
      description: "DSO updates your SEVIS record and issues a new I-20 with OPT recommendation.",
      targetDate: subDays(applyBy, 5),
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Review the I-20 carefully — check that your OPT start date and degree level are correct. Errors cause delays.",
    },
    {
      id: "file_uscis",
      order: 3,
      title: "File Form I-765 with USCIS",
      description: `Submit Form I-765 (Application for Employment Authorization) to USCIS. This is the filing deadline — you must apply at least 90 days before program end or no later than 60 days after.`,
      targetDate: applyBy,
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Application window: 90 days before program end to 60 days after. Filing early = earlier EAD start date. Required documents: I-765 form, I-20 (OPT recommended), passport photo, copy of prior EAD (if any), filing fee check or fee waiver.",
    },
    {
      id: "receipt_notice",
      order: 4,
      title: "Receive USCIS Receipt Notice (Form I-797)",
      description: "USCIS mails a receipt notice (I-797) confirming they received your application. Arrives 2–4 weeks after filing.",
      targetDate: addDays(applyBy, 21),
      completedDate: null,
      isCompleted: false,
      isCritical: false,
      tip: "Keep this receipt notice — it can serve as proof your application is pending. You CANNOT work until you have a physical EAD card.",
    },
    {
      id: "biometrics",
      order: 5,
      title: "Biometrics Appointment (if required)",
      description: "Some OPT applicants are scheduled for fingerprinting. Not always required.",
      targetDate: addDays(applyBy, 35),
      completedDate: null,
      isCompleted: false,
      isCritical: false,
      tip: "Attend on the scheduled date. Missing it causes significant delays. Bring your appointment notice, passport, and receipt notice.",
    },
    {
      id: "ead_approved",
      order: 6,
      title: "Application Approved — EAD Card Mailed",
      description: "USCIS approves your application and mails the EAD card. Typical processing: 10–24 weeks.",
      targetDate: typicalEADDate,
      completedDate: null,
      isCompleted: false,
      isCritical: false,
      tip: `Typical: ${estimates.typicalWeeks} weeks. Slow period: ${estimates.slowWeeks} weeks. Track at egov.uscis.gov using your receipt number. Do NOT start working before your EAD card arrives and your authorized start date.`,
    },
    {
      id: "ead_received",
      order: 7,
      title: "EAD Card Received — You Can Start Working!",
      description: "Physical EAD card arrives. You may start working on or after the start date printed on the card.",
      targetDate: addDays(typicalEADDate, 7),
      completedDate: null,
      isCompleted: false,
      isCritical: true,
      tip: "Check: correct name, correct start/end dates, correct category (C3B for post-completion OPT). If there is any error, report it to USCIS immediately. Report your new employer to your DSO within 10 days of starting work.",
    },
  ];
}

export default function OPTTimelinePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [opt, setOpt] = useState<any>(null);
  const [savedSteps, setSavedSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState("");
  const [processingTimes, setProcessingTimes] = useState(PROCESSING_FALLBACK);
  const [processingSource, setProcessingSource] = useState<"live" | "static">("static");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [profileRes, optRes, stepsRes] = await Promise.all([
        supabase.from("users").select("program_end_date, program_name, degree_level").eq("id", user.id).single(),
        supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
        supabase.from("opt_application_steps").select("*").eq("user_id", user.id).order("step_order"),
      ]);
      setProfile(profileRes.data);
      setOpt(optRes.data);
      setSavedSteps(stepsRes.data ?? []);
      setLoading(false);
    }
    load();
    // Fetch live USCIS processing times
    fetch("/api/uscis-processing")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setProcessingTimes({
            optimisticWeeks: json.data.optimisticWeeks,
            typicalWeeks: json.data.typicalWeeks,
            slowWeeks: json.data.slowWeeks,
          });
          setProcessingSource(json.data.source);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endDate = customEndDate || profile?.program_end_date;
  const timeline = endDate ? buildTimeline(parseISO(endDate), opt?.opt_type ?? "post_completion", processingTimes) : null;

  // Merge saved step completion data into timeline
  const mergedTimeline = timeline?.map((step) => {
    const saved = savedSteps.find((s) => s.step_name === step.id);
    return { ...step, isCompleted: saved?.is_completed ?? false, completedDate: saved?.completed_date ?? null };
  });

  async function toggleStep(step: TimelineStep) {
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
      await supabase.from("opt_application_steps")
        .insert({ user_id: user.id, step_name: step.id, step_order: step.order, target_date: step.targetDate ? format(step.targetDate, "yyyy-MM-dd") : null, is_completed: true, completed_date: now });
    }
    const { data } = await supabase.from("opt_application_steps").select("*").eq("user_id", user.id).order("step_order");
    setSavedSteps(data ?? []);
    setSaving(null);
  }

  const today = new Date();
  const completedCount = mergedTimeline?.filter((s) => s.isCompleted).length ?? 0;
  const totalCount = mergedTimeline?.length ?? 0;

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading timeline...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-gray-500 hover:text-gray-600 text-sm">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">OPT Application Timeline</h1>
      </div>

      {/* Live USCIS processing times */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">I-765 Processing Times (EAD)</p>
          {processingSource === "live"
            ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium">Live from USCIS</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">Historical estimates</span>
          }
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Fastest", value: processingTimes.optimisticWeeks, color: "text-emerald-600" },
            { label: "Typical", value: processingTimes.typicalWeeks, color: "text-amber-600" },
            { label: "Slow Period", value: processingTimes.slowWeeks, color: "text-red-600" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>{item.value} weeks</p>
                <p className="text-xs text-gray-500 mt-1">EAD processing</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Program end date input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-600 mb-1.5">Program End Date</label>
              <Input type="date"
                value={customEndDate || profile?.program_end_date || ""}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
              {profile?.program_end_date && !customEndDate && (
                <p className="text-xs text-gray-500 mt-1">From your profile: {profile.program_end_date}</p>
              )}
            </div>
            {endDate && (
              <div className="text-sm text-gray-500 pb-2">
                Apply by: <span className="text-amber-600 font-medium">
                  {format(subDays(parseISO(endDate), 90), "MMM d, yyyy")}
                </span>
                {" "}(90 days before end)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STEM OPT notice */}
      {opt?.opt_type === "stem_extension" && (
        <Card className="border-emerald-200">
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-emerald-600 font-medium text-sm">✅ You&apos;re on STEM OPT — initial OPT is complete</p>
              <p className="text-gray-500 text-xs mt-0.5">These steps tracked your original OPT application. Mark them all done to clear the overdue flags.</p>
            </div>
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user || !mergedTimeline) return;
                const now = format(new Date(), "yyyy-MM-dd");
                for (const step of mergedTimeline) {
                  if (!step.isCompleted) {
                    const existing = savedSteps.find((s) => s.step_name === step.id);
                    if (existing) {
                      await supabase.from("opt_application_steps").update({ is_completed: true, completed_date: now, updated_at: new Date().toISOString() }).eq("id", existing.id);
                    } else {
                      await supabase.from("opt_application_steps").insert({ user_id: user.id, step_name: step.id, step_order: step.order, target_date: step.targetDate ? format(step.targetDate, "yyyy-MM-dd") : null, is_completed: true, completed_date: now });
                    }
                  }
                }
                const { data } = await supabase.from("opt_application_steps").select("*").eq("user_id", user.id).order("step_order");
                setSavedSteps(data ?? []);
              }}
              className="text-xs px-4 py-2 rounded-lg bg-emerald-600/20 border border-emerald-700 text-emerald-600 hover:bg-emerald-600/30 transition-colors whitespace-nowrap"
            >
              Mark All Done ✓
            </button>
          </CardContent>
        </Card>
      )}

      {/* Progress bar */}
      {mergedTimeline && (
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${(completedCount / totalCount) * 100}%` }} />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">{completedCount}/{totalCount} steps done</span>
        </div>
      )}

      {/* Timeline steps */}
      {mergedTimeline ? (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gray-100" />

          <div className="space-y-4">
            {mergedTimeline.map((step, i) => {
              const isOverdue = step.targetDate && isBefore(step.targetDate, today) && !step.isCompleted;
              const isUpNext = !step.isCompleted && (i === 0 || mergedTimeline[i - 1]?.isCompleted);
              const daysAway = step.targetDate ? differenceInCalendarDays(step.targetDate, today) : null;

              return (
                <div key={step.id} className="relative flex gap-4 pl-12">
                  {/* Step circle */}
                  <div className={`absolute left-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 z-10 ${
                    step.isCompleted ? "bg-emerald-600 border-emerald-600 text-gray-900" :
                    isOverdue ? "bg-red-900/50 border-red-600 text-red-600" :
                    isUpNext ? "bg-indigo-100 border-indigo-500 text-indigo-600" :
                    "bg-white border-gray-200 text-gray-500"
                  }`}>
                    {step.isCompleted ? "✓" : step.order}
                  </div>

                  {/* Card */}
                  <Card className={`flex-1 ${
                    isUpNext && !step.isCompleted ? "border-indigo-200" :
                    isOverdue ? "border-red-200" :
                    step.isCompleted ? "opacity-70" : ""
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className={`font-medium ${step.isCompleted ? "text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"}`}>
                              {step.title}
                            </p>
                            {step.isCritical && !step.isCompleted && (
                              <Badge variant="critical" className="text-xs">Critical</Badge>
                            )}
                            {isUpNext && <Badge variant="info" className="text-xs">Up Next</Badge>}
                            {isOverdue && <Badge variant="critical" className="text-xs">Overdue</Badge>}
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>

                          {/* Tip */}
                          <div className="mt-3 p-3 rounded-lg bg-gray-100 border border-gray-200/50">
                            <p className="text-xs text-gray-500 font-medium mb-0.5">💡 Tip</p>
                            <p className="text-xs text-gray-500">{step.tip}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {step.targetDate && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Target</p>
                              <p className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-gray-600 dark:text-gray-400"}`}>
                                {format(step.targetDate, "MMM d, yyyy")}
                              </p>
                              {daysAway !== null && !step.isCompleted && (
                                <p className={`text-xs ${daysAway < 0 ? "text-red-600" : daysAway < 14 ? "text-amber-600" : "text-gray-500 dark:text-gray-400"}`}>
                                  {daysAway < 0 ? `${Math.abs(daysAway)}d ago` : `in ${daysAway}d`}
                                </p>
                              )}
                            </div>
                          )}
                          {step.completedDate && (
                            <p className="text-xs text-emerald-600">Done {step.completedDate}</p>
                          )}
                          <button
                            onClick={() => toggleStep(step)}
                            disabled={saving === step.id}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              step.isCompleted
                                ? "border-gray-200 text-gray-500 hover:border-slate-600"
                                : "border-indigo-700 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-gray-900 font-medium mb-1">Enter your program end date above</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">We&apos;ll calculate all your OPT deadlines automatically</p>
          </CardContent>
        </Card>
      )}

      {/* Common mistakes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">⚠️ Common Mistakes That Cause Rejections</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Starting work before receiving the physical EAD card (even if application is approved)",
              "Applying outside the 90-day before / 60-day after program end window",
              "Not listing a valid US address on Form I-765",
              "Missing signatures on Form I-765",
              "Wrong check amount or wrong payable address for filing fee",
              "Not reporting new employer to DSO within 10 days of starting",
              "Traveling internationally while OPT application is pending without re-entry plan",
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
