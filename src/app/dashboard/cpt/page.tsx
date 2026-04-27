"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// 8 CFR 214.2(f)(10)(i): Full-time CPT >= 12 months → OPT ineligible
const FULL_TIME_CPT_OPT_DISQUALIFY_DAYS = 365;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function CPTPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tableExists, setTableExists] = useState(true);

  const [form, setForm] = useState({
    employerName: "",
    positionTitle: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    cptType: "part_time",
    isAuthorizedOnI20: false,
    courseName: "",
    notes: "",
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("cpt_records").select("*").eq("user_id", user.id).order("start_date", { ascending: false });
    if (error?.code === "42P01") { setTableExists(false); setLoading(false); return; }
    setRecords(data ?? []);
    setLoading(false);
  }

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function saveRecord() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (form.isCurrent) await supabase.from("cpt_records").update({ is_current: false }).eq("user_id", user.id);
    await supabase.from("cpt_records").insert({
      user_id: user.id,
      employer_name: form.employerName,
      position_title: form.positionTitle || null,
      start_date: form.startDate,
      end_date: form.endDate || null,
      is_current: form.isCurrent,
      cpt_type: form.cptType,
      is_authorized_on_i20: form.isAuthorizedOnI20,
      course_name: form.courseName || null,
      notes: form.notes || null,
    });
    await load();
    setShowForm(false);
    setForm({ employerName: "", positionTitle: "", startDate: "", endDate: "", isCurrent: false, cptType: "part_time", isAuthorizedOnI20: false, courseName: "", notes: "" });
    setSaving(false);
  }

  async function deleteRecord(id: string) {
    await supabase.from("cpt_records").delete().eq("id", id);
    setRecords((r) => r.filter((x) => x.id !== id));
  }

  // Calculate full-time CPT days used (for OPT eligibility check)
  const today = new Date();
  const fullTimeDays = records
    .filter((r) => r.cpt_type === "full_time")
    .reduce((sum, r) => {
      const start = parseISO(r.start_date);
      const end = r.end_date ? parseISO(r.end_date) : today;
      return sum + Math.max(0, differenceInCalendarDays(end, start));
    }, 0);

  const optEligibilityRisk = fullTimeDays >= FULL_TIME_CPT_OPT_DISQUALIFY_DAYS;
  const optEligibilityWarning = fullTimeDays >= 300 && !optEligibilityRisk;

  if (loading) return <div className="text-slate-400 text-center py-20">Loading CPT records...</div>;

  if (!tableExists) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-white">CPT Tracker</h1>
        <Card className="border-amber-800/50">
          <CardContent className="p-6">
            <p className="text-amber-300 font-medium mb-2">🔧 Database setup required</p>
            <p className="text-sm text-slate-400 mb-4">
              The CPT records table needs to be created in your Supabase database. Run the migration below in your Supabase SQL Editor.
            </p>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-300 overflow-x-auto">
              <p>Go to: supabase.com → your project → SQL Editor</p>
              <p className="mt-1">Run the file: <strong>supabase/migrations/003_cpt_records.sql</strong></p>
            </div>
            <p className="text-xs text-slate-500 mt-3">After running the migration, refresh this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">CPT Tracker</h1>
          <p className="text-slate-400 text-sm mt-0.5">Curricular Practical Training — authorization tied to your I-20 and a specific course</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add CPT Record</Button>
      </div>

      {/* OPT eligibility warning */}
      {optEligibilityRisk && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-800/30">
          <p className="text-sm font-bold text-red-300 mb-1">🚨 OPT Ineligibility Risk — Full-time CPT Used: {fullTimeDays} days</p>
          <p className="text-sm text-red-200">
            You have used <strong>{fullTimeDays} days</strong> of full-time CPT. Students who accumulate <strong>12+ months of full-time CPT become ineligible for OPT</strong>. — 8 CFR 214.2(f)(10)(i)
          </p>
          <p className="text-xs text-red-400 mt-2">Contact your DSO immediately to understand your OPT eligibility status.</p>
        </div>
      )}
      {optEligibilityWarning && (
        <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-800/30">
          <p className="text-sm font-semibold text-amber-300 mb-1">⚠️ Approaching 12-Month Full-time CPT Limit — {fullTimeDays} days used</p>
          <p className="text-sm text-amber-200">
            You have {FULL_TIME_CPT_OPT_DISQUALIFY_DAYS - fullTimeDays} days of full-time CPT remaining before you lose OPT eligibility.
            After 12 months of full-time CPT, you cannot use OPT. — 8 CFR 214.2(f)(10)(i)
          </p>
        </div>
      )}

      {/* CPT Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Total CPT Records</p>
            <p className="text-2xl font-bold text-white">{records.length}</p>
          </CardContent>
        </Card>
        <Card className={optEligibilityRisk ? "border-red-800/50" : optEligibilityWarning ? "border-amber-800/50" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Full-time CPT Days</p>
            <p className={`text-2xl font-bold ${optEligibilityRisk ? "text-red-400" : optEligibilityWarning ? "text-amber-400" : "text-white"}`}>
              {fullTimeDays}
            </p>
            <p className="text-xs text-slate-500">/ {FULL_TIME_CPT_OPT_DISQUALIFY_DAYS} day OPT limit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">OPT Eligibility</p>
            <p className={`text-lg font-bold ${optEligibilityRisk ? "text-red-400" : optEligibilityWarning ? "text-amber-400" : "text-emerald-400"}`}>
              {optEligibilityRisk ? "At Risk" : optEligibilityWarning ? "Watch" : "Eligible"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CPT Rules */}
      <Card className="border-slate-700/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-300">📋 CPT Rules Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              { rule: "Must be authorized on your I-20 BEFORE starting work", crit: true },
              { rule: "Must be tied to a required or elective course in your curriculum", crit: true },
              { rule: "Part-time CPT (< 20h/wk): unlimited — no OPT impact", crit: false },
              { rule: "Full-time CPT (≥ 20h/wk) for 12+ months = OPT ineligible", crit: true },
              { rule: "CPT requires a new I-20 for each employer/semester authorization", crit: true },
              { rule: "CPT does NOT count against OPT unemployment days", crit: false },
              { rule: "Cannot start CPT before receiving the updated I-20 from DSO", crit: true },
              { rule: "8 CFR 214.2(f)(10)(i) — authorization required per semester", crit: false },
            ].map((item) => (
              <div key={item.rule} className="flex items-start gap-2">
                <span className={`flex-shrink-0 mt-0.5 ${item.crit ? "text-red-400" : "text-emerald-400"}`}>{item.crit ? "⚠" : "✓"}</span>
                <span className="text-slate-400">{item.rule}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Record Form */}
      {showForm && (
        <Card className="border-indigo-800/50">
          <CardHeader><CardTitle className="text-base">Add CPT Record</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Employer Name *">
                <Input placeholder="Acme Corp" value={form.employerName} onChange={(e) => set("employerName", e.target.value)} />
              </Field>
              <Field label="Position Title">
                <Input placeholder="Software Engineering Intern" value={form.positionTitle} onChange={(e) => set("positionTitle", e.target.value)} />
              </Field>
              <Field label="CPT Type" hint="Full-time = 20+ hrs/week. 12+ months full-time = OPT ineligible.">
                <Select value={form.cptType} onChange={(e) => set("cptType", e.target.value)}>
                  <option value="part_time">Part-Time (&lt; 20 hrs/week)</option>
                  <option value="full_time">Full-Time (≥ 20 hrs/week)</option>
                </Select>
              </Field>
              <Field label="Course Name (CPT must be tied to a course)">
                <Input placeholder="CS 590 Internship Practicum" value={form.courseName} onChange={(e) => set("courseName", e.target.value)} />
              </Field>
              <Field label="Start Date *">
                <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </Field>
              <Field label="End Date (leave blank if ongoing)">
                <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { label: "I-20 authorized for this CPT (required before starting)", field: "isAuthorizedOnI20" },
                { label: "Currently working here", field: "isCurrent" },
              ].map(({ label, field }) => (
                <label key={field} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form[field as keyof typeof form] as boolean} onChange={(e) => set(field, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            {!form.isAuthorizedOnI20 && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/30 text-sm text-red-300">
                🚨 You CANNOT start CPT without an updated I-20 authorizing this employer. Contact your DSO first.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveRecord} loading={saving} disabled={!form.employerName || !form.startDate}>Save CPT Record</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <Card>
        <CardHeader><CardTitle className="text-base">CPT History</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-2xl mb-2">📚</p>
              <p>No CPT records yet</p>
              <p className="text-xs mt-1">Add your CPT authorizations to track OPT eligibility</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const start = parseISO(r.start_date);
                const end = r.end_date ? parseISO(r.end_date) : today;
                const duration = differenceInCalendarDays(end, start);
                return (
                  <div key={r.id} className="flex items-start justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium">{r.employer_name}</p>
                        {r.is_current && <Badge variant="success" className="text-xs">Current</Badge>}
                        <Badge variant={r.cpt_type === "full_time" ? "warning" : "info"} className="text-xs">
                          {r.cpt_type === "full_time" ? "Full-time" : "Part-time"}
                        </Badge>
                        {!r.is_authorized_on_i20 && <Badge variant="critical" className="text-xs">⚠ I-20 not verified</Badge>}
                      </div>
                      {r.position_title && <p className="text-sm text-slate-400 mt-0.5">{r.position_title}</p>}
                      {r.course_name && <p className="text-xs text-slate-500 mt-0.5">Course: {r.course_name}</p>}
                      <p className="text-xs text-slate-500 mt-1">
                        {r.start_date} → {r.end_date ?? "Present"} · {duration} days
                      </p>
                    </div>
                    <button onClick={() => deleteRecord(r.id)} className="text-slate-600 hover:text-red-400 text-xs ml-4 flex-shrink-0">
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
