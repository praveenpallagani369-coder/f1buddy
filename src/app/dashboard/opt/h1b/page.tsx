"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// H-1B lottery timeline (fiscal year cycle)
// Registration: ~March 1–25 | Selection: ~late March/early April | Petitions filed: April 1+ | H-1B starts: Oct 1
function getH1BDates(year: number) {
  return {
    registrationOpen:  new Date(year, 2, 1),   // March 1
    registrationClose: new Date(year, 2, 25),  // March 25 (approx)
    selectionNotify:   new Date(year, 3, 1),   // ~April 1
    petitionDeadline:  new Date(year, 5, 30),  // June 30 (petitions must be filed)
    h1bStart:          new Date(year, 9, 1),   // October 1
  };
}

function getRelevantYear(today: Date): number {
  // After Oct 1, the next lottery year begins
  return today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear();
}

function Countdown({ targetDate, label, color }: { targetDate: Date; label: string; color: string }) {
  const today = new Date();
  const days = differenceInCalendarDays(targetDate, today);
  const isPast = days < 0;
  return (
    <Card className={isPast ? "opacity-60" : ""}>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className={`text-2xl font-bold ${isPast ? "text-gray-400" : color}`}>
          {isPast ? "Done" : `${days}d`}
        </p>
        <p className="text-xs text-gray-400 mt-1">{format(targetDate, "MMM d, yyyy")}</p>
        {!isPast && days <= 14 && <Badge variant="warning" className="text-xs mt-1">Coming up</Badge>}
      </CardContent>
    </Card>
  );
}

export default function H1BPage() {
  const supabase = createClient();
  const [opt, setOpt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [h1bFiled, setH1bFiled] = useState(false);
  const [selectedLottery, setSelectedLottery] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("opt_status").select("*").eq("user_id", user.id).single();
      setOpt(data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date();
  const year = getRelevantYear(today);
  const dates = getH1BDates(year);

  const eadEnd = opt?.ead_end_date ? parseISO(opt.ead_end_date) : null;
  const h1bStartDate = dates.h1bStart;

  // Cap-gap: exists if H-1B filed + selected, and OPT/STEM would expire before Oct 1
  const capGapActive = h1bFiled && selectedLottery && eadEnd && eadEnd < h1bStartDate;
  const daysToOct1 = differenceInCalendarDays(h1bStartDate, today);

  if (loading) return <div className="text-gray-500 text-center py-20">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/opt" className="text-gray-400 hover:text-gray-600 text-sm">← OPT Tracker</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900">H-1B Lottery Timeline</h1>
      </div>
      <p className="text-gray-500 text-sm -mt-4">
        Track the H-1B registration cycle for FY{year}. Most F-1/STEM OPT students target this path to long-term US work authorization.
      </p>

      {/* Countdown row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Countdown targetDate={dates.registrationOpen} label="Registration Opens" color="text-indigo-600" />
        <Countdown targetDate={dates.registrationClose} label="Registration Closes" color="text-amber-600" />
        <Countdown targetDate={dates.selectionNotify} label="Selection Notified" color="text-emerald-600" />
        <Countdown targetDate={dates.h1bStart} label="H-1B Starts (Oct 1)" color="text-violet-400" />
      </div>

      {/* Cap-gap checker */}
      <Card className="border-blue-800/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🏢 Cap-Gap Status Checker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">Cap-gap bridges your OPT/STEM OPT authorization until October 1 when H-1B begins, if your EAD expires before then.</p>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={h1bFiled} onChange={(e) => setH1bFiled(e.target.checked)} className="rounded" />
              My employer filed an H-1B petition on my behalf
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={selectedLottery} onChange={(e) => setSelectedLottery(e.target.checked)} className="rounded" />
              I was selected in the H-1B lottery
            </label>
          </div>

          {h1bFiled && selectedLottery && (
            <div className={`p-4 rounded-xl border ${capGapActive ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}>
              {capGapActive ? (
                <>
                  <p className="font-semibold text-blue-700 mb-1">✅ Cap-Gap Applies to You</p>
                  <p className="text-sm text-blue-800">
                    Your OPT/STEM EAD expires before October 1. Your work authorization is automatically extended (cap-gap) until H-1B starts on <strong>{format(h1bStartDate, "MMMM d, yyyy")}</strong> — {daysToOct1} days from today.
                  </p>
                  <ul className="mt-2 text-xs text-blue-700 space-y-1">
                    <li>• Keep your I-797 receipt notice — it is proof of cap-gap authorization</li>
                    <li>• You may continue working for the same employer under cap-gap</li>
                    <li>• Ask your employer&apos;s immigration attorney about the I-9 update needed</li>
                    <li>• Cap-gap work is only authorized if your OPT was for the same employer</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-semibold text-emerald-700 mb-1">Your OPT EAD covers you through October 1</p>
                  <p className="text-sm text-emerald-800">Your EAD expires after October 1 ({opt?.ead_end_date}), so cap-gap may not be needed. H-1B starts {format(h1bStartDate, "MMM d, yyyy")}.</p>
                </>
              )}
            </div>
          )}

          {h1bFiled && !selectedLottery && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              <p className="font-medium mb-1">Not selected in lottery</p>
              <p>If you were not selected, cap-gap does not apply. Consider: reapplying next year, STEM OPT extension (if not already on STEM), EB-2 NIW self-petition, or O-1A extraordinary ability.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key facts */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">📋 H-1B Key Facts for F-1 Students</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: "Regular Cap", value: "65,000 visas/year", note: "Bachelor's or foreign equivalent" },
              { label: "Master's Cap", value: "20,000 additional", note: "US Master's or higher degree holders" },
              { label: "Registration Fee", value: "$10 per beneficiary", note: "Paid by employer during registration" },
              { label: "Petition Fee", value: "$730–$6,460+", note: "Varies by employer size and processing" },
              { label: "Duration", value: "3 years (renewable)", note: "Up to 6 years total initially" },
              { label: "Employer Required", value: "Yes — sponsor required", note: "Cannot self-petition for H-1B" },
              { label: "Prevailing Wage", value: "Must meet DOL wage", note: "Salary must meet or exceed prevailing wage in your area + occupation" },
              { label: "Lottery Odds", value: "~35–50% (varies)", note: "Higher odds for Master's cap applicants" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-gray-100 border border-gray-200/50">
                <p className="text-gray-400 text-xs">{item.label}</p>
                <p className="text-gray-900 font-medium">{item.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.note}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alternative paths */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">🛤️ Alternatives If Not Selected in Lottery</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { title: "EB-2 NIW (National Interest Waiver)", desc: "Self-petition for green card — no employer sponsor needed. Available to individuals with advanced degrees + work that benefits the US nationally. Typically 2–5 year process.", link: null },
              { title: "O-1A (Extraordinary Ability)", desc: "For individuals with extraordinary ability in sciences, education, business, or athletics. Requires evidence of awards, publications, high salary, or peer review roles.", link: null },
              { title: "L-1 (Intracompany Transfer)", desc: "If you work for a multinational company and transfer to a US branch. Requires 1 year abroad for the same employer.", link: null },
              { title: "Canadian Express Entry / PR", desc: "Canada's points-based permanent residency. Many STEM workers qualify quickly. Allows border-commute work for US-based employers (TN visa).", link: null },
              { title: "Re-enter H-1B Lottery Next Year", desc: "You can re-register every year. Most students try multiple consecutive years while on STEM OPT (which gives up to 3 years of attempts).", link: null },
            ].map((item) => (
              <div key={item.title} className="p-3 rounded-lg bg-gray-100/30 border border-gray-200/50">
                <p className="text-gray-900 text-sm font-medium">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-400">
        ⚠️ H-1B dates are approximate based on USCIS historical patterns. Exact dates change each year. Always confirm with your employer&apos;s immigration attorney or USCIS.gov. This is informational only and not legal advice.
      </div>
    </div>
  );
}
