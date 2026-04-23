"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildVisaTimeline, getCurrentStage } from "@/lib/immigration/visa-stages";
import type { StageInfo } from "@/lib/immigration/visa-stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const COLOR_MAP: Record<string, { ring: string; bg: string; text: string; badge: string; dot: string }> = {
  indigo: { ring: "ring-indigo-500", bg: "bg-indigo-900/20 border-indigo-800/40", text: "text-indigo-300", badge: "bg-indigo-600/20 text-indigo-300 border-indigo-600/30", dot: "bg-indigo-500" },
  amber:  { ring: "ring-amber-500",  bg: "bg-amber-900/20 border-amber-800/40",   text: "text-amber-300",  badge: "bg-amber-600/20 text-amber-300 border-amber-600/30",   dot: "bg-amber-500"  },
  emerald:{ ring: "ring-emerald-500",bg: "bg-emerald-900/20 border-emerald-800/40",text:"text-emerald-300", badge: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",dot:"bg-emerald-500"},
  violet: { ring: "ring-violet-500", bg: "bg-violet-900/20 border-violet-800/40", text: "text-violet-300", badge: "bg-violet-600/20 text-violet-300 border-violet-600/30", dot: "bg-violet-500" },
  orange: { ring: "ring-orange-500", bg: "bg-orange-900/20 border-orange-800/40", text: "text-orange-300", badge: "bg-orange-600/20 text-orange-300 border-orange-600/30", dot: "bg-orange-500" },
  blue:   { ring: "ring-blue-500",   bg: "bg-blue-900/20 border-blue-800/40",     text: "text-blue-300",   badge: "bg-blue-600/20 text-blue-300 border-blue-600/30",         dot: "bg-blue-500"   },
};

export default function VisaTimelinePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [opt, setOpt] = useState<any>(null);
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
    }
    load();
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
        <h1 className="text-2xl font-bold text-white">Visa Status Timeline</h1>
        <p className="text-slate-400 text-sm mt-0.5">Your F-1 immigration journey — current stage, applicable rules, and what comes next.</p>
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
                <p className="text-sm text-slate-400">
                  Valid until <span className="text-white font-medium">{currentStage.endDate}</span>
                </p>
              )}
              {currentStage.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {currentStage.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-300 font-medium">⚠️ {w}</p>
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
          {stages.map((stage, i) => {
            const c = COLOR_MAP[stage.color];
            return (
              <div key={stage.id} className="flex-1 flex flex-col items-center">
                <button
                  onClick={() => setExpanded(expanded === stage.id ? null : stage.id)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-lg transition-all z-10 relative
                    ${stage.isCurrent ? `${c.ring} ring-4 ring-offset-2 ring-offset-slate-950 bg-slate-950 scale-110` : ""}
                    ${stage.isCompleted ? `bg-slate-700 border-slate-600` : ""}
                    ${stage.isFuture && !stage.isCurrent ? "bg-slate-900 border-slate-700 opacity-40" : ""}
                    ${stage.isCurrent ? `bg-slate-950 border-current` : ""}`}
                  style={stage.isCurrent ? { borderColor: "" } : {}}
                >
                  {stage.isCompleted ? "✓" : stage.icon}
                </button>
                <p className={`text-xs mt-1 text-center leading-tight ${stage.isCurrent ? "text-white font-semibold" : stage.isCompleted ? "text-slate-500" : "text-slate-600"}`}>
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-800 -z-0" />
      </div>

      {/* Stage detail cards */}
      <div className="space-y-3">
        {stages.map((stage) => {
          const c = COLOR_MAP[stage.color];
          const isOpen = expanded === stage.id || stage.isCurrent;

          return (
            <Card
              key={stage.id}
              className={`transition-all cursor-pointer ${stage.isCurrent ? `border ${c.bg}` : stage.isFuture ? "opacity-50" : ""}`}
              onClick={() => setExpanded(expanded === stage.id ? null : stage.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{stage.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium ${stage.isCurrent ? "text-white" : stage.isCompleted ? "text-slate-500" : "text-slate-400"}`}>
                          {stage.label}
                        </p>
                        {stage.isCurrent && <span className={`text-xs px-2 py-0.5 rounded-full border ${c.badge}`}>Current</span>}
                        {stage.isCompleted && <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 text-slate-500">Completed</span>}
                        {stage.isFuture && <span className="text-xs px-2 py-0.5 rounded-full border border-slate-800 text-slate-600">Future</span>}
                      </div>
                      {(stage.startDate || stage.endDate) && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {stage.startDate ?? "—"} → {stage.endDate ?? "Present"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-600 text-sm">{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                    {/* Warnings */}
                    {stage.warnings.length > 0 && (
                      <div className="space-y-2">
                        {stage.warnings.map((w, i) => (
                          <div key={i} className="p-3 rounded-lg bg-amber-900/20 border border-amber-800/30 text-sm text-amber-300 font-medium">
                            ⚠️ {w}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rules */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Rules That Apply</p>
                      <ul className="space-y-1.5">
                        {stage.rules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${c.dot}`} />
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next step */}
                    {stage.nextStep && (
                      <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-sm">
                        <span className="text-slate-500 text-xs uppercase tracking-wider block mb-1">Next Step</span>
                        <span className="text-indigo-300">→ {stage.nextStep}</span>
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
            <p className="text-white font-medium mb-1">Complete your profile first</p>
            <p className="text-slate-400 text-sm mb-4">Add your program start/end dates in Profile to see your visa timeline</p>
            <a href="/dashboard/profile" className="text-indigo-400 hover:underline text-sm">Go to Profile →</a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
