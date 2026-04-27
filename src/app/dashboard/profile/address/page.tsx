"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function AddressPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Record<string, string | boolean | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ line1: "", city: "", state: "", zip: "" });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users")
        .select("current_address_line1, current_address_city, current_address_state, current_address_zip, address_updated_at, address_reported_to_dso, dso_name, dso_email")
        .eq("id", user.id).single();
      setProfile(data);
      if (data) {
        setForm({ line1: data.current_address_line1 ?? "", city: data.current_address_city ?? "", state: data.current_address_state ?? "", zip: data.current_address_zip ?? "" });
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAddress() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("users").update({
      current_address_line1: form.line1,
      current_address_city: form.city,
      current_address_state: form.state,
      current_address_zip: form.zip,
      address_updated_at: now,
      address_reported_to_dso: false, // reset on address change
      updated_at: now,
    }).eq("id", user.id);

    // Auto-create a 10-day SEVIS reporting deadline
    await supabase.from("compliance_deadlines").insert({
      user_id: user.id,
      title: "Report New Address to DSO (SEVIS Update)",
      description: `You updated your address to ${form.line1}, ${form.city}, ${form.state} ${form.zip}. You must report this change to your DSO within 10 days so they can update SEVIS.`,
      deadline_date: format(new Date(Date.now() + 10 * 86400000), "yyyy-MM-dd"),
      category: "sevis",
      severity: "critical",
      status: "pending",
      is_system_generated: true,
    });

    const { data } = await supabase.from("users")
      .select("current_address_line1, current_address_city, current_address_state, current_address_zip, address_updated_at, address_reported_to_dso, dso_name, dso_email")
      .eq("id", user.id).single();
    setProfile(data);
    setEditing(false);
    setSaving(false);
  }

  async function markReported() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").update({ address_reported_to_dso: true, updated_at: new Date().toISOString() }).eq("id", user.id);
    // Mark related deadline as completed
    await supabase.from("compliance_deadlines")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("title", "Report New Address to DSO (SEVIS Update)").eq("status", "pending");
    setProfile((p) => p ? { ...p, address_reported_to_dso: true } : p);
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Loading address...</div>;

  const hasAddress = !!(profile?.current_address_line1 && profile?.current_address_city);
  const daysSinceUpdate = profile?.address_updated_at
    ? differenceInCalendarDays(new Date(), parseISO(profile.address_updated_at as string))
    : null;
  const reportingDeadlinePassed = daysSinceUpdate !== null && daysSinceUpdate > 10 && !profile?.address_reported_to_dso;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/profile" className="text-gray-400 hover:text-gray-600 text-sm">← Profile</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900">US Address & SEVIS Reporting</h1>
      </div>

      {/* CFR Info */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
        <p className="font-medium mb-1">📋 Federal Requirement — 8 CFR 214.2(f)(18)</p>
        <p>F-1 students must report any change of US address to their DSO within <strong>10 days</strong> of moving. The DSO then updates your SEVIS record. Failure to report can jeopardize your F-1 status.</p>
      </div>

      {/* Reporting status alert */}
      {hasAddress && !profile?.address_reported_to_dso && (
        <div className={`p-4 rounded-xl border text-sm ${reportingDeadlinePassed ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
          <p className="font-medium mb-1">
            {reportingDeadlinePassed ? "🚨 Overdue — Must Report Now" : "⚠️ Action Required — Report to DSO"}
          </p>
          <p>
            You updated your address {daysSinceUpdate !== null ? `${daysSinceUpdate} day${daysSinceUpdate !== 1 ? "s" : ""} ago` : "recently"}.
            {reportingDeadlinePassed ? " The 10-day reporting window has passed. Contact your DSO immediately." : " You have until the 10-day deadline to report to your DSO."}
          </p>
          <div className="flex gap-3 mt-3 flex-wrap">
            {profile?.dso_email && (
              <Link href="/dashboard/dso-email?template=address" className="text-xs px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-600/30 hover:bg-amber-600/30 transition-colors">
                ✉️ Generate DSO Email →
              </Link>
            )}
            <button onClick={markReported} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/30 transition-colors">
              ✓ I reported to my DSO
            </button>
          </div>
        </div>
      )}

      {/* Confirmed reported */}
      {hasAddress && profile?.address_reported_to_dso && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          ✅ Address reported to DSO — SEVIS update in progress
        </div>
      )}

      {/* Current Address Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current US Address</CardTitle>
            <div className="flex items-center gap-2">
              {hasAddress && (
                <Badge variant={profile?.address_reported_to_dso ? "success" : "warning"}>
                  {profile?.address_reported_to_dso ? "Reported to DSO" : "Not Reported"}
                </Badge>
              )}
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  {hasAddress ? "Update Address" : "Add Address"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                ⚠️ Updating your address will automatically create a 10-day SEVIS reporting deadline in your Deadlines page.
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Street Address *</label>
                <Input placeholder="123 Main Street, Apt 4B" value={form.line1} onChange={(e) => setForm(f => ({ ...f, line1: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm text-gray-600 mb-1.5">City *</label>
                  <Input placeholder="Boston" value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">State *</label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">ZIP *</label>
                  <Input placeholder="02115" value={form.zip} onChange={(e) => setForm(f => ({ ...f, zip: e.target.value }))} maxLength={5} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={saveAddress} loading={saving} disabled={!form.line1 || !form.city || !form.state || !form.zip}>
                  Save & Create Reminder
                </Button>
              </div>
            </div>
          ) : hasAddress ? (
            <div>
              <p className="text-gray-900 font-medium">{profile.current_address_line1}</p>
              <p className="text-gray-600">{profile.current_address_city}, {profile.current_address_state} {profile.current_address_zip}</p>
              {profile.address_updated_at && (
                <p className="text-xs text-gray-400 mt-2">
                  Last updated: {format(parseISO(profile.address_updated_at as string), "MMM d, yyyy")}
                  {daysSinceUpdate !== null && ` (${daysSinceUpdate} days ago)`}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">🏠</p>
              <p className="text-gray-500 text-sm">No US address on file</p>
              <p className="text-gray-400 text-xs mt-1">Add your current address to enable SEVIS reporting reminders</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reporting history info */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">What happens when you move</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {[
              { step: "1", text: "Update your address here in F1Buddy", note: "We auto-create a 10-day reporting deadline" },
              { step: "2", text: "Email your DSO with your new address", note: "Use our DSO Email Generator for a pre-written email" },
              { step: "3", text: "DSO updates your SEVIS record", note: "Usually done within 1–3 business days" },
              { step: "4", text: "Mark as reported in F1Buddy", note: "Clears the deadline from your compliance dashboard" },
            ].map((item) => (
              <li key={item.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-600 text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{item.text}</p>
                  <p className="text-xs text-gray-400">{item.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
