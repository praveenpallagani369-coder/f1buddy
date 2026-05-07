"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const TAX_TREATIES = ["India","China","South Korea","Germany","France","Japan","Canada","Philippines","Thailand","Israel","Romania","Other / No Treaty"];

const KEY_DATES = [
  { date: "Jan 1", label: "New tax year begins", note: "Start tracking days in US for SPT", color: "text-blue-600 dark:text-blue-400" },
  { date: "Apr 15", label: "Form 1040-NR deadline", note: "File federal return or extension (Form 4868)", color: "text-red-600 dark:text-red-400" },
  { date: "Apr 15", label: "Form 8843 deadline", note: "Required even with zero US income", color: "text-red-600 dark:text-red-400" },
  { date: "Jun 15", label: "Extended deadline", note: "If your wages were only foreign-source income", color: "text-amber-600 dark:text-amber-400" },
  { date: "Oct 15", label: "Extension deadline", note: "If you filed Form 4868 by April 15", color: "text-purple-600 dark:text-purple-400" },
];

type TaxRecord = {
  id: string;
  tax_year: number;
  filing_status: string | null;
  treaty_country: string | null;
  form_8843_filed: boolean;
  federal_filed: boolean;
  state_filed: boolean;
  state_name: string | null;
  filed_date: string | null;
  notes: string | null;
};

function SPTCalculator() {
  const [days, setDays] = useState({ current: "", prior: "", twoYearsAgo: "" });
  const [yearsOnF1, setYearsOnF1] = useState("");

  const current = Math.min(parseInt(days.current) || 0, 366);
  const prior = Math.min(parseInt(days.prior) || 0, 366);
  const twoYearsAgo = Math.min(parseInt(days.twoYearsAgo) || 0, 366);
  const total = current + Math.floor(prior / 3) + Math.floor(twoYearsAgo / 6);
  const hasInput = days.current !== "";
  const exemptYears = parseInt(yearsOnF1) || 0;
  const isExemptIndividual = exemptYears < 5;
  const passesNumerically = total >= 183 && current >= 31;
  const isResident = passesNumerically && !isExemptIndividual;

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          🧮 Substantial Presence Test Calculator
          <Badge variant="info" className="text-xs font-normal">Determines 1040 vs 1040-NR</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          You are a <strong>US tax resident</strong> if you were in the US for ≥183 weighted days (formula below) AND at least 31 days this year.
          However, <strong>F-1 students are exempt from SPT for their first 5 calendar years</strong> in the US — even if the math says resident. — IRC §7701(b)(3)(D)
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              Days in the US — <strong>current year</strong> <span className="text-gray-400">(counts 1:1)</span>
            </label>
            <Input
              type="number" min="0" max="366" placeholder="e.g. 210"
              value={days.current}
              onChange={(e) => setDays(d => ({ ...d, current: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              Days in US — <strong>prior year</strong> <span className="text-gray-400">(counts 1/3)</span>
            </label>
            <Input
              type="number" min="0" max="366" placeholder="e.g. 300"
              value={days.prior}
              onChange={(e) => setDays(d => ({ ...d, prior: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              Days in US — <strong>2 years ago</strong> <span className="text-gray-400">(counts 1/6)</span>
            </label>
            <Input
              type="number" min="0" max="366" placeholder="e.g. 365"
              value={days.twoYearsAgo}
              onChange={(e) => setDays(d => ({ ...d, twoYearsAgo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              Calendar years on F-1/J-1 visa in the US
            </label>
            <Input
              type="number" min="0" max="20" placeholder="e.g. 3"
              value={yearsOnF1}
              onChange={(e) => setYearsOnF1(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Years spent on F-1/J-1 in the US (not total years in US)</p>
          </div>
        </div>

        {hasInput && (
          <div className={`p-4 rounded-xl border ${isResident
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800"
            : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className={`font-semibold text-sm ${isResident ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {isResident ? "⚠️ Resident for Tax Purposes → File 1040" : "✅ Nonresident for Tax Purposes → File 1040-NR"}
                </p>
                <p className={`text-xs mt-1 ${isResident ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  Weighted days: {current} + {Math.floor(prior / 3)} + {Math.floor(twoYearsAgo / 6)} = <strong>{total}</strong> / 183 threshold
                  {!isResident && isExemptIndividual && yearsOnF1 && (
                    <span className="block mt-0.5">F-1 exempt individual (year {exemptYears} of 5) — SPT does not apply</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
                <p className="text-xs text-gray-500">weighted days</p>
              </div>
            </div>
            {isResident && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Consult your DSO or an immigration attorney — becoming a tax resident has complex visa implications.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400">
          This is informational only. Consult a tax professional or your DSO for advice specific to your situation.
        </p>
      </CardContent>
    </Card>
  );
}

const EMPTY_FORM = {
  taxYear: new Date().getFullYear() - 1,
  filingStatus: "nonresident_1040nr",
  treatyCountry: "",
  form8843Filed: false,
  federalFiled: false,
  stateFiled: false,
  stateName: "",
  filedDate: "",
  notes: "",
};

export default function TaxPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showSPT, setShowSPT] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("tax_records").select("*").eq("user_id", user.id).order("tax_year", { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }

  function startEdit(r: TaxRecord) {
    setEditingId(r.id);
    setForm({
      taxYear: r.tax_year,
      filingStatus: r.filing_status ?? "nonresident_1040nr",
      treatyCountry: r.treaty_country ?? "",
      form8843Filed: r.form_8843_filed,
      federalFiled: r.federal_filed,
      stateFiled: r.state_filed,
      stateName: r.state_name ?? "",
      filedDate: r.filed_date ?? "",
      notes: r.notes ?? "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveRecord() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      tax_year: form.taxYear,
      filing_status: form.filingStatus,
      treaty_country: form.treatyCountry || null,
      form_8843_filed: form.form8843Filed,
      federal_filed: form.federalFiled,
      state_filed: form.stateFiled,
      state_name: form.stateName || null,
      filed_date: form.filedDate || null,
      notes: form.notes || null,
    };

    if (editingId) {
      await supabase.from("tax_records").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editingId);
    } else {
      await supabase.from("tax_records").insert({ user_id: user.id, ...payload });
    }

    await load();
    cancelForm();
    setSaving(false);
  }

  async function deleteRecord(id: string) {
    if (!confirm("Delete this tax record?")) return;
    await supabase.from("tax_records").delete().eq("id", id);
    setRecords(r => r.filter(x => x.id !== id));
  }

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading tax records...</div>;

  const currentYear = new Date().getFullYear();
  const aprilDeadline = new Date(currentYear, 3, 15);
  const daysToDeadline = Math.ceil((aprilDeadline.getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tax Filing</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Track your annual tax filing status as an F-1 student</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSPT(s => !s)}>
            {showSPT ? "Hide SPT Calc" : "🧮 SPT Calculator"}
          </Button>
          <Button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}>
            + Add Tax Year
          </Button>
        </div>
      </div>

      {/* Tax deadline alert */}
      {daysToDeadline > 0 && daysToDeadline <= 60 && (
        <div className={`p-4 rounded-xl border text-sm ${daysToDeadline <= 14
          ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"}`}>
          <p className="font-medium">📅 Tax Deadline: April 15, {currentYear} — {daysToDeadline} days remaining</p>
          <p className="mt-1 text-xs opacity-80">F-1 students must file Form 1040-NR by April 15. Even with no US income, file Form 8843 to maintain your immigration record.</p>
        </div>
      )}

      {/* SPT Calculator */}
      {showSPT && <SPTCalculator />}

      {/* Key Dates */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">📅 Key Tax Dates</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {KEY_DATES.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                <span className={`text-sm font-bold w-12 flex-shrink-0 ${d.color}`}>{d.date}</span>
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{d.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{d.note}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Form</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium">Form 1040-NR</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">For nonresident aliens — most F-1 students for their first 5 years</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Always Required</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium">Form 8843</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Statement for exempt individuals — required even with zero income</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Free Resources</p>
            <div className="space-y-1">
              <a href="https://www.sprintax.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-600 hover:underline">Sprintax</a>
              <a href="https://www.glaciertax.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-600 hover:underline">Glacier Tax Prep</a>
              <a href="https://www.irs.gov/individuals/international-taxpayers/foreign-student-liability-for-fica-and-futa-taxes" target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-600 hover:underline">IRS F-1 Guide</a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Edit Tax Year Record" : "Add Tax Year Record"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Tax Year *</label>
                <Input type="number" value={form.taxYear} onChange={(e) => setForm(f => ({ ...f, taxYear: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Filing Status</label>
                <Select value={form.filingStatus} onChange={(e) => setForm(f => ({ ...f, filingStatus: e.target.value }))}>
                  <option value="nonresident_1040nr">Nonresident — 1040-NR</option>
                  <option value="resident_1040">Resident — 1040</option>
                  <option value="exempt_treaty">Treaty Exempt</option>
                  <option value="not_required">Not Required (no income)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Tax Treaty Country</label>
                <Select value={form.treatyCountry} onChange={(e) => setForm(f => ({ ...f, treatyCountry: e.target.value }))}>
                  <option value="">No treaty / Unknown</option>
                  {TAX_TREATIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Date Filed</label>
                <Input type="date" value={form.filedDate} onChange={(e) => setForm(f => ({ ...f, filedDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">State Filed</label>
                <Input placeholder="e.g., California" value={form.stateName} onChange={(e) => setForm(f => ({ ...f, stateName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Notes</label>
                <Input placeholder="e.g., Used Sprintax, treaty article 21..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { label: "Form 8843 Filed", field: "form8843Filed" },
                { label: "Federal Return Filed", field: "federalFiled" },
                { label: "State Return Filed", field: "stateFiled" },
              ].map(({ label, field }) => (
                <label key={field} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input type="checkbox" checked={form[field as keyof typeof form] as boolean} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={cancelForm}>Cancel</Button>
              <Button onClick={saveRecord} loading={saving}>{editingId ? "Update Record" : "Save Record"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filing History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filing History</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <p className="text-3xl mb-2">🧾</p>
              <p className="font-medium mb-1">No tax records yet</p>
              <p className="text-sm">Add your first filing to start tracking your tax history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => {
                const allFiled = r.form_8843_filed && r.federal_filed;
                const noneFiled = !r.form_8843_filed && !r.federal_filed;
                return (
                  <div key={r.id} className={`p-4 rounded-xl border ${allFiled ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20" : noneFiled ? "border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="text-gray-900 dark:text-gray-100 font-semibold text-base">Tax Year {r.tax_year}</p>
                          <Badge variant={allFiled ? "success" : noneFiled ? "warning" : "info"} className="text-xs">
                            {allFiled ? "Fully Filed" : noneFiled ? "Not Filed" : "Partially Filed"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-2">
                          {r.filing_status?.replace(/_/g, " ") ?? "Unknown status"}
                          {r.treaty_country && ` · Treaty: ${r.treaty_country}`}
                          {r.state_name && ` · ${r.state_name}`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={r.form_8843_filed ? "success" : "warning"} className="text-xs">
                            {r.form_8843_filed ? "✓ 8843" : "✗ 8843 pending"}
                          </Badge>
                          <Badge variant={r.federal_filed ? "success" : "warning"} className="text-xs">
                            {r.federal_filed ? "✓ Federal" : "✗ Federal pending"}
                          </Badge>
                          {(r.state_filed || r.state_name) && (
                            <Badge variant={r.state_filed ? "success" : "warning"} className="text-xs">
                              {r.state_filed ? "✓ State" : "✗ State pending"}
                            </Badge>
                          )}
                          {r.filed_date && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Filed: {r.filed_date}</span>
                          )}
                        </div>
                        {r.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">{r.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => startEdit(r)}>Edit</Button>
                        <button onClick={() => deleteRecord(r.id)} className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-2 py-1">✕</button>
                      </div>
                    </div>
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
