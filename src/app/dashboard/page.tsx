import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { differenceInCalendarDays, parseISO, addDays, format } from "date-fns";
import { calculateUnemploymentDays } from "@/lib/immigration/rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

type Phase = "f1_active" | "opt_pending" | "opt_active" | "stem_opt_active" | "stem_180_extension" | "grace_period" | "program_ended";

interface OPTRow {
  opt_type: string | null;
  ead_start_date: string | null;
  ead_end_date: string | null;
  application_date: string | null;
  unemployment_days_used: number;
  unemployment_limit: number;
  [key: string]: unknown;
}

function detectPhase(opt: OPTRow | null, today: Date): Phase {
  if (!opt) return "f1_active";
  if (opt.application_date && !opt.ead_start_date) return "opt_pending";
  if (!opt.ead_start_date || !opt.ead_end_date) return "f1_active";

  const eadStart = parseISO(opt.ead_start_date);
  const eadEnd = parseISO(opt.ead_end_date);
  const graceEnd = addDays(eadEnd, 60);
  const stem180End = addDays(eadEnd, 180);

  if (today < eadStart) return opt.application_date ? "opt_pending" : "f1_active";
  if (today <= eadEnd) return opt.opt_type === "stem_extension" ? "stem_opt_active" : "opt_active";

  // 180-day automatic extension: STEM OPT extension was timely filed (before EAD expiry)
  // Per 8 CFR 274a.12(b)(6)(iv) — work authorization continues automatically while pending
  if (
    opt.opt_type === "stem_extension" &&
    opt.application_date &&
    parseISO(opt.application_date) <= eadEnd &&
    today <= stem180End
  ) return "stem_180_extension";

  if (today <= graceEnd) return "grace_period";
  return "program_ended";
}

const PHASE_CONFIG = {
  f1_active: {
    label: "F-1 Student — Active",
    icon: "🎓",
    color: "border-indigo-200 bg-indigo-50",
    textColor: "text-indigo-700",
    tagline: "Enrolled and in status. Keep enrollment full-time and report address changes within 10 days.",
  },
  opt_pending: {
    label: "OPT Application Pending",
    icon: "⏳",
    color: "border-amber-200 bg-amber-50",
    textColor: "text-amber-700",
    tagline: "You CANNOT work yet. Wait for the physical EAD card before starting any job.",
  },
  opt_active: {
    label: "OPT Active",
    icon: "💼",
    color: "border-emerald-200 bg-emerald-50",
    textColor: "text-emerald-700",
    tagline: "Work must be directly related to your degree. Track unemployment days carefully.",
  },
  stem_opt_active: {
    label: "STEM OPT Active",
    icon: "🔬",
    color: "border-violet-800/50 bg-violet-900/10",
    textColor: "text-violet-300",
    tagline: "150-day cumulative unemployment cap. Submit validation reports on time. Employer must stay E-Verify enrolled.",
  },
  stem_180_extension: {
    label: "STEM OPT — 180-Day Auto-Extension",
    icon: "🔄",
    color: "border-blue-200 bg-blue-900/10",
    textColor: "text-blue-700",
    tagline: "Your OPT EAD expired but work authorization continues automatically while STEM extension is pending. Keep your I-797 receipt notice as proof.",
  },
  grace_period: {
    label: "60-Day Grace Period",
    icon: "⏱️",
    color: "border-red-200 bg-red-50",
    textColor: "text-red-700",
    tagline: "YOU CANNOT WORK during the grace period. Use this time to change status, depart, or confirm H-1B cap-gap.",
  },
  program_ended: {
    label: "Program Ended",
    icon: "📋",
    color: "border-gray-200 bg-gray-50",
    textColor: "text-gray-500",
    tagline: "Your OPT/grace period has ended. Contact your DSO immediately if you are still in the US.",
  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [profileRes, deadlinesRes, optRes, allEmploymentRes, travelRes, docsRes, stemDeadlinesRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("compliance_deadlines").select("*").eq("user_id", user.id).eq("status", "pending").order("deadline_date").limit(5),
    supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
    supabase.from("opt_employment").select("*").eq("user_id", user.id).order("start_date"),
    supabase.from("travel_records").select("*").eq("user_id", user.id).order("departure_date", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", user.id).is("deleted_at", null).not("expiration_date", "is", null),
    supabase.from("compliance_deadlines").select("*").eq("user_id", user.id).eq("status", "pending").like("title", "%STEM OPT%Validation Report%").order("deadline_date").limit(1),
  ]);

  const profile = profileRes.data;
  const deadlines = deadlinesRes.data ?? [];
  const opt = optRes.data;
  const allEmployment = allEmploymentRes.data ?? [];
  const currentEmployer = allEmployment.find((e) => e.is_current) ?? null;
  const travels = travelRes.data ?? [];
  const docs = docsRes.data ?? [];
  const nextStemDeadline = stemDeadlinesRes.data?.[0] ?? null;

  const today = new Date();
  const thisYear = today.getFullYear();

  // Live-calculated unemployment days from employment records
  const liveUnemploymentDays = opt?.ead_start_date
    ? calculateUnemploymentDays(
        opt.ead_start_date,
        allEmployment.map((e) => ({ startDate: e.start_date, endDate: e.end_date })),
        today
      )
    : (opt?.unemployment_days_used ?? 0);

  const unemploymentLimit = opt?.unemployment_limit ?? 90;

  // Phase detection
  const phase = detectPhase(opt, today);
  const phaseConfig = PHASE_CONFIG[phase];

  // Days outside US this year
  const daysOutsideThisYear = travels.reduce((sum, t) => {
    const dep = parseISO(t.departure_date);
    const ret = t.return_date ? parseISO(t.return_date) : today;
    if (dep.getFullYear() <= thisYear || ret.getFullYear() >= thisYear) {
      const start = dep.getFullYear() < thisYear ? new Date(thisYear, 0, 1) : dep;
      const end = ret.getFullYear() > thisYear ? new Date(thisYear, 11, 31) : ret;
      return sum + Math.max(0, differenceInCalendarDays(end, start));
    }
    return sum;
  }, 0);

  const currentlyAbroad = travels.some((t) => !t.return_date);
  const fiveMonthWarning = daysOutsideThisYear >= 120;

  // Expiring documents (within 90 days)
  const expiringDocs = docs.filter((d) => {
    if (!d.expiration_date) return false;
    const days = differenceInCalendarDays(parseISO(d.expiration_date), today);
    return days >= 0 && days <= 90;
  });

  // EAD expiry info
  const eadEnd = opt?.ead_end_date ? parseISO(opt.ead_end_date) : null;
  const daysToEadExpiry = eadEnd ? differenceInCalendarDays(eadEnd, today) : null;
  const graceEnd = eadEnd ? addDays(eadEnd, 60) : null;
  const daysInGrace = (phase === "grace_period" && graceEnd) ? differenceInCalendarDays(graceEnd, today) : null;

  // Overall compliance status
  const criticalDeadlines = deadlines.filter((d) => {
    const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
    return days <= 7 || d.severity === "critical";
  });

  const overallStatus =
    phase === "grace_period" || phase === "program_ended" || criticalDeadlines.length > 0 || liveUnemploymentDays >= unemploymentLimit * 0.9
      ? "red"
      : phase === "stem_180_extension" || deadlines.length > 0 || expiringDocs.length > 0 || fiveMonthWarning || liveUnemploymentDays >= unemploymentLimit * 0.7
      ? "yellow"
      : "green";

  const statusConfig = {
    green: { color: "bg-emerald-500", text: "All Clear", textColor: "text-emerald-600" },
    yellow: { color: "bg-amber-500", text: "Action Needed", textColor: "text-amber-600" },
    red: { color: "bg-red-500", text: "Urgent", textColor: "text-red-600" },
  }[overallStatus];

  const unemployPct = Math.min(100, (liveUnemploymentDays / unemploymentLimit) * 100);
  const unemployColor = liveUnemploymentDays >= 85 ? "bg-red-500" : liveUnemploymentDays >= 75 ? "bg-orange-500" : liveUnemploymentDays >= 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"},{" "}
            {profile?.name?.split(" ")[0] ?? "Student"} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Here&apos;s your compliance overview for today</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200">
          <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color} animate-pulse`} />
          <span className={`text-sm font-medium ${statusConfig.textColor}`}>{statusConfig.text}</span>
        </div>
      </div>

      {/* Phase Banner */}
      <div className={`p-4 rounded-xl border ${phaseConfig.color}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className={`text-sm font-bold ${phaseConfig.textColor} mb-0.5`}>
              {phaseConfig.icon} Current Phase: {phaseConfig.label}
            </p>
            <p className="text-sm text-gray-600">{phaseConfig.tagline}</p>

            {/* Phase-specific urgent info inline */}
            {phase === "opt_pending" && opt?.application_date && (
              <p className="text-xs text-amber-600 mt-1">
                Filed: {opt.application_date} · Typical wait: 3–5 months · Track at egov.uscis.gov
              </p>
            )}
            {phase === "stem_180_extension" && opt?.application_date && (
              <p className="text-xs text-blue-600 mt-1 font-semibold">
                Filed: {opt.application_date} · Auto-extension valid up to 180 days past EAD expiry · Keep I-797 receipt as proof — 8 CFR 274a.12(b)(6)(iv)
              </p>
            )}
            {phase === "grace_period" && graceEnd && (
              <p className="text-xs text-red-600 mt-1 font-semibold">
                Grace period ends: {format(graceEnd, "MMM d, yyyy")} — {daysInGrace} days remaining
              </p>
            )}
            {(phase === "opt_active" || phase === "stem_opt_active") && daysToEadExpiry !== null && daysToEadExpiry <= 90 && (
              <p className={`text-xs mt-1 font-medium ${daysToEadExpiry <= 30 ? "text-red-600" : "text-amber-600"}`}>
                EAD expires in {daysToEadExpiry} days — {phase === "opt_active" ? "apply for STEM OPT now" : "plan your next status"}
              </p>
            )}
            {phase === "stem_opt_active" && nextStemDeadline && (
              <p className="text-xs text-violet-300 mt-1">
                Next validation report: {nextStemDeadline.title} — {differenceInCalendarDays(parseISO(nextStemDeadline.deadline_date), today)} days away
              </p>
            )}
          </div>

          {/* Phase quick action */}
          <div className="flex-shrink-0">
            {phase === "f1_active" && (
              <Link href="/dashboard/opt/timeline" className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 border border-indigo-700 text-indigo-700 hover:bg-indigo-600/30">
                Plan OPT Application →
              </Link>
            )}
            {phase === "opt_pending" && (
              <Link href="/dashboard/opt/timeline" className="text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-700 text-amber-700 hover:bg-amber-600/30">
                Track Application →
              </Link>
            )}
            {phase === "opt_active" && (
              <Link href="/dashboard/opt/stem-timeline" className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-700 text-emerald-700 hover:bg-emerald-600/30">
                Plan STEM OPT →
              </Link>
            )}
            {phase === "stem_opt_active" && (
              <Link href="/dashboard/opt/stem-reports" className="text-xs px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-700 text-violet-300 hover:bg-violet-600/30">
                View STEM Reports →
              </Link>
            )}
            {phase === "stem_180_extension" && (
              <Link href="/dashboard/opt/stem-reports" className="text-xs px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-700 text-blue-700 hover:bg-blue-600/30">
                STEM Reports →
              </Link>
            )}
            {phase === "grace_period" && (
              <Link href="/dashboard/opt/h1b" className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-700 text-red-700 hover:bg-red-600/30">
                H-1B Cap-Gap Info →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* OPT Unemployment — live calculated */}
        <Card className={liveUnemploymentDays >= 85 ? "border-red-200" : liveUnemploymentDays >= 60 ? "border-amber-200" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {phase === "stem_opt_active" ? "STEM Unemployment (cumulative)" : "OPT Unemployment"}
            </p>
            {opt ? (
              <>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-2xl font-bold ${liveUnemploymentDays >= 85 ? "text-red-600" : liveUnemploymentDays >= 60 ? "text-amber-600" : "text-gray-900"}`}>
                    {liveUnemploymentDays}
                  </span>
                  <span className="text-gray-400 text-sm">/ {unemploymentLimit} days</span>
                </div>
                <Progress value={unemployPct} max={100} color={unemployColor} />
                <p className="text-xs text-gray-400 mt-1">{unemploymentLimit - liveUnemploymentDays} days remaining · live</p>
              </>
            ) : (
              <Link href="/dashboard/opt" className="text-sm text-indigo-600 hover:underline">Set up OPT →</Link>
            )}
          </CardContent>
        </Card>

        {/* Days Outside US */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Days Outside US ({thisYear})</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className={`text-2xl font-bold ${fiveMonthWarning ? "text-amber-600" : "text-gray-900"}`}>
                {daysOutsideThisYear}
              </span>
              <span className="text-gray-400 text-sm">days</span>
            </div>
            {currentlyAbroad && <Badge variant="warning" className="text-xs">Currently Abroad</Badge>}
            {fiveMonthWarning && !currentlyAbroad && <Badge variant="warning" className="text-xs">5-Month Rule Alert</Badge>}
            {!fiveMonthWarning && !currentlyAbroad && <Badge variant="success" className="text-xs">In Status</Badge>}
          </CardContent>
        </Card>

        {/* EAD Expiry or Program End */}
        <Card className={daysToEadExpiry !== null && daysToEadExpiry <= 30 ? "border-red-200" : ""}>
          <CardContent className="p-4">
            {eadEnd ? (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">EAD Expiry</p>
                <p className={`text-2xl font-bold mb-1 ${daysToEadExpiry !== null && daysToEadExpiry <= 30 ? "text-red-600" : daysToEadExpiry !== null && daysToEadExpiry <= 90 ? "text-amber-600" : "text-gray-900"}`}>
                  {daysToEadExpiry !== null && daysToEadExpiry >= 0 ? `${daysToEadExpiry}d` : "Expired"}
                </p>
                <p className="text-xs text-gray-400">{opt?.ead_end_date}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Program End</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {profile?.program_end_date ? `${differenceInCalendarDays(parseISO(profile.program_end_date), today)}d` : "—"}
                </p>
                <p className="text-xs text-gray-400">{profile?.program_end_date ?? "Not set"}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Expiring Documents */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Expiring Documents</p>
            <p className={`text-2xl font-bold ${expiringDocs.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {expiringDocs.length}
            </p>
            {expiringDocs.length > 0 ? (
              <p className="text-xs text-amber-600 mt-1">Expiring within 90 days</p>
            ) : (
              <p className="text-xs text-emerald-600 mt-1">All documents valid</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grace Period Emergency Banner */}
      {phase === "grace_period" && (
        <div className="p-5 rounded-xl bg-red-900/30 border-2 border-red-700">
          <p className="text-lg font-bold text-red-700 mb-2">🚨 You CANNOT work during the 60-day grace period</p>
          <p className="text-sm text-red-800 mb-3">Your OPT/STEM authorization has ended. Immediately choose one of these options:</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { title: "Change Status", desc: "File for H-1B, B-2, or other status before grace period ends", link: "/dashboard/deadlines" },
              { title: "Depart the US", desc: "Leave before grace period ends to maintain F-1 good standing", link: "/dashboard/travel" },
              { title: "H-1B Cap-Gap", desc: "If H-1B was filed & selected, cap-gap extends authorization", link: "/dashboard/opt/h1b" },
            ].map((opt) => (
              <Link key={opt.title} href={opt.link} className="p-3 rounded-lg bg-red-900/30 border border-red-200 hover:bg-red-900/50 transition-colors">
                <p className="text-sm font-semibold text-red-700">{opt.title}</p>
                <p className="text-xs text-red-600 mt-0.5">{opt.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Two column */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
              <Link href="/dashboard/deadlines" className="text-xs text-indigo-600 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-gray-500 text-sm">No pending deadlines</p>
              </div>
            ) : (
              deadlines.map((d) => {
                const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
                return (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-100 border border-gray-200">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      d.severity === "critical" ? "bg-red-400" : d.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium truncate">{d.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.deadline_date}</p>
                    </div>
                    <Badge variant={days <= 7 ? "critical" : days <= 30 ? "warning" : "info"}>
                      {days === 0 ? "Today" : days < 0 ? "Overdue" : `${days}d`}
                    </Badge>
                  </div>
                );
              })
            )}
            <Link href="/dashboard/deadlines" className="block text-center text-xs text-indigo-600 hover:underline pt-1">
              + Add custom deadline
            </Link>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Current Employment */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Current Employment</p>
              {currentEmployer ? (
                <div>
                  <p className="text-gray-900 font-medium">{currentEmployer.employer_name}</p>
                  <p className="text-gray-500 text-sm">{currentEmployer.position_title ?? currentEmployer.employment_type?.replace("_", " ")}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {!currentEmployer.reported_to_school && <Badge variant="warning" className="text-xs">Not reported to DSO</Badge>}
                    {currentEmployer.e_verify_employer && <Badge variant="success" className="text-xs">E-Verify ✓</Badge>}
                    {currentEmployer.is_stem_related && <Badge variant="info" className="text-xs">STEM</Badge>}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 text-sm">No current employer logged</p>
                  <Link href="/dashboard/opt" className="text-xs text-indigo-600 hover:underline mt-1 block">Add employer →</Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Program Info */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Program Info</p>
              <div className="space-y-1 text-sm">
                {[
                  ["School", profile?.school_name],
                  ["Program", profile?.program_name],
                  ["End Date", profile?.program_end_date],
                  ["DSO", profile?.dso_name],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-700 truncate max-w-[160px]">{value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick links — phase-aware */}
          <div className="grid grid-cols-2 gap-3">
            {(phase === "f1_active"
              ? [
                  { href: "/dashboard/opt/timeline", icon: "📆", label: "Plan OPT" },
                  { href: "/dashboard/cpt", icon: "📚", label: "CPT Tracker" },
                  { href: "/dashboard/travel", icon: "✈️", label: "Log Trip" },
                  { href: "/dashboard/ai", icon: "🤖", label: "Ask AI" },
                ]
              : phase === "opt_pending"
              ? [
                  { href: "/dashboard/opt/timeline", icon: "📆", label: "Track Application" },
                  { href: "/dashboard/documents", icon: "📁", label: "Upload Docs" },
                  { href: "/dashboard/travel/checklist", icon: "🗂️", label: "Travel Check" },
                  { href: "/dashboard/ai", icon: "🤖", label: "Ask AI" },
                ]
              : phase === "opt_active"
              ? [
                  { href: "/dashboard/opt", icon: "💼", label: "Log Employer" },
                  { href: "/dashboard/opt/stem-timeline", icon: "🔬", label: "Plan STEM OPT" },
                  { href: "/dashboard/travel", icon: "✈️", label: "Log Trip" },
                  { href: "/dashboard/ai", icon: "🤖", label: "Ask AI" },
                ]
              : phase === "stem_opt_active"
              ? [
                  { href: "/dashboard/opt/stem-reports", icon: "📋", label: "STEM Reports" },
                  { href: "/dashboard/opt", icon: "💼", label: "Log Employer" },
                  { href: "/dashboard/opt/h1b", icon: "🏢", label: "H-1B Timeline" },
                  { href: "/dashboard/ai", icon: "🤖", label: "Ask AI" },
                ]
              : [
                  { href: "/dashboard/opt/h1b", icon: "🏢", label: "H-1B Info" },
                  { href: "/dashboard/deadlines", icon: "📅", label: "Deadlines" },
                  { href: "/dashboard/documents", icon: "📁", label: "Documents" },
                  { href: "/dashboard/ai", icon: "🤖", label: "Ask AI" },
                ]
            ).map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                <span>{icon}</span>{label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tools & Resources */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Tools & Resources</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { href: "/dashboard/currency", icon: "💱", label: "Currency", desc: "Exchange rates" },
            { href: "/dashboard/holidays", icon: "🗓️", label: "Holidays", desc: "Bank closures" },
            { href: "/dashboard/news", icon: "📰", label: "News", desc: "Rule changes" },
            { href: "/dashboard/guides", icon: "📖", label: "Guides", desc: "SSN, bank, etc." },
            { href: "/dashboard/emergency", icon: "🆘", label: "Emergency", desc: "Contacts & rights" },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-1 p-4 rounded-xl bg-white border border-gray-200 text-center hover:bg-gray-100 hover:border-indigo-800/30 transition-colors">
              <span className="text-xl">{icon}</span>
              <span className="text-sm text-gray-900 font-medium">{label}</span>
              <span className="text-xs text-gray-400">{desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
