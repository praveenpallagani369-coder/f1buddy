"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { differenceInCalendarDays, parseISO } from "date-fns";

interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  capital: string | null;
  currency: { code: string; name: string; symbol: string } | null;
  timezone: string | null;
  region: string | null;
}

const DOC_OPTIONS = ["Valid Passport","Valid F-1 Visa Stamp","I-20 with Travel Signature","EAD Card","I-94 Print","Proof of Enrollment","Offer Letter","Recent Pay Stubs"];

// Spec: alert at 4 months (120 days), not 5
const ALERT_THRESHOLD_DAYS = 120;
const SEVIS_LIMIT_DAYS = 150;

interface TripRecord {
  id: string;
  user_id: string;
  departure_date: string;
  return_date: string | null;
  destination_country: string;
  purpose: string;
  travel_type: string;
  days_outside: number;
  documents_carried: string[] | null;
  notes: string | null;
  created_at: string;
}

export default function TravelPage() {
  const supabase = createClient();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    departureDate: "", returnDate: "", destinationCountry: "",
    purpose: "vacation", travelType: "personal",
    documentsCarried: [] as string[], notes: ""
  });
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [countryLoading, setCountryLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const name = form.destinationCountry.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (name.length < 3) { setCountryInfo(null); return; }
    debounceRef.current = setTimeout(async () => {
      setCountryLoading(true);
      try {
        const res = await fetch(`/api/countries?name=${encodeURIComponent(name)}`);
        const json = await res.json();
        setCountryInfo(json.success ? json.data : null);
      } catch { setCountryInfo(null); }
      finally { setCountryLoading(false); }
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.destinationCountry]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("travel_records").select("*").eq("user_id", user.id).order("departure_date", { ascending: false });
    setTrips(data ?? []);
    setLoading(false);
  }

  async function saveTrip() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dep = parseISO(form.departureDate);
    const ret = form.returnDate ? parseISO(form.returnDate) : new Date();
    const days = Math.max(0, differenceInCalendarDays(ret, dep));
    await supabase.from("travel_records").insert({
      user_id: user.id,
      departure_date: form.departureDate,
      return_date: form.returnDate || null,
      destination_country: form.destinationCountry,
      purpose: form.purpose,
      travel_type: form.travelType,
      days_outside: days,
      documents_carried: form.documentsCarried,
      notes: form.notes || null
    });
    await load();
    setShowForm(false);
    setForm({ departureDate: "", returnDate: "", destinationCountry: "", purpose: "vacation", travelType: "personal", documentsCarried: [], notes: "" });
    setSaving(false);
  }

  const today = new Date();
  const thisYear = today.getFullYear();

  // Split counters: employer vs personal (spec requirement)
  const personalDays = trips.reduce((sum, t) => {
    if (t.travel_type === "employer_required") return sum;
    const dep = parseISO(t.departure_date);
    if (dep.getFullYear() !== thisYear && t.return_date && parseISO(t.return_date).getFullYear() !== thisYear) return sum;
    return sum + (t.days_outside ?? 0);
  }, 0);

  const employerDays = trips.reduce((sum, t) => {
    if (t.travel_type !== "employer_required") return sum;
    const dep = parseISO(t.departure_date);
    if (dep.getFullYear() !== thisYear && t.return_date && parseISO(t.return_date).getFullYear() !== thisYear) return sum;
    return sum + (t.days_outside ?? 0);
  }, 0);

  const totalDaysThisYear = personalDays + employerDays;
  const currentlyAbroad = trips.some(t => !t.return_date);

  // Spec: alert at 4 months (120 days), SEVIS limit is 5 months (150 days)
  const approachingLimit = totalDaysThisYear >= ALERT_THRESHOLD_DAYS;
  const atLimit = totalDaysThisYear >= SEVIS_LIMIT_DAYS;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Travel Tracker</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Stay within the 5-month limit. Traveling while unemployed still counts toward OPT unemployment days.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Log Trip</Button>
      </div>


      {/* Critical alert at 4 months (spec requirement) */}
      {atLimit && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          <p className="font-semibold mb-1">🚨 SEVIS Termination Risk — 5-Month Limit Reached</p>
          <p>You have been outside the US for {totalDaysThisYear} days this year. Being absent for 5+ consecutive months (≈150 days) may result in automatic SEVIS termination and loss of F-1 status. Contact your DSO immediately. — <span className="font-mono text-xs">8 CFR 214.2(f)(5)(iv)</span></p>
        </div>
      )}
      {approachingLimit && !atLimit && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-1">⚠️ Approaching 5-Month Limit — {totalDaysThisYear} of 150 days used</p>
          <p>You are within 30 days of the 5-month limit. Extended absence risks SEVIS termination. Consult your DSO before any additional travel. — <span className="font-mono text-xs">8 CFR 214.2(f)(5)(iv)</span></p>
        </div>
      )}

      {/* Important note about unemployment */}
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
        💡 <strong>Reminder:</strong> Days spent abroad while unemployed on OPT still count toward your 90-day (or 150-day STEM) unemployment limit. Employer-required travel is tracked separately below.
      </div>

      {/* Stats — split counters per spec */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Days Outside ({thisYear})</p>
            <p className={`text-3xl font-bold ${atLimit ? "text-red-600" : approachingLimit ? "text-amber-600" : "text-gray-900 dark:text-gray-100"}`}>
              {totalDaysThisYear}
            </p>
            <p className="text-xs text-gray-500 mt-1">of 150 max</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Personal Travel</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{personalDays}</p>
            <p className="text-xs text-gray-500 mt-1">days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Employer-Required</p>
            <p className="text-2xl font-bold text-indigo-600">{employerDays}</p>
            <p className="text-xs text-gray-500 mt-1">days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
            <p className={`text-base font-bold mt-1 ${currentlyAbroad ? "text-amber-600" : "text-emerald-600"}`}>
              {currentlyAbroad ? "Abroad ✈️" : "In US ✅"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trip Form */}
      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader><CardTitle className="text-base">Log a Trip</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Departure Date *</label>
                <Input type="date" value={form.departureDate} onChange={(e) => setForm(f => ({ ...f, departureDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Return Date (blank if still abroad)</label>
                <Input type="date" value={form.returnDate} onChange={(e) => setForm(f => ({ ...f, returnDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Destination Country *</label>
                <Input placeholder="India" value={form.destinationCountry} onChange={(e) => setForm(f => ({ ...f, destinationCountry: e.target.value }))} />
                {countryLoading && (
                  <p className="text-xs text-gray-400 mt-1.5">Looking up country...</p>
                )}
                {countryInfo && !countryLoading && (
                  <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{countryInfo.flag}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{countryInfo.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {countryInfo.capital && <>Capital: {countryInfo.capital}</>}
                        {countryInfo.currency && <> · {countryInfo.currency.symbol} {countryInfo.currency.code}</>}
                        {countryInfo.timezone && <> · {countryInfo.timezone}</>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Travel Type *</label>
                <Select value={form.travelType} onChange={(e) => setForm(f => ({ ...f, travelType: e.target.value }))}>
                  <option value="personal">Personal (vacation, family, conference)</option>
                  <option value="employer_required">Employer-Required (business travel)</option>
                </Select>
                {form.travelType === "personal" && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Personal travel while unemployed counts toward your OPT unemployment limit</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Purpose</label>
                <Select value={form.purpose} onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}>
                  <option value="vacation">Vacation</option>
                  <option value="family">Family Visit</option>
                  <option value="conference">Conference</option>
                  <option value="interview">Interview</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Documents Carried</label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_OPTIONS.map((doc) => (
                  <label key={doc} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={form.documentsCarried.includes(doc)}
                      onChange={(e) => setForm(f => ({ ...f, documentsCarried: e.target.checked ? [...f.documentsCarried, doc] : f.documentsCarried.filter(d => d !== doc) }))} />
                    {doc}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Notes (optional)</label>
              <Input placeholder="Conference name, visa used, etc." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={saveTrip} loading={saving} disabled={!form.departureDate || !form.destinationCountry}>Save Trip</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Trip History</CardTitle></CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-3">✈️</p>
              <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No trips logged yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Log each trip abroad to track your days outside the US.<br />
                The 5-month (150-day) limit applies cumulatively per year.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                + Log your first trip
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((t) => (
                <div key={t.id} className="flex items-start justify-between p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">✈️</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{t.destination_country}</p>
                      {!t.return_date && <Badge variant="warning" className="text-xs">Currently Abroad</Badge>}
                      {t.travel_type === "employer_required"
                        ? <Badge variant="info" className="text-xs">Employer-Required</Badge>
                        : <Badge variant="outline" className="text-xs">Personal</Badge>}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t.departure_date} → {t.return_date ?? "Present"}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{t.purpose} · {t.days_outside} days</p>
                  </div>
                  <Badge variant={t.days_outside >= 60 ? "warning" : "outline"}>{t.days_outside}d</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
