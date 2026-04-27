"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateTravelChecklist, getOverallStatus } from "@/lib/immigration/travel-checklist";
import type { CheckItem } from "@/lib/immigration/travel-checklist";

interface ProfileRow {
  i20_travel_signature_date: string | null;
  visa_stamp_expiry: string | null;
  passport_expiry: string | null;
  program_end_date: string | null;
}

interface OPTRow {
  ead_end_date: string | null;
  ead_start_date: string | null;
  unemployment_days_used: number;
  unemployment_limit: number;
  opt_type: string | null;
  application_date: string | null;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const STATUS_CONFIG = {
  pass: { icon: "✅", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Good" },
  warn: { icon: "⚠️", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Attention" },
  fail: { icon: "🚫", color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Action Required" },
  unknown: { icon: "❓", color: "text-gray-500", bg: "bg-gray-100 border-gray-200", label: "Unknown" },
};

const OVERALL_CONFIG = {
  pass: { label: "All Clear — Safe to Travel", color: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50", icon: "✈️" },
  warn: { label: "Review Before Traveling", color: "text-amber-600", border: "border-amber-200", bg: "bg-amber-50", icon: "⚠️" },
  fail: { label: "Do NOT Travel — Issues Found", color: "text-red-600", border: "border-red-200", bg: "bg-red-50", icon: "🚫" },
};

export default function TravelChecklistPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [opt, setOpt] = useState<OPTRow | null>(null);
  const [docs, setDocs] = useState<{ doc_type: string; expiration_date: string | null }[]>([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      documents: docs.map((d) => ({ docType: d.doc_type, expirationDate: d.expiration_date })),
    });
    setChecklist(result);
    setGenerated(true);
  }

  async function saveTravelSignatureDate(date: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").update({ i20_travel_signature_date: date, updated_at: new Date().toISOString() }).eq("id", user.id);
    setProfile((p) => p ? { ...p, i20_travel_signature_date: date } : p);
  }

  if (loading) return <div className="text-gray-500 text-center py-20">Loading your data...</div>;

  const overall = checklist ? getOverallStatus(checklist) : null;

  // OPT initial pending: applied, but no active EAD yet (post-graduation waiting period)
  const isInitialOPTPending = !!(
    opt?.application_date &&
    (!opt?.ead_start_date || new Date() < new Date(opt.ead_start_date))
  );

  // STEM extension pending: has an existing OPT EAD, filed for STEM extension
  // Travel is PERMITTED per DHS 81 FR 13103; 180-day auto-extension applies per 8 CFR 274a.12(b)(6)(iv)
  const isStemExtensionPending = !!(
    opt?.opt_type === "stem_extension" &&
    opt?.application_date &&
    opt?.ead_start_date &&
    new Date() >= new Date(opt.ead_start_date)
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/travel" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">← Travel</Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Pre-Travel Checklist</h1>
      </div>
      <p className="text-gray-500 text-sm -mt-4">
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
              <label className="block text-sm text-gray-600 mb-1.5">Departure Date *</label>
              <Input type="date" value={departureDate} onChange={(e) => { setDepartureDate(e.target.value); setGenerated(false); }} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Return Date (if known)</label>
              <Input type="date" value={returnDate} onChange={(e) => { setReturnDate(e.target.value); setGenerated(false); }} />
            </div>
          </div>

          {/* I-20 travel signature quick-update */}
          <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 mb-5">
            <p className="text-sm font-medium text-gray-600 mb-2">I-20 Travel Signature Date</p>
            <p className="text-xs text-gray-400 mb-2">The date your DSO last signed your I-20 for travel (check the bottom of your I-20)</p>
            <div className="flex gap-2 items-center">
              <Input type="date" className="max-w-[200px]"
                defaultValue={profile?.i20_travel_signature_date ?? ""}
                onChange={(e) => saveTravelSignatureDate(e.target.value)}
              />
              <span className="text-xs text-gray-400">
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

      {/* Scenario 1: OPT initial pending — HIGH RISK */}
      {isInitialOPTPending && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-bold text-red-700 mb-1">🚨 OPT Application Pending — High Travel Risk</p>
          <p className="text-sm text-red-800 leading-relaxed">
            Your OPT application is pending and you have <strong>no active EAD</strong>. USCIS and ICE have historically treated departure as potential abandonment of a pending OPT application. You have no work authorization to return to.
          </p>
          <ul className="mt-2 text-xs text-red-700 space-y-1">
            <li>• Consult your DSO before booking any international travel</li>
            <li>• Get a travel letter from your DSO documenting your pending application</li>
            <li>• Keep your I-797 receipt notice accessible at all times</li>
            <li>• Re-entry as F-1 requires full CBP inspection — carry all application documents</li>
          </ul>
          <p className="text-xs text-red-600 mt-2 font-mono">USCIS guidance: departure may constitute abandonment of pending OPT application</p>
        </div>
      )}

      {/* Scenario 2: STEM extension pending — travel PERMITTED */}
      {isStemExtensionPending && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm font-bold text-blue-700 mb-1">ℹ️ STEM Extension Pending — Travel Permitted</p>
          <p className="text-sm text-blue-800 leading-relaxed">
            Travel is permitted while your STEM OPT extension is pending. Per DHS 81 FR 13103, you may continue to work and travel under your current authorization. If your OPT EAD expires while pending, an automatic 180-day extension applies under 8 CFR 274a.12(b)(6)(iv).
          </p>
          <ul className="mt-2 text-xs text-blue-700 space-y-1">
            <li>• Carry your I-797 receipt notice — it proves authorized status during the 180-day extension</li>
            <li>• Your EAD card + I-797 together serve as evidence of continued work authorization</li>
            <li>• Ensure your I-20 travel signature is current (within 6 months for OPT/STEM)</li>
            <li>• Notify your DSO about international travel plans as a courtesy</li>
          </ul>
          <p className="text-xs text-blue-500 mt-2 font-mono">Per DHS 81 FR 13103 and 8 CFR 274a.12(b)(6)(iv)</p>
        </div>
      )}

      {/* Scenario 3: H-1B COS static warning — shown whenever any OPT application is pending */}
      {(isInitialOPTPending || isStemExtensionPending) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm font-bold text-amber-700 mb-1">⚠️ H-1B Change of Status Pending? — Do NOT Travel</p>
          <p className="text-sm text-amber-800 leading-relaxed">
            If your employer has also filed an H-1B petition with <strong>Change of Status (COS)</strong>, departure from the US <strong>immediately and permanently abandons</strong> the COS. You would need to get an H-1B visa stamp at a US consulate abroad and re-enter.
          </p>
          <ul className="mt-2 text-xs text-amber-700 space-y-1">
            <li>• Ask your employer&apos;s immigration attorney if a COS is included in your H-1B petition</li>
            <li>• If COS is pending: no international travel under any circumstances before approval</li>
            <li>• Consular processing alternative: get H-1B visa stamp at a US embassy abroad</li>
          </ul>
          <p className="text-xs text-amber-600 mt-2 font-mono">Per USCIS: departure = abandonment of pending Change of Status petition</p>
        </div>
      )}

      {/* Results */}
      {generated && checklist && overall && (
        <>
          {/* Overall verdict */}
          <div className={`p-5 rounded-xl border ${OVERALL_CONFIG[overall].bg} ${OVERALL_CONFIG[overall].border}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{OVERALL_CONFIG[overall].icon}</span>
              <div>
                <p className={`text-lg font-bold ${OVERALL_CONFIG[overall].color}`}>{OVERALL_CONFIG[overall].label}</p>
                <p className="text-sm text-gray-500">
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
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                        {item.cfr && (
                          <span className="text-xs text-gray-400 font-mono">{item.cfr}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{item.detail}</p>
                      {item.action && (
                        <div className="mt-2 flex items-start gap-2">
                          <span className="text-indigo-600 text-xs">→</span>
                          <p className="text-sm text-indigo-700 font-medium">{item.action}</p>
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
              <p className="text-sm text-gray-500 mb-3">Bring originals + photocopies of these when traveling internationally:</p>
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
                  <div key={doc} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-indigo-600 flex-shrink-0">◆</span>
                    {doc}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link href="/dashboard/dso-email" className="text-sm text-indigo-600 hover:underline">
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
