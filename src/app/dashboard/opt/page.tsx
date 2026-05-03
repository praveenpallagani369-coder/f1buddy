"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

interface OPTRow { opt_type: string | null; ead_end_date: string | null; unemployment_days_used: number; unemployment_limit: number; ead_start_date: string | null; ead_category: string | null; application_date: string | null; [key: string]: unknown }
interface EmployerRow { id: string; employer_name: string; position_title: string | null; employment_type: string; start_date: string; end_date: string | null; is_current: boolean; reported_to_school: boolean; e_verify_employer: boolean; is_stem_related: boolean; [key: string]: unknown }

function stemOptAlert(opt: OPTRow | null) {
  if (!opt || opt.opt_type !== "post_completion" || !opt.ead_end_date) return null;
  const today = new Date();
  const eadEnd = new Date(opt.ead_end_date);
  const daysLeft = Math.ceil((eadEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft > 90) return null;
  if (daysLeft <= 0) return { daysLeft, cls: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300", label: "EXPIRED", msg: `Your OPT EAD has expired. If you haven't applied for STEM OPT, contact your DSO immediately.` };
  if (daysLeft <= 30) return { daysLeft, cls: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300", label: "CRITICAL", msg: `Only ${daysLeft} days left on your OPT EAD. You must apply for STEM OPT now — file Form I-765 immediately or you'll lose work authorization.` };
  if (daysLeft <= 60) return { daysLeft, cls: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300", label: "URGENT", msg: `${daysLeft} days left on OPT. Apply for STEM OPT now — USCIS processing can take 3–5 months.` };
  return { daysLeft, cls: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300", label: "ACTION NEEDED", msg: `${daysLeft} days left on OPT. You're now in the 90-day STEM OPT application window. File Form I-765 with your employer's I-983 Training Plan.` };
}

export default function OPTPage() {
  const supabase = createClient();
  const router = useRouter();
  const [opt, setOpt] = useState<OPTRow | null>(null);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);
  const [showOptForm, setShowOptForm] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stemDeadlinesCreated, setStemDeadlinesCreated] = useState(false);

  const [optForm, setOptForm] = useState({ optType: "post_completion", eadCategory: "C3B", eadStartDate: "", eadEndDate: "", applicationDate: "", approvalDate: "" });
  const [empForm, setEmpForm] = useState({ employerName: "", positionTitle: "", startDate: "", endDate: "", isCurrent: true, employmentType: "full_time", isStemRelated: true, eVerifyEmployer: false, reportedToSchool: false });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [optRes, empRes] = await Promise.all([
        supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
        supabase.from("opt_employment").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      ]);
      setOpt(optRes.data);
      setEmployers(empRes.data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveOpt() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const limit = optForm.optType === "stem_extension" ? 150 : 90;
    await supabase.from("opt_status").upsert({ user_id: user.id, opt_type: optForm.optType, ead_category: optForm.eadCategory, ead_start_date: optForm.eadStartDate, ead_end_date: optForm.eadEndDate, unemployment_limit: limit, application_date: optForm.applicationDate || null, approval_date: optForm.approvalDate || null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    // Auto-generate STEM validation report deadlines when set to STEM extension
    if (optForm.optType === "stem_extension" && optForm.eadStartDate) {
      const { addMonths, parseISO, format } = await import("date-fns");
      const start = parseISO(optForm.eadStartDate);
      const selfEvalMonths = new Set([12, 24]);
      const stemDeadlines = [6, 12, 18, 24].map(month => ({
        user_id: user.id,
        title: `STEM OPT ${month}-Month Validation Report${selfEvalMonths.has(month) ? " + Self-Evaluation" : ""}`,
        description: selfEvalMonths.has(month)
          ? `Submit I-983 validation report AND self-evaluation (I-983 page 5, signed by you and employer) to DSO within 10 business days of ${format(addMonths(start, month), "MMM d, yyyy")}. 8 CFR 214.2(f)(10)(ii)(C).`
          : `Submit I-983 validation report to your DSO within 10 business days of ${format(addMonths(start, month), "MMM d, yyyy")}. 8 CFR 214.2(f)(10)(ii)(C).`,
        deadline_date: format(addMonths(start, month), "yyyy-MM-dd"),
        category: "opt",
        severity: "critical",
        status: "pending",
        is_system_generated: true,
      }));
      for (const d of stemDeadlines) {
        await supabase.from("compliance_deadlines").upsert(d, { onConflict: "user_id,title", ignoreDuplicates: true });
      }
      setStemDeadlinesCreated(true);
    }

    const { data } = await supabase.from("opt_status").select("*").eq("user_id", user.id).single();
    setOpt(data);
    setShowOptForm(false);
    setSaving(false);
    router.refresh();
  }

  async function saveEmployer() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (empForm.isCurrent) await supabase.from("opt_employment").update({ is_current: false }).eq("user_id", user.id);
    await supabase.from("opt_employment").insert({
      user_id: user.id,
      employer_name: empForm.employerName,
      position_title: empForm.positionTitle,
      start_date: empForm.startDate,
      end_date: empForm.endDate || null,
      is_current: empForm.isCurrent,
      employment_type: empForm.employmentType,
      is_stem_related: empForm.isStemRelated,
      e_verify_employer: empForm.eVerifyEmployer,
      reported_to_school: empForm.reportedToSchool,
    });

    // Auto-create 10-day DSO reporting deadline
    if (!empForm.reportedToSchool) {
      const deadline10 = new Date();
      deadline10.setDate(deadline10.getDate() + 10);
      const isStem = opt?.opt_type === "stem_extension";
      await supabase.from("compliance_deadlines").insert({
        user_id: user.id,
        title: `Report New Employer to DSO — ${empForm.employerName}`,
        description: isStem
          ? `Report ${empForm.employerName} to your DSO within 10 days of your FIRST DAY of work. E-Verify must be confirmed BEFORE Day 1 (hard pre-authorization gate). Submit an updated I-983 Training Plan within 10 days of starting. — 8 CFR 214.2(f)(10)(ii)(C)`
          : `Report your new employer (${empForm.employerName}) to your DSO within 10 days of starting work. Failure to report may jeopardize your OPT authorization. — 8 CFR 214.2(f)(10)(ii)(C)`,
        deadline_date: deadline10.toISOString().split("T")[0],
        category: "opt",
        severity: "critical",
        status: "pending",
        is_system_generated: true,
      });

      // STEM OPT only: if replacing a current employer, create final I-983 evaluation deadline for old employer
      if (isStem && empForm.isCurrent) {
        const previousEmployer = employers.find((e) => e.is_current);
        if (previousEmployer) {
          const finalDeadline = new Date();
          finalDeadline.setDate(finalDeadline.getDate() + 10);
          await supabase.from("compliance_deadlines").insert({
            user_id: user.id,
            title: `Final I-983 Evaluation — ${previousEmployer.employer_name}`,
            description: `Submit a final I-983 evaluation report for ${previousEmployer.employer_name} to your DSO within 10 days of your last day of work. Both you and the employer must sign. — 8 CFR 214.2(f)(10)(ii)(C)`,
            deadline_date: finalDeadline.toISOString().split("T")[0],
            category: "opt",
            severity: "critical",
            status: "pending",
            is_system_generated: true,
          });
        }
      }
    }

    const { data } = await supabase.from("opt_employment").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
    setEmployers(data ?? []);
    setShowEmpForm(false);
    setEmpForm({ employerName: "", positionTitle: "", startDate: "", endDate: "", isCurrent: true, employmentType: "full_time", isStemRelated: true, eVerifyEmployer: false, reportedToSchool: false });
    setSaving(false);
  }

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading OPT data...</div>;

  const stemAlert = stemOptAlert(opt);
  const unemployed = opt?.unemployment_days_used ?? 0;
  const limit = opt?.unemployment_limit ?? 90;

  // Spec: alert at EXACTLY 60, 75, 85 days — not percentages
  const at85 = unemployed >= 85;
  const at75 = unemployed >= 75 && unemployed < 85;
  const at60 = unemployed >= 60 && unemployed < 75;
  const unemployColor = at85 ? "bg-red-500" : at75 ? "bg-orange-500" : at60 ? "bg-amber-500" : "bg-emerald-500";
  const unemployAlert = at85
    ? { msg: `🚨 CRITICAL: ${unemployed}/${limit} days used — only ${limit - unemployed} days left. Contact your DSO immediately.`, cls: "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300" }
    : at75
    ? { msg: `⚠️ WARNING: ${unemployed}/${limit} days used. Find employment within ${limit - unemployed} days to avoid OPT termination.`, cls: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300" }
    : at60
    ? { msg: `⚠️ NOTICE: ${unemployed}/${limit} days used. Start your job search now — 30 days left before the 75-day warning.`, cls: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300" }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">OPT Employment Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">Track your employment authorization and unemployment days</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowOptForm(true)}>
            {opt ? "Update EAD" : "Setup OPT"}
          </Button>
          <Button onClick={() => setShowEmpForm(true)}>+ Add Employer</Button>
        </div>
      </div>


      {/* STEM deadlines created success banner */}
      {stemDeadlinesCreated && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">✅ STEM report deadlines created in your Deadlines list</p>
            <p className="text-xs text-emerald-600 mt-0.5">4 deadlines added for 6, 12, 18, and 24-month validation reports (months 12 & 24 include self-evaluation)</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/dashboard/deadlines" className="text-xs text-emerald-700 underline whitespace-nowrap">View Deadlines →</Link>
            <button onClick={() => setStemDeadlinesCreated(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      {/* STEM OPT Application Alert */}
      {stemAlert && (
        <div className={`p-4 rounded-xl border ${stemAlert.cls}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-sm mb-1">🎓 STEM OPT Application Window — {stemAlert.label}</p>
              <p className="text-sm">{stemAlert.msg}</p>
              <ul className="mt-2 space-y-1 text-xs opacity-80">
                <li>• File Form I-765 + I-983 Training Plan with your employer</li>
                <li>• Must have a STEM degree and E-Verify employer</li>
                <li>• Apply before OPT EAD expires — approval can take 3–5 months</li>
                <li>• STEM OPT extends work authorization by 24 months</li>
              </ul>
            </div>
            <Link href="/dashboard/opt/stem-reports">
              <Button variant="outline" className="text-xs whitespace-nowrap">View STEM Reports →</Button>
            </Link>
          </div>
        </div>
      )}

      {/* OPT Status Card */}
      {opt ? (
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">OPT Type</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">{(opt.opt_type ?? "").replace("_", " ")}</p>
                <p className="text-sm text-gray-600">EAD Category: {opt.ead_category ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">EAD Validity</p>
                <p className="text-gray-900 dark:text-gray-100 font-medium">{opt.ead_start_date} → {opt.ead_end_date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Unemployment Days</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{opt.unemployment_days_used}</span>
                  <span className="text-gray-500 dark:text-gray-400">/ {opt.unemployment_limit} days</span>
                </div>
                <Progress value={opt.unemployment_days_used} max={opt.unemployment_limit} color={unemployColor} />
                <p className="text-xs text-gray-600 mt-1">{opt.unemployment_limit - opt.unemployment_days_used} days remaining</p>
                {opt.opt_type === "stem_extension" && (
                  <p className="text-xs text-gray-500 mt-1">150 total = 90 OPT + 60 STEM (cumulative, never resets) — 8 CFR 214.2(f)(10)(ii)(E)</p>
                )}
              </div>
            </div>
            {unemployAlert && (
              <div className={`mt-4 p-3 rounded-lg border text-sm ${unemployAlert.cls}`}>
                {unemployAlert.msg}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-3">💼</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No OPT set up yet</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Add your EAD details to start tracking unemployment days</p>
            <Button onClick={() => setShowOptForm(true)}>Set Up OPT →</Button>
          </CardContent>
        </Card>
      )}

      {/* OPT Form */}
      {showOptForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">{opt ? "Update OPT Status" : "Set Up OPT"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">OPT Type</label>
                <Select value={optForm.optType} onChange={(e) => {
                  const t = e.target.value;
                  setOptForm(f => ({
                    ...f,
                    optType: t,
                    eadCategory: t === "pre_completion" ? "C3A" : t === "post_completion" ? "C3B" : "C3C",
                  }));
                }}>
                  <option value="pre_completion">Pre-Completion OPT</option>
                  <option value="post_completion">Post-Completion OPT</option>
                  <option value="stem_extension">STEM OPT Extension</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">EAD Category</label>
                <Select value={optForm.eadCategory} onChange={(e) => setOptForm(f => ({ ...f, eadCategory: e.target.value }))}>
                  <option value="C3A">C3A (Pre-Completion OPT)</option>
                  <option value="C3B">C3B (Post-Completion OPT)</option>
                  <option value="C3C">C3C (STEM Extension)</option>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Check the category printed on your physical EAD card</p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">EAD Start Date</label>
                <Input type="date" value={optForm.eadStartDate} onChange={(e) => setOptForm(f => ({ ...f, eadStartDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">EAD End Date</label>
                <Input type="date" value={optForm.eadEndDate} onChange={(e) => setOptForm(f => ({ ...f, eadEndDate: e.target.value }))} />
              </div>
            </div>
            {optForm.optType === "stem_extension" && (
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-sm text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300 md:col-span-2">
                <p className="font-medium mb-1">🔬 STEM OPT Requirements — verify before saving</p>
                <ul className="text-xs space-y-1 opacity-90">
                  <li>• Degree must be on DHS STEM Designated Degree Program List (stemlist.uscis.gov)</li>
                  <li>• Employer MUST be E-Verify enrolled — check e-verify.uscis.gov before accepting any job</li>
                  <li>• I-983 Training Plan must be signed by employer AND submitted to DSO before STEM OPT starts</li>
                  <li>• Apply within 90 days of OPT EAD expiry — processing takes 3–5 months</li>
                  <li>• No self-employment, 1099 work, volunteer work, or unpaid internships</li>
                </ul>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowOptForm(false)}>Cancel</Button>
              <Button onClick={saveOpt} loading={saving}>Save OPT Info</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employer Form */}
      {showEmpForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">Add Employer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Employer Name *</label>
                <Input placeholder="Acme Corporation" value={empForm.employerName} onChange={(e) => setEmpForm(f => ({ ...f, employerName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Position Title</label>
                <Input placeholder="Software Engineer" value={empForm.positionTitle} onChange={(e) => setEmpForm(f => ({ ...f, positionTitle: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Employment Type</label>
                <Select value={empForm.employmentType} onChange={(e) => setEmpForm(f => ({ ...f, employmentType: e.target.value }))}>
                  <option value="full_time">Full Time (40h/wk)</option>
                  <option value="part_time">Part Time (20h/wk)</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="unpaid_intern">Unpaid Intern</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">Start Date *</label>
                <Input type="date" value={empForm.startDate} onChange={(e) => setEmpForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1.5">End Date (leave blank if current)</label>
                <Input type="date" value={empForm.endDate} onChange={(e) => setEmpForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { label: "STEM Related", field: "isStemRelated" },
                { label: "E-Verify Employer", field: "eVerifyEmployer" },
                { label: "Reported to DSO", field: "reportedToSchool" },
                { label: "Current Job", field: "isCurrent" },
              ].map(({ label, field }) => (
                <label key={field} className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={empForm[field as keyof typeof empForm] as boolean} onChange={(e) => setEmpForm(f => ({ ...f, [field]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            {opt?.opt_type === "stem_extension" && !empForm.eVerifyEmployer && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
                🚨 STEM OPT requires an E-Verify enrolled employer. You cannot work under STEM OPT at a non-E-Verify employer. Verify at e-verify.uscis.gov before accepting the job. — 8 CFR 214.2(f)(10)(ii)(C)
              </div>
            )}
            {opt?.opt_type === "stem_extension" && (empForm.employmentType === "volunteer" || empForm.employmentType === "unpaid_intern") && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
                🚨 STEM OPT does NOT authorize volunteer work or unpaid internships. Employment must be paid. Unpaid work violates your STEM OPT terms and may result in SEVIS termination. — 8 CFR 214.2(f)(10)(ii)(C)
              </div>
            )}
            {!empForm.reportedToSchool && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                ⚠️ Remember: You must report new employers to your DSO within 10 days of starting.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowEmpForm(false)}>Cancel</Button>
              <Button onClick={saveEmployer} loading={saving} disabled={!empForm.employerName || !empForm.startDate}>Save Employer</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employer List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment History</CardTitle>
        </CardHeader>
        <CardContent>
          {employers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No employers logged yet</div>
          ) : (
            <div className="space-y-3">
              {employers.map((e) => (
                <div key={e.id} className="flex items-start justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{e.employer_name}</p>
                      {e.is_current && <Badge variant="success" className="text-xs">Current</Badge>}
                    </div>
                    <p className="text-sm text-gray-600">{e.position_title ?? e.employment_type.replace("_", " ")}</p>
                    <p className="text-xs text-gray-500 mt-1">{e.start_date} → {e.end_date ?? "Present"}</p>
                    <div className="flex gap-2 mt-2">
                      {e.is_stem_related && <Badge variant="info" className="text-xs">STEM</Badge>}
                      {e.e_verify_employer && <Badge variant="info" className="text-xs">E-Verify</Badge>}
                      {!e.reported_to_school && <Badge variant="warning" className="text-xs">Not Reported to DSO</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
