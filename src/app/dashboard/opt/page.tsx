"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

export default function OPTPage() {
  const supabase = createClient();
  const [opt, setOpt] = useState<any>(null);
  const [employers, setEmployers] = useState<any[]>([]);
  const [showOptForm, setShowOptForm] = useState(false);
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, []);

  async function saveOpt() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const limit = optForm.optType === "stem_extension" ? 150 : 90;
    await supabase.from("opt_status").upsert({ user_id: user.id, opt_type: optForm.optType, ead_category: optForm.eadCategory, ead_start_date: optForm.eadStartDate, ead_end_date: optForm.eadEndDate, unemployment_limit: limit, application_date: optForm.applicationDate || null, approval_date: optForm.approvalDate || null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    const { data } = await supabase.from("opt_status").select("*").eq("user_id", user.id).single();
    setOpt(data);
    setShowOptForm(false);
    setSaving(false);
  }

  async function saveEmployer() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (empForm.isCurrent) await supabase.from("opt_employment").update({ is_current: false }).eq("user_id", user.id);
    await supabase.from("opt_employment").insert({ user_id: user.id, ...empForm, end_date: empForm.endDate || null });

    // Auto-create 10-day DSO reporting deadline (spec: Employment Change Alert)
    if (!empForm.reportedToSchool) {
      const deadline10 = new Date();
      deadline10.setDate(deadline10.getDate() + 10);
      await supabase.from("compliance_deadlines").insert({
        user_id: user.id,
        title: `Report New Employer to DSO — ${empForm.employerName}`,
        description: `You must report your new employer (${empForm.employerName}) to your DSO within 10 days. Complete the I-983 Training Plan. Failure to report may jeopardize your STEM OPT. — 8 CFR 214.2(f)(10)(ii)(C)`,
        deadline_date: deadline10.toISOString().split("T")[0],
        category: "opt",
        severity: "critical",
        status: "pending",
        is_system_generated: true,
      });
    }

    const { data } = await supabase.from("opt_employment").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
    setEmployers(data ?? []);
    setShowEmpForm(false);
    setEmpForm({ employerName: "", positionTitle: "", startDate: "", endDate: "", isCurrent: true, employmentType: "full_time", isStemRelated: true, eVerifyEmployer: false, reportedToSchool: false });
    setSaving(false);
  }

  if (loading) return <div className="text-slate-400 text-center py-20">Loading OPT data...</div>;

  const unemployed = opt?.unemployment_days_used ?? 0;
  const limit = opt?.unemployment_limit ?? 90;
  const unemployPct = opt ? (unemployed / limit) * 100 : 0;

  // Spec: alert at EXACTLY 60, 75, 85 days — not percentages
  const at85 = unemployed >= 85;
  const at75 = unemployed >= 75 && unemployed < 85;
  const at60 = unemployed >= 60 && unemployed < 75;
  const unemployColor = at85 ? "bg-red-500" : at75 ? "bg-orange-500" : at60 ? "bg-amber-500" : "bg-emerald-500";
  const unemployAlert = at85
    ? { msg: `🚨 CRITICAL: ${unemployed}/${limit} days used — only ${limit - unemployed} days left. Contact your DSO immediately.`, cls: "bg-red-900/20 border-red-800/30 text-red-300" }
    : at75
    ? { msg: `⚠️ WARNING: ${unemployed}/${limit} days used. Find employment within ${limit - unemployed} days to avoid OPT termination.`, cls: "bg-orange-900/20 border-orange-800/30 text-orange-300" }
    : at60
    ? { msg: `⚠️ NOTICE: ${unemployed}/${limit} days used. Start your job search now — 30 days left before the 75-day warning.`, cls: "bg-amber-900/20 border-amber-800/30 text-amber-300" }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">OPT Employment Tracker</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your employment authorization and unemployment days</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowOptForm(true)}>
            {opt ? "Update EAD" : "Setup OPT"}
          </Button>
          <Button onClick={() => setShowEmpForm(true)}>+ Add Employer</Button>
        </div>
      </div>

      {/* OPT Status Card */}
      {opt ? (
        <Card>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">OPT Type</p>
                <p className="text-white font-medium capitalize">{opt.opt_type.replace("_", " ")}</p>
                <p className="text-sm text-slate-400">EAD Category: {opt.ead_category ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">EAD Validity</p>
                <p className="text-white font-medium">{opt.ead_start_date} → {opt.ead_end_date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Unemployment Days</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-white">{opt.unemployment_days_used}</span>
                  <span className="text-slate-400">/ {opt.unemployment_limit} days</span>
                </div>
                <Progress value={opt.unemployment_days_used} max={opt.unemployment_limit} color={unemployColor} />
                <p className="text-xs text-slate-400 mt-1">{opt.unemployment_limit - opt.unemployment_days_used} days remaining</p>
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
            <p className="text-white font-medium mb-1">No OPT set up yet</p>
            <p className="text-slate-400 text-sm mb-4">Add your EAD details to start tracking unemployment days</p>
            <Button onClick={() => setShowOptForm(true)}>Set Up OPT →</Button>
          </CardContent>
        </Card>
      )}

      {/* OPT Form */}
      {showOptForm && (
        <Card className="border-indigo-800/50">
          <CardHeader><CardTitle className="text-base">{opt ? "Update OPT Status" : "Set Up OPT"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">OPT Type</label>
                <Select value={optForm.optType} onChange={(e) => setOptForm(f => ({ ...f, optType: e.target.value }))}>
                  <option value="pre_completion">Pre-Completion OPT</option>
                  <option value="post_completion">Post-Completion OPT</option>
                  <option value="stem_extension">STEM OPT Extension</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">EAD Category</label>
                <Select value={optForm.eadCategory} onChange={(e) => setOptForm(f => ({ ...f, eadCategory: e.target.value }))}>
                  <option value="C3A">C3A (Pre-Completion OPT)</option>
                  <option value="C3B">C3B (Post-Completion OPT)</option>
                  <option value="C3C">C3C (STEM Extension)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">EAD Start Date</label>
                <Input type="date" value={optForm.eadStartDate} onChange={(e) => setOptForm(f => ({ ...f, eadStartDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">EAD End Date</label>
                <Input type="date" value={optForm.eadEndDate} onChange={(e) => setOptForm(f => ({ ...f, eadEndDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowOptForm(false)}>Cancel</Button>
              <Button onClick={saveOpt} loading={saving}>Save OPT Info</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employer Form */}
      {showEmpForm && (
        <Card className="border-indigo-800/50">
          <CardHeader><CardTitle className="text-base">Add Employer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Employer Name *</label>
                <Input placeholder="Acme Corporation" value={empForm.employerName} onChange={(e) => setEmpForm(f => ({ ...f, employerName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Position Title</label>
                <Input placeholder="Software Engineer" value={empForm.positionTitle} onChange={(e) => setEmpForm(f => ({ ...f, positionTitle: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Employment Type</label>
                <Select value={empForm.employmentType} onChange={(e) => setEmpForm(f => ({ ...f, employmentType: e.target.value }))}>
                  <option value="full_time">Full Time (40h/wk)</option>
                  <option value="part_time">Part Time (20h/wk)</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="unpaid_intern">Unpaid Intern</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Start Date *</label>
                <Input type="date" value={empForm.startDate} onChange={(e) => setEmpForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">End Date (leave blank if current)</label>
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
                <label key={field} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={(empForm as any)[field]} onChange={(e) => setEmpForm(f => ({ ...f, [field]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            {!empForm.reportedToSchool && (
              <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-800/30 text-sm text-amber-300">
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
            <div className="text-center py-8 text-slate-400">No employers logged yet</div>
          ) : (
            <div className="space-y-3">
              {employers.map((e) => (
                <div key={e.id} className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{e.employer_name}</p>
                      {e.is_current && <Badge variant="success" className="text-xs">Current</Badge>}
                    </div>
                    <p className="text-sm text-slate-400">{e.position_title ?? e.employment_type.replace("_", " ")}</p>
                    <p className="text-xs text-slate-500 mt-1">{e.start_date} → {e.end_date ?? "Present"}</p>
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
