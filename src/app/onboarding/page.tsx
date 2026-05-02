"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AppIcon } from "@/components/icons/AppIcon";

const STEPS = ["Visa Info", "School", "DSO Contact", "Personal"];
const COUNTRIES = ["India","China","South Korea","Canada","Taiwan","Mexico","Vietnam","Brazil","Japan","Saudi Arabia","Iran","Nigeria","Turkey","Other"];
const DEGREES = ["Bachelor's", "Master's", "PhD", "Certificate", "Associate's"];

function Field({ label, id, type = "text", placeholder, value, onChange }: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
      <Input id={id} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    visaType: "F1",
    sevisId: "",
    schoolName: "",
    programName: "",
    degreeLevel: "Master's",
    programStartDate: "",
    programEndDate: "",
    dsoName: "",
    dsoEmail: "",
    dsoPhone: "",
    homeCountry: "India",
    passportExpiry: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFinish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    await supabase.from("users").update({
      visa_type: form.visaType,
      school_name: form.schoolName,
      program_name: form.programName,
      degree_level: form.degreeLevel,
      program_start_date: form.programStartDate || null,
      program_end_date: form.programEndDate || null,
      dso_name: form.dsoName || null,
      dso_email: form.dsoEmail || null,
      dso_phone: form.dsoPhone || null,
      home_country: form.homeCountry,
      passport_expiry: form.passportExpiry || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Save sensitive fields via server-side encryption + generate deadlines
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sevisId: form.sevisId || null }),
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <AppIcon size={48} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">Welcome to VisaBuddy!</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Let&apos;s set up your profile to track your compliance</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step ? "bg-orange-600 text-white" :
                i === step ? "bg-orange-600 text-white ring-4 ring-orange-600/30" :
                "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 ${i < step ? "bg-orange-600" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">{STEPS[step]}</h2>

          {/* Step 0: Visa Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Visa Type</label>
                <Select value={form.visaType} onChange={(e) => set("visaType", e.target.value)}>
                  <option value="F1">F-1 (Student)</option>
                  <option value="J1">J-1 (Exchange Visitor)</option>
                  <option value="M1">M-1 (Vocational)</option>
                </Select>
              </div>
              <div>
                <label htmlFor="sevisId" className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">SEVIS ID (optional)</label>
                <Input id="sevisId" placeholder="N00xxxxxxxxx" value={form.sevisId} onChange={(e) => set("sevisId", e.target.value)} />
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <span className="text-emerald-500">🔒</span>
                  Encrypted with AES-256 before storage. Never logged or readable by VisaBuddy staff.
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Home Country</label>
                <Select value={form.homeCountry} onChange={(e) => set("homeCountry", e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <Field label="Passport Expiry Date" id="passportExpiry" type="date" value={form.passportExpiry} onChange={(v) => set("passportExpiry", v)} />
            </div>
          )}

          {/* Step 1: School */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="University / School Name *" id="school" placeholder="Massachusetts Institute of Technology" value={form.schoolName} onChange={(v) => set("schoolName", v)} />
              <Field label="Program / Major *" id="program" placeholder="Computer Science" value={form.programName} onChange={(v) => set("programName", v)} />
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Degree Level</label>
                <Select value={form.degreeLevel} onChange={(e) => set("degreeLevel", e.target.value)}>
                  {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Program Start Date *" id="startDate" type="date" value={form.programStartDate} onChange={(v) => set("programStartDate", v)} />
                <Field label="Program End Date *" id="endDate" type="date" value={form.programEndDate} onChange={(v) => set("programEndDate", v)} />
              </div>
            </div>
          )}

          {/* Step 2: DSO */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                💡 Your DSO (Designated School Official) manages your I-20 and SEVIS record. Save their contact info for quick access.
              </div>
              <Field label="DSO Name" id="dsoName" placeholder="Dr. Jane Smith" value={form.dsoName} onChange={(v) => set("dsoName", v)} />
              <Field label="DSO Email" id="dsoEmail" type="email" placeholder="jsmith@university.edu" value={form.dsoEmail} onChange={(v) => set("dsoEmail", v)} />
              <Field label="DSO Phone" id="dsoPhone" placeholder="+1 (617) 555-0123" value={form.dsoPhone} onChange={(v) => set("dsoPhone", v)} />
            </div>
          )}

          {/* Step 3: Final */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                <p className="font-medium mb-1">🎉 You&apos;re almost done!</p>
                <p>Review your info below, then click Finish to set up your dashboard.</p>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["Visa", form.visaType],
                  ["School", form.schoolName || "—"],
                  ["Program", `${form.programName} (${form.degreeLevel})`],
                  ["Program Dates", `${form.programStartDate || "—"} → ${form.programEndDate || "—"}`],
                  ["DSO", form.dsoName || "—"],
                  ["Home Country", form.homeCountry],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-400 dark:text-gray-500">{k}</span>
                    <span className="text-gray-700 dark:text-gray-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} className="flex-1"
                disabled={
                  (step === 0 && !form.homeCountry) ||
                  (step === 1 && (!form.schoolName || !form.programName || !form.programStartDate || !form.programEndDate))
                }>
                Continue
              </Button>
            ) : (
              <Button onClick={handleFinish} loading={loading} className="flex-1">
                Finish Setup 🚀
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
