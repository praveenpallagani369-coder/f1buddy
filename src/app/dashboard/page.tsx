import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { differenceInCalendarDays, parseISO, addDays, format } from "date-fns";
import { calculateUnemploymentDays } from "@/lib/immigration/rules";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  GraduationCap, Hourglass, Briefcase, FlaskConical, RefreshCw,
  Timer, ClipboardList, Plane, CalendarClock, FolderOpen,
  Building2, ListChecks, ClipboardCheck, Sparkles, BookOpen,
  ArrowLeftRight, CalendarDays, Newspaper, BookMarked, ShieldAlert,
  CircleCheck,
} from "lucide-react";

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

  if (
    opt.opt_type === "stem_extension" &&
    opt.application_date &&
    parseISO(opt.application_date) <= eadEnd &&
    today <= stem180End
  ) return "stem_180_extension";

  if (today <= graceEnd) return "grace_period";
  return "program_ended";
}

const PHASE_CONFIG: Record<Phase, { label: string; icon: React.ReactNode; gradient: string; border: string; text: string; badge: string; tagline: string }> = {
  f1_active:         { label: "F-1 Student — Active",            icon: <GraduationCap className="w-4 h-4" />, gradient: "from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/50",   border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300", tagline: "Enrolled and in status. Keep enrollment full-time and report address changes within 10 days." },
  opt_pending:       { label: "OPT Application Pending",         icon: <Hourglass className="w-4 h-4" />, gradient: "from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50",  border: "border-amber-200 dark:border-amber-800",  text: "text-amber-700 dark:text-amber-300",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",  tagline: "You CANNOT work yet. Wait for the physical EAD card before starting any job." },
  opt_active:        { label: "OPT Active",                      icon: <Briefcase className="w-4 h-4" />, gradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50",  border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300", tagline: "Work must be directly related to your degree. Track unemployment days carefully." },
  stem_opt_active:   { label: "STEM OPT Active",                 icon: <FlaskConical className="w-4 h-4" />, gradient: "from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300", tagline: "150-day cumulative unemployment cap. Submit validation reports on time. Employer must stay E-Verify enrolled." },
  stem_180_extension:{ label: "STEM OPT — 180-Day Auto-Extension",icon: <RefreshCw className="w-4 h-4" />, gradient: "from-blue-50 to-sky-50 dark:from-blue-950/50 dark:to-sky-950/50",     border: "border-blue-200 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-300",  badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",    tagline: "Work authorization continues automatically while STEM extension is pending. Keep your I-797 receipt as proof." },
  grace_period:      { label: "60-Day Grace Period",             icon: <Timer className="w-4 h-4" />, gradient: "from-red-50 to-rose-50 dark:from-red-950/50 dark:to-rose-950/50",     border: "border-red-200 dark:border-red-800",    text: "text-red-700 dark:text-red-300",   badge: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",      tagline: "YOU CANNOT WORK during the grace period. Use this time to change status, depart, or confirm H-1B cap-gap." },
  program_ended:     { label: "Program Ended",                   icon: <ClipboardList className="w-4 h-4" />, gradient: "from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900",   border: "border-gray-200 dark:border-gray-700",   text: "text-gray-500 dark:text-gray-400",  badge: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",    tagline: "Your OPT/grace period has ended. Contact your DSO immediately if you are still in the US." },
};

const ICON_BG: Record<string, string> = {
  "bg-orange-400": "bg-orange-100 dark:bg-orange-950/60",
  "bg-sky-400":    "bg-sky-100 dark:bg-sky-950/60",
  "bg-violet-400": "bg-violet-100 dark:bg-violet-950/60",
  "bg-emerald-400":"bg-emerald-100 dark:bg-emerald-950/60",
  "bg-red-500":    "bg-red-100 dark:bg-red-950/60",
  "bg-amber-400":  "bg-amber-100 dark:bg-amber-950/60",
  "bg-amber-500":  "bg-amber-100 dark:bg-amber-950/60",
};

const ICON_COLOR: Record<string, string> = {
  "bg-orange-400": "text-orange-500",
  "bg-sky-400":    "text-sky-500",
  "bg-violet-400": "text-violet-500",
  "bg-emerald-400":"text-emerald-500",
  "bg-red-500":    "text-red-500",
  "bg-amber-400":  "text-amber-500",
  "bg-amber-500":  "text-amber-500",
};

function StatCard({
  label, value, sub, accent, icon, children,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  const iconBg = ICON_BG[accent] ?? "bg-gray-100";
  const iconColor = ICON_COLOR[accent] ?? "text-gray-500";
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] p-3 sm:p-4 relative overflow-hidden hover:shadow-md transition-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent} rounded-t-xl`} />
      <div className="flex items-start justify-between mb-1.5">
        <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold leading-tight pr-2">{label}</p>
        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none mb-1">{value}</div>
      {sub && <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">{sub}</div>}
      <div className="hidden sm:block">{children}</div>
    </div>
  );
}

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

  const liveUnemploymentDays = opt?.ead_start_date
    ? calculateUnemploymentDays(
        opt.ead_start_date,
        allEmployment.map((e) => ({ startDate: e.start_date, endDate: e.end_date })),
        today
      )
    : (opt?.unemployment_days_used ?? 0);

  const unemploymentLimit = opt?.unemployment_limit ?? 90;
  const phase = detectPhase(opt, today);
  const phaseConfig = PHASE_CONFIG[phase];

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

  const expiringDocs = docs.filter((d) => {
    if (!d.expiration_date) return false;
    const days = differenceInCalendarDays(parseISO(d.expiration_date), today);
    return days >= 0 && days <= 90;
  });

  const eadEnd = opt?.ead_end_date ? parseISO(opt.ead_end_date) : null;
  const daysToEadExpiry = eadEnd ? differenceInCalendarDays(eadEnd, today) : null;
  const graceEnd = eadEnd ? addDays(eadEnd, 60) : null;
  const daysInGrace = (phase === "grace_period" && graceEnd) ? differenceInCalendarDays(graceEnd, today) : null;

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
    green:  { dot: "bg-emerald-400", text: "All Clear",     textColor: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800" },
    yellow: { dot: "bg-amber-400",   text: "Action Needed", textColor: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800"       },
    red:    { dot: "bg-red-400",     text: "Urgent",        textColor: "text-red-700 dark:text-red-300",         bg: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800"               },
  }[overallStatus];

  const unemployPct = Math.min(100, (liveUnemploymentDays / unemploymentLimit) * 100);
  const unemployColor = liveUnemploymentDays >= 85 ? "bg-red-500" : liveUnemploymentDays >= 60 ? "bg-amber-500" : "bg-emerald-500";
  const unemployAccent = liveUnemploymentDays >= 85 ? "bg-red-500" : liveUnemploymentDays >= 60 ? "bg-amber-500" : "bg-orange-400";

  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const QUICK_LINKS: Record<Phase, { href: string; icon: React.ReactNode; label: string; color: string }[]> = {
    f1_active:          [{ href: "/dashboard/opt/timeline", icon: <ListChecks className="w-4 h-4" />, label: "Plan OPT", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300" }, { href: "/dashboard/cpt", icon: <BookOpen className="w-4 h-4" />, label: "CPT Tracker", color: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300" }, { href: "/dashboard/travel", icon: <Plane className="w-4 h-4" />, label: "Log Trip", color: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }],
    opt_pending:        [{ href: "/dashboard/opt/timeline", icon: <ListChecks className="w-4 h-4" />, label: "Track App", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" }, { href: "/dashboard/documents", icon: <FolderOpen className="w-4 h-4" />, label: "Upload Docs", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" }, { href: "/dashboard/travel/checklist", icon: <ClipboardCheck className="w-4 h-4" />, label: "Travel Check", color: "bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }],
    opt_active:         [{ href: "/dashboard/opt", icon: <Briefcase className="w-4 h-4" />, label: "Log Employer", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300" }, { href: "/dashboard/opt/stem-timeline", icon: <FlaskConical className="w-4 h-4" />, label: "Plan STEM", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }, { href: "/dashboard/travel", icon: <Plane className="w-4 h-4" />, label: "Log Trip", color: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300" }],
    stem_opt_active:    [{ href: "/dashboard/opt/stem-reports", icon: <ClipboardList className="w-4 h-4" />, label: "STEM Reports", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }, { href: "/dashboard/opt", icon: <Briefcase className="w-4 h-4" />, label: "Log Employer", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300" }, { href: "/dashboard/opt/h1b", icon: <Building2 className="w-4 h-4" />, label: "H-1B Timeline", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300" }],
    stem_180_extension: [{ href: "/dashboard/opt/stem-reports", icon: <ClipboardList className="w-4 h-4" />, label: "STEM Reports", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" }, { href: "/dashboard/deadlines", icon: <CalendarClock className="w-4 h-4" />, label: "Deadlines", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" }, { href: "/dashboard/documents", icon: <FolderOpen className="w-4 h-4" />, label: "Documents", color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }],
    grace_period:       [{ href: "/dashboard/opt/h1b", icon: <Building2 className="w-4 h-4" />, label: "H-1B Info", color: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300" }, { href: "/dashboard/deadlines", icon: <CalendarClock className="w-4 h-4" />, label: "Deadlines", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" }, { href: "/dashboard/documents", icon: <FolderOpen className="w-4 h-4" />, label: "Documents", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }],
    program_ended:      [{ href: "/dashboard/opt/h1b", icon: <Building2 className="w-4 h-4" />, label: "H-1B Info", color: "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400" }, { href: "/dashboard/deadlines", icon: <CalendarClock className="w-4 h-4" />, label: "Deadlines", color: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" }, { href: "/dashboard/documents", icon: <FolderOpen className="w-4 h-4" />, label: "Documents", color: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300" }, { href: "/dashboard/ai", icon: <Sparkles className="w-4 h-4" />, label: "Ask AI", color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300" }],
  };

  return (
    <div className="space-y-3 sm:space-y-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {greeting}, {profile?.name?.split(" ")[0] ?? "Student"} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">Here&apos;s your compliance overview for today</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm flex-shrink-0 ${statusConfig.bg}`}>
          <div className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`} />
          <span className={`text-xs sm:text-sm font-semibold ${statusConfig.textColor}`}>{statusConfig.text}</span>
        </div>
      </div>

      {/* ── Phase Banner ─────────────────────────────────────────── */}
      <div className={`rounded-xl border ${phaseConfig.border} bg-gradient-to-r ${phaseConfig.gradient} p-3 sm:p-5`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${phaseConfig.badge} flex items-center justify-center flex-shrink-0`}>
              {phaseConfig.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${phaseConfig.text}`}>Current Phase: {phaseConfig.label}</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed hidden sm:block">{phaseConfig.tagline}</p>
              {phase === "opt_pending" && opt?.application_date && (
                <p className="text-xs text-amber-600 mt-1.5 font-medium">
                  Filed: {opt.application_date} · Typical wait: 3–5 months · Track at egov.uscis.gov
                </p>
              )}
              {phase === "stem_180_extension" && opt?.application_date && (
                <p className="text-xs text-blue-600 mt-1.5 font-semibold">
                  Filed: {opt.application_date} · Auto-extension valid up to 180 days past EAD expiry · Keep I-797 receipt — 8 CFR 274a.12(b)(6)(iv)
                </p>
              )}
              {phase === "grace_period" && graceEnd && (
                <p className="text-xs text-red-600 mt-1.5 font-semibold">
                  Grace period ends: {format(graceEnd, "MMM d, yyyy")} — {daysInGrace} days remaining
                </p>
              )}
              {(phase === "opt_active" || phase === "stem_opt_active") && daysToEadExpiry !== null && daysToEadExpiry <= 90 && (
                <p className={`text-xs mt-1.5 font-medium ${daysToEadExpiry <= 30 ? "text-red-600" : "text-amber-600"}`}>
                  EAD expires in {daysToEadExpiry} days — {phase === "opt_active" ? "apply for STEM OPT now" : "plan your next status"}
                </p>
              )}
              {phase === "stem_opt_active" && nextStemDeadline && (
                <p className="text-xs text-violet-600 mt-1.5">
                  Next validation report: {nextStemDeadline.title} — {differenceInCalendarDays(parseISO(nextStemDeadline.deadline_date), today)} days away
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {phase === "f1_active"          && <Link href="/dashboard/opt/timeline"   className={`text-xs px-3 py-1.5 rounded-lg font-medium ${phaseConfig.badge} hover:opacity-80 transition-opacity`}>Plan OPT →</Link>}
            {phase === "opt_pending"        && <Link href="/dashboard/opt/timeline"   className={`text-xs px-3 py-1.5 rounded-lg font-medium ${phaseConfig.badge} hover:opacity-80 transition-opacity`}>Track Application →</Link>}
            {phase === "opt_active"         && <Link href="/dashboard/opt/stem-timeline" className={`text-xs px-3 py-1.5 rounded-lg font-medium ${phaseConfig.badge} hover:opacity-80 transition-opacity`}>Plan STEM OPT →</Link>}
            {phase === "stem_opt_active"    && <Link href="/dashboard/opt/stem-reports"  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${phaseConfig.badge} hover:opacity-80 transition-opacity`}>STEM Reports →</Link>}
            {phase === "stem_180_extension" && <Link href="/dashboard/opt/stem-reports"  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${phaseConfig.badge} hover:opacity-80 transition-opacity`}>STEM Reports →</Link>}
            {phase === "grace_period"       && <Link href="/dashboard/opt/h1b"           className={`text-xs px-3 py-1.5 rounded-lg font-medium ${phaseConfig.badge} hover:opacity-80 transition-opacity`}>H-1B Cap-Gap →</Link>}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Unemployment */}
        <StatCard
          label={phase === "stem_opt_active" ? "STEM Unemployment" : "OPT Unemployment"}
          value={opt ? <span className={liveUnemploymentDays >= 85 ? "text-red-600" : liveUnemploymentDays >= 60 ? "text-amber-600" : "text-gray-900"}>{liveUnemploymentDays}</span> : "—"}
          sub={opt ? `${unemploymentLimit - liveUnemploymentDays} of ${unemploymentLimit} days remaining` : undefined}
          accent={unemployAccent}
          icon={<Briefcase className="w-3.5 h-3.5" />}
        >
          {opt && (
            <div className="mt-3">
              <Progress value={unemployPct} max={100} color={unemployColor} />
              {!opt && <Link href="/dashboard/opt" className="text-xs text-indigo-600 hover:underline mt-2 block">Set up OPT →</Link>}
            </div>
          )}
          {!opt && <Link href="/dashboard/opt" className="text-xs text-indigo-600 hover:underline mt-2 block">Set up OPT →</Link>}
        </StatCard>

        {/* Days Outside US */}
        <StatCard
          label={`Days Outside US (${thisYear})`}
          value={<span className={fiveMonthWarning ? "text-amber-600" : "text-gray-900"}>{daysOutsideThisYear}</span>}
          sub={
            currentlyAbroad ? "Currently abroad" :
            fiveMonthWarning ? "⚠ 5-Month Rule Alert" :
            "Within safe limit"
          }
          accent="bg-sky-400"
          icon={<Plane className="w-3.5 h-3.5" />}
        >
          <div className="mt-2">
            {currentlyAbroad  && <Badge variant="warning"  className="text-xs">Currently Abroad</Badge>}
            {fiveMonthWarning && !currentlyAbroad && <Badge variant="warning" className="text-xs">5-Month Alert</Badge>}
            {!fiveMonthWarning && !currentlyAbroad && <Badge variant="success" className="text-xs">In Status</Badge>}
          </div>
        </StatCard>

        {/* EAD / Program End */}
        <StatCard
          label={eadEnd ? "EAD Expiry" : "Program End"}
          value={
            eadEnd
              ? <span className={daysToEadExpiry !== null && daysToEadExpiry <= 30 ? "text-red-600" : daysToEadExpiry !== null && daysToEadExpiry <= 90 ? "text-amber-600" : "text-gray-900"}>
                  {daysToEadExpiry !== null && daysToEadExpiry >= 0 ? `${daysToEadExpiry}d` : "Expired"}
                </span>
              : <span className="text-gray-900">{profile?.program_end_date ? `${differenceInCalendarDays(parseISO(profile.program_end_date), today)}d` : "—"}</span>
          }
          sub={eadEnd ? opt?.ead_end_date ?? undefined : profile?.program_end_date ?? undefined}
          accent={daysToEadExpiry !== null && daysToEadExpiry <= 30 ? "bg-red-500" : daysToEadExpiry !== null && daysToEadExpiry <= 90 ? "bg-amber-400" : "bg-violet-400"}
          icon={<CalendarClock className="w-3.5 h-3.5" />}
        />

        {/* Expiring Documents */}
        <StatCard
          label="Expiring Documents"
          value={<span className={expiringDocs.length > 0 ? "text-amber-600" : "text-gray-900"}>{expiringDocs.length}</span>}
          sub={expiringDocs.length > 0 ? "Expiring within 90 days" : "All documents valid"}
          accent={expiringDocs.length > 0 ? "bg-amber-400" : "bg-emerald-400"}
          icon={<FolderOpen className="w-3.5 h-3.5" />}
        >
          {expiringDocs.length > 0 && (
            <Link href="/dashboard/documents" className="text-xs text-amber-600 hover:underline mt-2 block">
              View expiring →
            </Link>
          )}
        </StatCard>
      </div>

      {/* ── OPT Setup Prompt ─────────────────────────────────────── */}
      {!opt && phase === "f1_active" && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-0.5">Set up your OPT tracker</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">Add your EAD dates to track unemployment days, get compliance alerts, and let the AI assistant answer questions specific to your status.</p>
          </div>
          <Link
            href="/dashboard/opt"
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Set up OPT →
          </Link>
        </div>
      )}

      {/* ── Grace Period Emergency Banner ────────────────────────── */}
      {phase === "grace_period" && (
        <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-base font-bold text-red-700 dark:text-red-400 mb-1">🚨 You CANNOT work during the 60-day grace period</p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">Your OPT/STEM authorization has ended. Immediately choose one of these options:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "Change Status", desc: "File for H-1B, B-2, or other status before grace period ends", link: "/dashboard/deadlines" },
              { title: "Depart the US",  desc: "Leave before grace period ends to maintain F-1 good standing",  link: "/dashboard/travel" },
              { title: "H-1B Cap-Gap",  desc: "If H-1B was filed & selected, cap-gap extends authorization",   link: "/dashboard/opt/h1b" },
            ].map((o) => (
              <Link key={o.title} href={o.link} className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:shadow-sm transition-all">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{o.title}</p>
                <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">{o.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column ───────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Deadlines card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center"><CalendarClock className="w-4 h-4" /></div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Upcoming Deadlines</p>
            </div>
            <Link href="/dashboard/deadlines" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">View all →</Link>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {deadlines.length === 0 ? (
              <div className="text-center py-5">
                <CircleCheck className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">No pending deadlines</p>
              </div>
            ) : (
              deadlines.map((d) => {
                const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.severity === "critical" ? "bg-red-400" : d.severity === "warning" ? "bg-amber-400" : "bg-blue-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{d.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{d.deadline_date}</p>
                    </div>
                    <Badge variant={days <= 7 ? "critical" : days <= 30 ? "warning" : "info"} className="flex-shrink-0">
                      {days === 0 ? "Today" : days < 0 ? "Overdue" : `${days}d`}
                    </Badge>
                  </div>
                );
              })
            )}
            <Link href="/dashboard/deadlines" className="block text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline pt-2">
              + Add custom deadline
            </Link>
          </div>
        </div>

        {/* Right column — hidden on mobile, visible sm+ */}
        <div className="hidden sm:block space-y-4">

          {/* Current Employment */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Building2 className="w-4 h-4" /></div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Employment</p>
            </div>
            {currentEmployer ? (
              <div>
                <p className="text-gray-900 dark:text-gray-100 font-semibold">{currentEmployer.employer_name}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">{currentEmployer.position_title ?? currentEmployer.employment_type?.replace("_", " ")}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {!currentEmployer.reported_to_school && <Badge variant="warning" className="text-xs">Not reported to DSO</Badge>}
                  {currentEmployer.e_verify_employer   && <Badge variant="success" className="text-xs">E-Verify ✓</Badge>}
                  {currentEmployer.is_stem_related     && <Badge variant="info"    className="text-xs">STEM</Badge>}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No current employer logged</p>
                <Link href="/dashboard/opt" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1 block">Add employer →</Link>
              </div>
            )}
          </div>

          {/* Program Info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center"><GraduationCap className="w-4 h-4" /></div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Program Info</p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["School", profile?.school_name],
                ["Program", profile?.program_name],
                ["End Date", profile?.program_end_date],
                ["DSO", profile?.dso_name],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[160px] text-right">{value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS[phase].map(({ href, icon, label, color }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all text-center">
                <span className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>{icon}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tools & Resources ────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tools & Resources</p>
        {/* Mobile: horizontal scroll strip */}
        <div className="flex gap-3 overflow-x-auto pb-1 sm:hidden scrollbar-hide">
          {[
            { href: "/dashboard/currency", icon: <ArrowLeftRight className="w-5 h-5" />, label: "Currency",  color: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"  },
            { href: "/dashboard/holidays", icon: <CalendarDays className="w-5 h-5" />, label: "Holidays",  color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"   },
            { href: "/dashboard/news",     icon: <Newspaper className="w-5 h-5" />, label: "News",       color: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
            { href: "/dashboard/guides",   icon: <BookMarked className="w-5 h-5" />, label: "Guides",     color: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400" },
            { href: "/dashboard/emergency",icon: <ShieldAlert className="w-5 h-5" />, label: "Emergency",  color: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"  },
          ].map(({ href, icon, label, color }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center flex-shrink-0 w-20 active:opacity-70 transition-opacity">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
              <span className="text-[10px] text-gray-700 dark:text-gray-300 font-medium leading-tight">{label}</span>
            </Link>
          ))}
        </div>
        {/* Desktop: grid */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href: "/dashboard/currency", icon: <ArrowLeftRight className="w-5 h-5" />, label: "Currency",  desc: "Exchange rates", color: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"  },
            { href: "/dashboard/holidays", icon: <CalendarDays className="w-5 h-5" />, label: "Holidays",  desc: "Bank closures",  color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"   },
            { href: "/dashboard/news",     icon: <Newspaper className="w-5 h-5" />, label: "News",       desc: "Rule changes",   color: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
            { href: "/dashboard/guides",   icon: <BookMarked className="w-5 h-5" />, label: "Guides",     desc: "SSN, bank, etc.",color: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400" },
            { href: "/dashboard/emergency",icon: <ShieldAlert className="w-5 h-5" />, label: "Emergency",  desc: "Contacts & rights",color: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"  },
          ].map(({ href, icon, label, desc, color }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
              <span className="text-sm text-gray-800 dark:text-gray-200 font-semibold">{label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
