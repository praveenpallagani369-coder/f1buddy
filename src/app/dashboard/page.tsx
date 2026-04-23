import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [profileRes, deadlinesRes, optRes, employmentRes, travelRes, docsRes] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("compliance_deadlines").select("*").eq("user_id", user.id).eq("status", "pending").order("deadline_date").limit(5),
    supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
    supabase.from("opt_employment").select("*").eq("user_id", user.id).eq("is_current", true).limit(1),
    supabase.from("travel_records").select("*").eq("user_id", user.id).order("departure_date", { ascending: false }),
    supabase.from("documents").select("*").eq("user_id", user.id).is("deleted_at", null).not("expiration_date", "is", null),
  ]);

  const profile = profileRes.data;
  const deadlines = deadlinesRes.data ?? [];
  const opt = optRes.data;
  const currentEmployer = employmentRes.data?.[0];
  const travels = travelRes.data ?? [];
  const docs = docsRes.data ?? [];

  const today = new Date();
  const thisYear = today.getFullYear();

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

  // Overall status
  const criticalDeadlines = deadlines.filter((d) => {
    const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
    return days <= 7 || d.severity === "critical";
  });

  const overallStatus = criticalDeadlines.length > 0 || (opt && opt.unemployment_days_used >= opt.unemployment_limit * 0.9)
    ? "red"
    : deadlines.length > 0 || expiringDocs.length > 0 || fiveMonthWarning
    ? "yellow"
    : "green";

  const statusConfig = {
    green: { color: "bg-emerald-500", text: "All Clear", sub: "No urgent items", textColor: "text-emerald-400" },
    yellow: { color: "bg-amber-500", text: "Action Needed", sub: "Some items need attention", textColor: "text-amber-400" },
    red: { color: "bg-red-500", text: "Urgent", sub: "Critical deadlines approaching", textColor: "text-red-400" },
  }[overallStatus];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Good {today.getHours() < 12 ? "morning" : today.getHours() < 17 ? "afternoon" : "evening"},{" "}
            {profile?.name?.split(" ")[0] ?? "Student"} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Here&apos;s your compliance overview for today</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800`}>
          <div className={`w-2.5 h-2.5 rounded-full ${statusConfig.color} animate-pulse`} />
          <span className={`text-sm font-medium ${statusConfig.textColor}`}>{statusConfig.text}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* OPT Unemployment */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">OPT Unemployment</p>
            {opt ? (
              <>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-2xl font-bold ${opt.unemployment_days_used / opt.unemployment_limit >= 0.8 ? "text-red-400" : "text-white"}`}>
                    {opt.unemployment_days_used}
                  </span>
                  <span className="text-slate-500 text-sm">/ {opt.unemployment_limit} days</span>
                </div>
                <Progress
                  value={opt.unemployment_days_used}
                  max={opt.unemployment_limit}
                  color={opt.unemployment_days_used / opt.unemployment_limit >= 0.8 ? "bg-red-500" : opt.unemployment_days_used / opt.unemployment_limit >= 0.6 ? "bg-amber-500" : "bg-emerald-500"}
                />
                <p className="text-xs text-slate-500 mt-1">{opt.unemployment_limit - opt.unemployment_days_used} days remaining</p>
              </>
            ) : (
              <Link href="/dashboard/opt" className="text-sm text-indigo-400 hover:underline">Set up OPT →</Link>
            )}
          </CardContent>
        </Card>

        {/* Days Outside US */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Days Outside US ({thisYear})</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className={`text-2xl font-bold ${fiveMonthWarning ? "text-amber-400" : "text-white"}`}>
                {daysOutsideThisYear}
              </span>
              <span className="text-slate-500 text-sm">days</span>
            </div>
            {currentlyAbroad && <Badge variant="warning" className="text-xs">Currently Abroad</Badge>}
            {fiveMonthWarning && !currentlyAbroad && <Badge variant="warning" className="text-xs">5-Month Rule Alert</Badge>}
            {!fiveMonthWarning && !currentlyAbroad && <Badge variant="success" className="text-xs">In Status</Badge>}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Upcoming Deadlines</p>
            <p className="text-2xl font-bold text-white mb-1">{deadlines.length}</p>
            {deadlines.length > 0 ? (
              <p className="text-xs text-slate-400">
                Next: {deadlines[0]?.title?.substring(0, 30)}
              </p>
            ) : (
              <p className="text-xs text-emerald-400">All clear!</p>
            )}
          </CardContent>
        </Card>

        {/* Expiring Documents */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Expiring Documents</p>
            <p className={`text-2xl font-bold ${expiringDocs.length > 0 ? "text-amber-400" : "text-white"}`}>
              {expiringDocs.length}
            </p>
            {expiringDocs.length > 0 ? (
              <p className="text-xs text-amber-400 mt-1">Expiring within 90 days</p>
            ) : (
              <p className="text-xs text-emerald-400 mt-1">All documents valid</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two column */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
              <Link href="/dashboard/deadlines" className="text-xs text-indigo-400 hover:underline">View all →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-slate-400 text-sm">No pending deadlines</p>
              </div>
            ) : (
              deadlines.map((d) => {
                const days = differenceInCalendarDays(parseISO(d.deadline_date), today);
                return (
                  <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      d.severity === "critical" ? "bg-red-400" : d.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{d.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{d.deadline_date}</p>
                    </div>
                    <Badge variant={days <= 7 ? "critical" : days <= 30 ? "warning" : "info"}>
                      {days === 0 ? "Today" : days < 0 ? "Overdue" : `${days}d`}
                    </Badge>
                  </div>
                );
              })
            )}
            <Link href="/dashboard/deadlines" className="block text-center text-xs text-indigo-400 hover:underline pt-1">
              + Add custom deadline
            </Link>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="space-y-4">
          {/* Current Employer */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Current Employment</p>
              {currentEmployer ? (
                <div>
                  <p className="text-white font-medium">{currentEmployer.employer_name}</p>
                  <p className="text-slate-400 text-sm">{currentEmployer.position_title ?? currentEmployer.employment_type}</p>
                  <div className="flex gap-2 mt-2">
                    {!currentEmployer.reported_to_school && (
                      <Badge variant="warning" className="text-xs">Not reported to DSO</Badge>
                    )}
                    {currentEmployer.e_verify_employer && (
                      <Badge variant="success" className="text-xs">E-Verify</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 text-sm">No current employer logged</p>
                  <Link href="/dashboard/opt" className="text-xs text-indigo-400 hover:underline mt-1 block">
                    Add employer →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Info */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Program Info</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">School</span>
                  <span className="text-slate-200">{profile?.school_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Program</span>
                  <span className="text-slate-200">{profile?.program_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">End Date</span>
                  <span className="text-slate-200">{profile?.program_end_date ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">DSO</span>
                  <span className="text-slate-200">{profile?.dso_name ?? "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/dashboard/opt", icon: "💼", label: "Log Employer" },
              { href: "/dashboard/travel", icon: "✈️", label: "Log Trip" },
              { href: "/dashboard/documents", icon: "📁", label: "Upload Doc" },
              { href: "/dashboard/ai", icon: "🤖", label: "Ask AI" },
            ].map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                <span>{icon}</span>{label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
