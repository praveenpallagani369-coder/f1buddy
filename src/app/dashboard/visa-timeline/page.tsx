"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildVisaTimeline, getCurrentStage } from "@/lib/immigration/visa-stages";
import { Card, CardContent } from "@/components/ui/card";

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; badge: string; dot: string }> = {
  indigo: { ring: "ring-indigo-400", bg: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  amber:  { ring: "ring-amber-400",  bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-500"  },
  emerald:{ ring: "ring-emerald-400",bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",text:"text-emerald-700", badge: "bg-emerald-100 text-emerald-700 border-emerald-200",dot:"bg-emerald-500"},
  violet: { ring: "ring-violet-400", bg: "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800", text: "text-violet-700", badge: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  orange: { ring: "ring-orange-400", bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", badge: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800", dot: "bg-orange-500" },
  blue:   { ring: "ring-blue-400",   bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800",    text: "text-blue-700",   badge: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500"   },
};

type ProfileRow = { program_start_date: string | null; program_end_date: string | null };
type OptRow = { opt_type: "pre_completion" | "post_completion" | "stem_extension" | null; ead_start_date: string | null; ead_end_date: string | null; application_date: string | null };

export default function VisaTimelinePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [opt, setOpt] = useState<OptRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, oRes] = await Promise.all([
        supabase.from("users").select("program_start_date,program_end_date").eq("id", user.id).single(),
        supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
      ]);
      setProfile(pRes.data);
      setOpt(oRes.data);
      setLoading(false);

      // Auto-expand current stage once data is loaded
      const stages = buildVisaTimeline({
        programStartDate: pRes.data?.program_start_date ?? null,
        programEndDate: pRes.data?.program_end_date ?? null,
        optType: oRes.data?.opt_type ?? null,
        eadStartDate: oRes.data?.ead_start_date ?? null,
        eadEndDate: oRes.data?.ead_end_date ?? null,
        stemEndDate: oRes.data?.opt_type === "stem_extension" ? oRes.data?.ead_end_date : null,
        optApplicationDate: oRes.data?.application_date ?? null,
        h1bPetitionFiled: false,
      });
      const current = stages.find(s => s.isCurrent);
      if (current) setExpanded(current.id);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stages = buildVisaTimeline({
    programStartDate: profile?.program_start_date ?? null,
    programEndDate: profile?.program_end_date ?? null,
    optType: opt?.opt_type ?? null,
    eadStartDate: opt?.ead_start_date ?? null,
    eadEndDate: opt?.ead_end_date ?? null,
    stemEndDate: opt?.opt_type === "stem_extension" ? opt?.ead_end_date : null,
    optApplicationDate: opt?.application_date ?? null,
    h1bPetitionFiled: false,
  });

  const currentStage = getCurrentStage(stages);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Visa Status Timeline</h1>
        <p className="text-gray-600 text-sm mt-0.5">Your F-1 immigration journey — current stage, applicable rules, and what comes next.</p>
      </div>

      {/* Current stage banner */}
      {currentStage && (
        <div className={`p-4 rounded-xl border ${COLOR_MAP[currentStage.color].bg}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentStage.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-lg font-bold ${COLOR_MAP[currentStage.color].text}`}>{currentStage.label}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COLOR_MAP[currentStage.color].badge}`}>CURRENT</span>
              </div>
              {currentStage.endDate && (
                <p className="text-sm text-gray-600">
                  Valid until <span className="text-gray-900 font-semibold">{currentStage.endDate}</span>
                </p>
              )}
              {currentStage.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {currentStage.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-700 font-medium">⚠️ {w}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal progress track */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          {stages.map((stage, _i) => {
            const c = COLOR_MAP[stage.color];
            return (
              <div key={stage.id} className="flex-1 flex flex-col items-center">
                <button
                  onClick={() => setExpanded(expanded === stage.id ? null : stage.id)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all z-10 relative
                    ${stage.isCurrent ? `${c.ring} ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 bg-gray-50 dark:bg-gray-800 scale-110 animate-pulse` : ""}
                    ${stage.isCompleted ? `bg-slate-700 border-slate-600` : ""}
                    ${stage.isFuture && !stage.isCurrent ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-40" : ""}
                    ${stage.isCurrent ? `border-current` : ""}`}
                  style={stage.isCurrent ? { borderColor: "" } : {}}
                >
                  {stage.isCompleted ? "✓" : stage.icon}
                </button>
                <p className={`text-xs mt-1 text-center leading-tight ${stage.isCurrent ? "text-gray-900 font-semibold" : stage.isCompleted ? "text-gray-500 dark:text-gray-400" : "text-gray-400"}`}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-0" />
      </div>

      {/* Stage detail cards */}
      <div className="space-y-3">
        {stages.map((stage) => {
          const c = COLOR_MAP[stage.color];
          const isOpen = expanded === stage.id || stage.isCurrent;

          return (
            <Card
              key={stage.id}
              className={`transition-all cursor-pointer ${stage.isCurrent ? `border ${c.bg}` : stage.isFuture ? "opacity-70 grayscale-[0.3]" : ""}`}
              onClick={() => setExpanded(expanded === stage.id ? null : stage.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{stage.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium ${stage.isCurrent ? "text-gray-900 dark:text-gray-100" : stage.isCompleted ? "text-gray-500 dark:text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>
                          {stage.label}
                        </p>
                        {stage.isCurrent && <span className={`text-xs px-2 py-0.5 rounded-full border ${c.badge}`}>Current</span>}
                        {stage.isCompleted && <span className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 font-medium">Completed</span>}
                        {stage.isFuture && <span className="text-xs px-2 py-0.5 rounded-full border border-gray-300 text-gray-500 font-medium">Future</span>}
                      </div>
                      {(stage.startDate || stage.endDate) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {stage.startDate ?? "—"} → {stage.endDate ?? "Present"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-500 text-sm">{expanded === stage.id ? "▲" : "▼"}</span>
                </div>

                {expanded === stage.id && (
                  <div className="mt-4 space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                    {/* Warnings */}
                    {stage.warnings.length > 0 && (
                      <div className="space-y-2">
                        {stage.warnings.map((w, i) => (
                          <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                            ⚠️ {w}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rules */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Rules That Apply</p>
                      <ul className="space-y-1.5">
                        {stage.rules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${c.dot}`} />
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next step */}
                    {stage.nextStep && (
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 text-sm">
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Next Step</span>
                        <span className="text-indigo-700">→ {stage.nextStep}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No data prompt */}
      {!profile?.program_start_date && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-900 font-semibold mb-1">Complete your profile first</p>
            <p className="text-gray-600 text-sm mb-4">Add your program start/end dates in Profile to see your visa timeline</p>
            <a href="/dashboard/profile" className="text-indigo-600 hover:underline text-sm">Go to Profile →</a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
