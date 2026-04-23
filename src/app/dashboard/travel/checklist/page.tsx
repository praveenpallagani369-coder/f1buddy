"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateTravelChecklist, getOverallStatus } from "@/lib/immigration/travel-checklist";
import type { CheckItem } from "@/lib/immigration/travel-checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const STATUS_CONFIG = {
  pass: { icon: "✅", color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/30", label: "Good" },
  warn: { icon: "⚠️", color: "text-amber-400", bg: "bg-amber-900/20 border-amber-800/30", label: "Attention" },
  fail: { icon: "🚫", color: "text-red-400", bg: "bg-red-900/20 border-red-800/30", label: "Action Required" },
  unknown: { icon: "❓", color: "text-slate-400", bg: "bg-slate-800/50 border-slate-700", label: "Unknown" },
};

const OVERALL_CONFIG = {
  pass: { label: "All Clear — Safe to Travel", color: "text-emerald-400", border: "border-emerald-800/30", bg: "bg-emerald-900/10", icon: "✈️" },
  warn: { label: "Review Before Traveling", color: "text-amber-400", border: "border-amber-800/30", bg: "bg-amber-900/10", icon: "⚠️" },
  fail: { label: "Do NOT Travel — Issues Found", color: "text-red-400", border: "border-red-800/30", bg: "bg-red-900/10", icon: "🚫" },
};

export default function TravelChecklistPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [opt, setOpt] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [checklist, setChecklist] = useState<CheckItem[] | null>(null);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [profileRes, optRes, docsRes] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
        supabase.from("documents").select("doc_type, expiration_date").eq("user_id", user.id).is("deleted_at", null),
      ]);
      setProfile(profileRes.data);
      setOpt(optRes.data);
      setDocs(docsRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function runChecklist() {
    if (!departureDate) return;
    const visaStampDoc = docs.find((d) => d.doc_type === "visa_stamp");
    const result = generateTravelChecklist({
      departureDate,
      returnDate: returnDate || null,
      i20TravelSignatureDate: profile?.i20_travel_signature_date ?? null,
      visaStampExpiry: profile?.visa_stamp_expiry ?? visaStampDoc?.expiration_date ?? null,
      passportExpiry: profile?.passport_expiry ?? null,
      programEndDate: profile?.program_end_date ?? null,
      hasEAD: !!opt?.ead_end_date,
      eadEndDate: opt?.ead_end_date ?? null,
      unemploymentDaysUsed: opt?.unemployment_days_used ?? 0,
      unemploymentLimit: opt?.unemployment_limit ?? 90,
      optType: opt?.opt_type ?? null,
      documents: docs,
    });
    setChecklist(result);
    setGenerated(true);
  }

  async function saveTravelSignatureDate(date: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").update({ i20_travel_signature_date: date, updated_at: new Date().toISOString() }).eq("id", user.id);
    setProfile((p: any) => ({ ...p, i20_travel_signature_date: date }));
  }

  if (loading) return <div className="text-slate-400 text-center py-20">Loading your data...</div>;

  const overall = checklist ? getOverallStatus(checklist) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/travel" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">← Travel</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-white">Pre-Travel Checklist</h1>
      </div>
      <p className="text-slate-400 text-sm -mt-4">
        Run this before every international trip. We check your documents, signatures, and OPT status automatically.
      </p>

      {/* Trip Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Trip Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Departure Date *</label>
              <Input type="date" value={departureDate} onChange={(e) => { setDepartureDate(e.target.value); setGenerated(false); }} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Return Date (if known)</label>
              <Input type="date" value={returnDate} onChange={(e) => { setReturnDate(e.target.value); setGenerated(false); }} />
            </div>
          </div>

          {/* I-20 travel signature quick-update */}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 mb-5">
            <p className="text-sm font-medium text-slate-300 mb-2">I-20 Travel Signature Date</p>
            <p className="text-xs text-slate-500 mb-2">The date your DSO last signed your I-20 for travel (check the bottom of your I-20)</p>
            <div className="flex gap-2 items-center">
              <Input type="date" className="max-w-[200px]"
                defaultValue={profile?.i20_travel_signature_date ?? ""}
                onChange={(e) => saveTravelSignatureDate(e.target.value)}
              />
              <span className="text-xs text-slate-500">
                {profile?.i20_travel_signature_date
                  ? `Saved: ${profile.i20_travel_signature_date}`
                  : "Not set — enter the date from your I-20"}
              </span>
            </div>
          </div>

          <Button onClick={runChecklist} disabled={!departureDate} className="w-full sm:w-auto">
            Run Checklist →
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {generated && checklist && overall && (
        <>
          {/* Overall verdict */}
          <div className={`p-5 rounded-xl border ${OVERALL_CONFIG[overall].bg} ${OVERALL_CONFIG[overall].border}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{OVERALL_CONFIG[overall].icon}</span>
              <div>
                <p className={`text-lg font-bold ${OVERALL_CONFIG[overall].color}`}>{OVERALL_CONFIG[overall].label}</p>
                <p className="text-sm text-slate-400">
                  {overall === "pass"
                    ? "All checks passed. Keep your documents accessible during travel."
                    : overall === "warn"
                    ? "Some items need attention before or during your trip. Review below."
                    : "Critical issues found. Resolve these before departing."}
                </p>
              </div>
            </div>
          </div>

          {/* Individual checks */}
          <div className="space-y-3">
            {checklist.map((item) => {
              const cfg = STATUS_CONFIG[item.status];
              return (
                <div key={item.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5 flex-shrink-0">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white">{item.title}</p>
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {item.cfr && (
                          <span className="text-xs text-slate-600 font-mono">{item.cfr}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 mt-1 leading-relaxed">{item.detail}</p>
                      {item.action && (
                        <div className="mt-2 flex items-start gap-2">
                          <span className="text-indigo-400 text-xs">→</span>
                          <p className="text-sm text-indigo-300 font-medium">{item.action}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Documents to carry reminder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">📋 Documents to Carry</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-3">Bring originals + photocopies of these when traveling internationally:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  "Valid passport",
                  "F-1 visa stamp (or know auto-revalidation eligibility)",
                  "Form I-20 with valid travel signature",
                  "Printed I-94 record (cbp.dhs.gov/I94)",
                  "University enrollment letter",
                  ...(opt?.ead_end_date ? ["EAD card (original)", "Recent pay stub / offer letter"] : []),
                  "Emergency contact list",
                  "DSO contact information",
                ].map((doc) => (
                  <div key={doc} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 flex-shrink-0">◆</span>
                    {doc}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <Link href="/dashboard/dso-email" className="text-sm text-indigo-400 hover:underline">
                  ✉️ Need a travel signature? Use the DSO Email Generator →
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
