"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  OPT_PROCESSING_FALLBACK,
  buildOptApplicationTimeline,
  markOptApplicationStepsCompletedForStemUser,
  stemUserHasIncompleteOptSteps,
  type OptTimelineStep,
} from "@/lib/opt/opt-application-timeline";
import { parseISO, differenceInCalendarDays, format, isBefore, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function OPTTimelinePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [opt, setOpt] = useState<any>(null);
  const [savedSteps, setSavedSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState("");
  const stemStepsSyncedRef = useRef(false);
  const [processingTimes, setProcessingTimes] = useState(OPT_PROCESSING_FALLBACK);
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
        if (json.success && json.data) {
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

  useEffect(() => {
    stemStepsSyncedRef.current = false;
  }, [opt?.opt_type]);

  const endDate = customEndDate || profile?.program_end_date;
  const timeline = endDate
    ? buildOptApplicationTimeline(parseISO(endDate), opt?.opt_type ?? "post_completion", processingTimes)
    : null;

  useEffect(() => {
    if (loading || opt?.opt_type !== "stem_extension" || stemStepsSyncedRef.current) return;

    async function syncStemSteps() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let programEnd: string | null = endDate ?? null;
      if (!programEnd) {
        const { data: urow } = await supabase.from("users").select("program_end_date").eq("id", user.id).single();
        programEnd = urow?.program_end_date ?? null;
      }

      const { data: stepRows } = await supabase
        .from("opt_application_steps")
        .select("step_name, is_completed")
        .eq("user_id", user.id);

      if (!stemUserHasIncompleteOptSteps(stepRows, programEnd ?? undefined)) {
        stemStepsSyncedRef.current = true;
        return;
      }

      stemStepsSyncedRef.current = true;
      await markOptApplicationStepsCompletedForStemUser(supabase, user.id, programEnd);
      const { data } = await supabase.from("opt_application_steps").select("*").eq("user_id", user.id).order("step_order");
      setSavedSteps(data ?? []);
    }

    syncStemSteps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, opt?.opt_type, endDate]);

  // Merge saved step completion data into timeline
  const mergedTimeline = timeline?.map((step) => {
    const saved = savedSteps.find((s) => s.step_name === step.id);
    return { ...step, isCompleted: saved?.is_completed ?? false, completedDate: saved?.completed_date ?? null };
  });

  async function toggleStep(step: OptTimelineStep) {
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

      {opt?.opt_type === "stem_extension" && (
        <Card className="border-emerald-200">
          <CardContent className="p-4 space-y-2">
            <p className="text-emerald-600 font-medium text-sm">✅ You&apos;re on STEM OPT — initial post-completion OPT is treated as complete</p>
            <p className="text-gray-500 text-xs">
              These steps were for your first OPT application; VisaBuddy marks them done automatically. For your STEM EAD, submit I‑983 validation reports to your DSO at 6, 12, 18, and 24 months — see{" "}
              <Link href="/dashboard/deadlines" className="text-emerald-700 underline font-medium">Deadlines</Link>
              {" "}and{" "}
              <Link href="/dashboard/opt/stem-reports" className="text-emerald-700 underline font-medium">STEM Reports</Link>.
            </p>
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
                          {opt?.opt_type !== "stem_extension" && (
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
                          )}
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
