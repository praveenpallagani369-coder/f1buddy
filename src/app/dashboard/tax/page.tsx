"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const TAX_TREATIES = ["India","China","South Korea","Germany","France","Japan","Canada","Philippines","Thailand","Israel","Romania","Other / No Treaty"];

export default function TaxPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ taxYear: new Date().getFullYear() - 1, filingStatus: "nonresident_1040nr", treatyCountry: "", form8843Filed: false, federalFiled: false, stateFiled: false, stateName: "", filedDate: "", notes: "" });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("tax_records").select("*").eq("user_id", user.id).order("tax_year", { ascending: false });
    setRecords(data ?? []);
    setLoading(false);
  }

  async function saveRecord() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("tax_records").insert({ user_id: user.id, ...form, treaty_country: form.treatyCountry || null, state_name: form.stateName || null, filed_date: form.filedDate || null, notes: form.notes || null });
    await load();
    setShowForm(false);
    setSaving(false);
  }

  if (loading) return <div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading tax records...</div>;

  const currentYear = new Date().getFullYear();
  const aprilDeadline = new Date(currentYear, 3, 15);
  const daysToDeadline = Math.ceil((aprilDeadline.getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tax Filing</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Track your annual tax filing status</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Tax Year</Button>
      </div>

      {/* Tax Deadline Alert */}
      {daysToDeadline > 0 && daysToDeadline <= 60 && (
        <div className={`p-4 rounded-xl border text-sm ${daysToDeadline <= 14 ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300" : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"}`}>
          <p className="font-medium">📅 Tax Deadline: April 15, {currentYear} — {daysToDeadline} days remaining</p>
          <p className="mt-1 text-xs opacity-80">F-1 students must file Form 1040-NR by April 15. Even with no US income, file Form 8843.</p>
        </div>
      )}

      {/* Info cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Filing Type</p>
            <p className="text-gray-900 font-medium">Form 1040-NR</p>
            <p className="text-sm text-gray-500">For nonresident aliens (most F-1 students)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Always Required</p>
            <p className="text-gray-900 font-medium">Form 8843</p>
            <p className="text-sm text-gray-500">Even if you earned zero income in the US</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Free Resources</p>
            <div className="space-y-1">
              <a href="https://www.sprintax.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-600 hover:underline">Sprintax</a>
              <a href="https://www.glaciertax.com" target="_blank" rel="noopener noreferrer" className="block text-sm text-indigo-600 hover:underline">Glacier Tax Prep</a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">Add Tax Year Record</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Tax Year *</label>
                <Input type="number" value={form.taxYear} onChange={(e) => setForm(f => ({ ...f, taxYear: parseInt(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Filing Status</label>
                <Select value={form.filingStatus} onChange={(e) => setForm(f => ({ ...f, filingStatus: e.target.value }))}>
                  <option value="nonresident_1040nr">Nonresident — 1040-NR</option>
                  <option value="resident_1040">Resident — 1040</option>
                  <option value="exempt_treaty">Treaty Exempt</option>
                  <option value="not_required">Not Required (no income)</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Tax Treaty Country</label>
                <Select value={form.treatyCountry} onChange={(e) => setForm(f => ({ ...f, treatyCountry: e.target.value }))}>
                  <option value="">No treaty / Unknown</option>
                  {TAX_TREATIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Date Filed</label>
                <Input type="date" value={form.filedDate} onChange={(e) => setForm(f => ({ ...f, filedDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">State Filed</label>
                <Input placeholder="California" value={form.stateName} onChange={(e) => setForm(f => ({ ...f, stateName: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { label: "Form 8843 Filed", field: "form8843Filed" },
                { label: "Federal Return Filed", field: "federalFiled" },
                { label: "State Return Filed", field: "stateFiled" },
              ].map(({ label, field }) => (
                <label key={field} className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form[field as keyof typeof form] as boolean} onChange={(e) => setForm(f => ({ ...f, [field]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveRecord} loading={saving}>Save Record</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filing History</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tax records yet — add your first filing</div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-100 border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-gray-900 font-medium">Tax Year {r.tax_year}</p>
                    <p className="text-sm text-gray-500 capitalize mt-0.5">{r.filing_status?.replace(/_/g, " ") ?? "Unknown status"}</p>
                    {r.treaty_country && <p className="text-xs text-gray-500">Treaty: {r.treaty_country}</p>}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {r.form_8843_filed && <Badge variant="success" className="text-xs">8843 ✓</Badge>}
                    {r.federal_filed && <Badge variant="success" className="text-xs">Federal ✓</Badge>}
                    {r.state_filed && <Badge variant="success" className="text-xs">State ✓</Badge>}
                    {!r.federal_filed && !r.form_8843_filed && <Badge variant="warning" className="text-xs">Not Filed</Badge>}
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
