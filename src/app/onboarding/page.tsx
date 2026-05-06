"use client";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markOptApplicationStepsCompletedForStemUser } from "@/lib/opt/opt-application-timeline";
import { upsertStemValidationDeadlines } from "@/lib/opt/stem-validation-deadlines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AppIcon } from "@/components/icons/AppIcon";
import {
  GraduationCap, Briefcase, FlaskConical, BookOpen, Globe,
  Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type VisaStatus =
  | "F1_STUDENT" | "F1_CPT" | "F1_OPT" | "F1_STEM_OPT" | "OTHER";

type ScanState = "idle" | "scanning" | "done" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const VISA_OPTIONS: { value: VisaStatus; label: string; sublabel: string; icon: React.ElementType }[] = [
  { value: "F1_STUDENT",  label: "F-1 Student",          sublabel: "Currently enrolled", icon: GraduationCap },
  { value: "F1_CPT",      label: "F-1 CPT",              sublabel: "Training during program", icon: BookOpen },
  { value: "F1_OPT",      label: "F-1 OPT",              sublabel: "Post-completion OPT", icon: Briefcase },
  { value: "F1_STEM_OPT", label: "F-1 STEM OPT",         sublabel: "STEM extension", icon: FlaskConical },
  { value: "OTHER",       label: "Other",                sublabel: "Different visa type", icon: Globe },
];

const OPT_STATUSES: VisaStatus[] = ["F1_OPT", "F1_STEM_OPT"];

const STEPS = ["Your Status", "Your Program", "DSO Contact", "Review"];

const COUNTRIES = [
  "India","China","South Korea","Canada","Taiwan","Mexico","Vietnam","Brazil",
  "Japan","Saudi Arabia","Iran","Nigeria","Turkey","Bangladesh","Pakistan",
  "Nepal","Sri Lanka","Indonesia","Thailand","Philippines","Other",
];

const DEGREES = ["Bachelor's", "Master's", "PhD", "Certificate", "Associate's", "Non-degree"];

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/jpg,image/png,image/webp";



// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, id, type = "text", placeholder, value, onChange, required, highlighted, max }: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; highlighted?: boolean; max?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <Input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className={highlighted ? "ring-2 ring-emerald-400 dark:ring-emerald-600" : ""}
        max={max}
      />
      {highlighted && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Auto-filled by AI — verify and edit if needed</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    visaStatus: "" as VisaStatus | "",
    sevisId: "",
    homeCountry: "India",
    passportExpiry: "",
    eadStartDate: "",
    eadEndDate: "",
    eadCategory: "",
    schoolName: "",
    programName: "",
    degreeLevel: "Master's",
    programStartDate: "",
    programEndDate: "",
    dsoName: "",
    dsoEmail: "",
    dsoPhone: "",
    employerName: "",
    employmentStartDate: "",
    employmentEndDate: "",
    isStemRelated: true,
    eVerifyEmployer: false,
    reportedToSchool: false,
  });

  // Track which fields were auto-filled by AI so we can highlight them
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  function set(field: string, value: string | boolean, fromAI = false) {
    setForm((f) => ({ ...f, [field]: value }));
    if (fromAI && typeof value === "string") setAiFilledFields((prev) => new Set(prev).add(field));
    else setAiFilledFields((prev) => { const n = new Set(prev); n.delete(field); return n; });
  }

  const isOPT = OPT_STATUSES.includes(form.visaStatus as VisaStatus);
  const today = new Date().toISOString().split("T")[0];
  const eadStartInFuture = isOPT && !!form.eadStartDate && form.eadStartDate > today;

  function getVisaType(): "F1" | "OTHER" {
    return form.visaStatus === "OTHER" ? "OTHER" : "F1";
  }

  function getOptType(): "post_completion" | "stem_extension" | null {
    if (form.visaStatus === "F1_OPT") return "post_completion";
    if (form.visaStatus === "F1_STEM_OPT") return "stem_extension";
    return null;
  }

  // ISO 3166-1 alpha-3 codes → display name mapping for common student countries
  const COUNTRY_CODES: Record<string, string> = {
    ind:"India", chn:"China", kor:"South Korea", can:"Canada", twn:"Taiwan",
    mex:"Mexico", vnm:"Vietnam", bra:"Brazil", jpn:"Japan", sau:"Saudi Arabia",
    irn:"Iran", nga:"Nigeria", tur:"Turkey", bgd:"Bangladesh", pak:"Pakistan",
    npl:"Nepal", lka:"Sri Lanka", idn:"Indonesia", tha:"Thailand", phl:"Philippines",
  };

  const handlePassportScan = useCallback((extracted: Record<string, string | null>) => {
    if (extracted.expirationDate) set("passportExpiry", extracted.expirationDate, true);
    if (extracted.nationality) {
      const raw = extracted.nationality.toLowerCase().trim();
      // Try 3-letter ISO code first
      const byCode = COUNTRY_CODES[raw];
      if (byCode) { set("homeCountry", byCode, true); return; }
      // Try exact match (case-insensitive)
      const exact = COUNTRIES.find(c => c.toLowerCase() === raw);
      if (exact) { set("homeCountry", exact, true); return; }
      // Try "Indian" → "India" by stripping common nationality suffixes
      const stripped = raw.replace(/(ian|ese|ish|an|i)$/, "");
      const fuzzy = COUNTRIES.find(c => c.toLowerCase().startsWith(stripped));
      if (fuzzy) set("homeCountry", fuzzy, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEADScan = useCallback((extracted: Record<string, string | null>) => {
    if (extracted.startDate) set("eadStartDate", extracted.startDate, true);
    if (extracted.expirationDate) set("eadEndDate", extracted.expirationDate, true);
    if (extracted.category) set("eadCategory", extracted.category, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinueStep0 = form.visaStatus !== "" && form.homeCountry !== "";
  const canContinueStep1 = form.schoolName !== "" && form.programName !== "" && form.programStartDate !== "" && form.programEndDate !== "" && !eadStartInFuture;

  async function handleFinish() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    await supabase.from("users").update({
      visa_type: getVisaType(),
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

    const optType = getOptType();
    if (optType) {
      await supabase.from("opt_status").upsert({
        user_id: user.id,
        opt_type: optType,
        ead_category: form.eadCategory || (optType === "stem_extension" ? "C3C" : "C3B"),
        ead_start_date: form.eadStartDate || null,
        ead_end_date: form.eadEndDate || null,
        unemployment_days_used: 0,
        unemployment_limit: optType === "stem_extension" ? 150 : 90,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      let finalEmployerName = form.employerName.trim();
      if (!finalEmployerName && form.employmentStartDate) {
        finalEmployerName = "Untitled Employer";
      }

      if (finalEmployerName && form.employmentStartDate) {
        await supabase.from("opt_employment").insert({
          user_id: user.id,
          employer_name: finalEmployerName,
          start_date: form.employmentStartDate,
          end_date: form.employmentEndDate || null,
          employment_type: "full_time",
          is_stem_related: optType === "stem_extension",
          is_current: !form.employmentEndDate || form.employmentEndDate >= today,
          e_verify_employer: form.eVerifyEmployer,
          reported_to_school: form.reportedToSchool,
        });
      }

      if (optType === "stem_extension") {
        await markOptApplicationStepsCompletedForStemUser(
          supabase,
          user.id,
          form.programEndDate || null
        );
        if (form.eadStartDate) {
          await upsertStemValidationDeadlines(supabase, user.id, form.eadStartDate);
          
          if (form.eadStartDate <= today) {
            // mark stem opt steps as done
            const stemSteps = [
              "stem_eligibility", "stem_employer_verify", "stem_i983_draft", 
              "stem_dso_request", "stem_file_i765", "stem_receipt", "stem_ead_received"
            ];
            for (let i = 0; i < stemSteps.length; i++) {
              await supabase.from("opt_application_steps").insert({
                user_id: user.id,
                step_name: stemSteps[i],
                step_order: i + 1,
                is_completed: true,
                completed_date: null,
              }).select().maybeSingle();
            }
          }
        }
      }
    } else if (form.visaStatus === "F1_CPT") {
      let finalEmployerName = form.employerName.trim();
      if (!finalEmployerName && form.employmentStartDate) {
        finalEmployerName = "Untitled Employer";
      }

      if (finalEmployerName && form.employmentStartDate) {
        await supabase.from("cpt_records").insert({
          user_id: user.id,
          employer_name: finalEmployerName,
          start_date: form.employmentStartDate,
          end_date: form.employmentEndDate || null,
          cpt_type: "full_time",
          is_current: !form.employmentEndDate || form.employmentEndDate >= today,
        });
      }
    }

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
          <div className="flex justify-center mb-3"><AppIcon size={48} /></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to VisaBuddy!</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Let&apos;s set up your profile — takes about 2 minutes</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step   ? "bg-orange-600 text-white" :
                i === step ? "bg-orange-600 text-white ring-4 ring-orange-600/30" :
                "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 transition-colors ${i < step ? "bg-orange-600" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{STEPS[step]}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {step === 0 && "Tell us your current visa status so we track the right things for you."}
            {step === 1 && "Your school and program dates drive your compliance deadlines."}
            {step === 2 && "Save your DSO's contact for quick access — optional but helpful."}
            {step === 3 && "Everything looks good? Hit Finish to set up your dashboard."}
          </p>

          {/* ── Step 0: Visa Status ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  What is your current visa status? <span className="text-red-500">*</span>
                </label>
                <Select
                  value={form.visaStatus}
                  onChange={(e) => set("visaStatus", e.target.value)}
                  className="h-11"
                >
                  <option value="" disabled>Select status...</option>
                  {VISA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label} — {opt.sublabel}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Home Country <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.homeCountry}
                    onChange={(e) => set("homeCountry", e.target.value)}
                    className="h-11"
                  >
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Passport Expiry <span className="text-gray-400 font-normal">(for tracking)</span>
                  </label>
                  <Input
                    type="date"
                    value={form.passportExpiry}
                    onChange={(e) => set("passportExpiry", e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sevisId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  SEVIS ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input id="sevisId" placeholder="N00xxxxxxxxx" value={form.sevisId} onChange={(e) => set("sevisId", e.target.value)} />
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <span className="text-emerald-500">🔒</span>
                  Encrypted with AES-256 — never readable by VisaBuddy staff.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 1: School + Program ── */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="University / School Name" id="school" placeholder="Massachusetts Institute of Technology" value={form.schoolName} onChange={(v) => set("schoolName", v)} required />
              <Field label="Program / Major" id="program" placeholder="Computer Science" value={form.programName} onChange={(v) => set("programName", v)} required />
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Degree Level</label>
                <Select value={form.degreeLevel} onChange={(e) => set("degreeLevel", e.target.value)}>
                  {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Program Start Date" id="startDate" type="date" value={form.programStartDate} onChange={(v) => set("programStartDate", v)} required />
                <Field label="Program End Date" id="endDate" type="date" value={form.programEndDate} onChange={(v) => set("programEndDate", v)} required />
              </div>

              {/* OPT-specific: EAD scan + dates */}
              {isOPT && (
                <div className="space-y-3">
                  {/* STEM OPT: regular OPT is already done */}
                  {form.visaStatus === "F1_STEM_OPT" && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">OPT (Post-Completion) — Already complete</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">Since you&apos;re on STEM OPT extension, your regular OPT is done. Enter your STEM OPT EAD details below.</p>
                      </div>
                    </div>
                  )}

                  <div className="border border-orange-200 dark:border-orange-800/50 rounded-xl p-4 bg-orange-50 dark:bg-orange-950/20 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        {form.visaStatus === "F1_STEM_OPT" ? "STEM OPT EAD Card Details" : "OPT EAD Card Details"}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        We&apos;ll use these dates to track your {form.visaStatus === "F1_STEM_OPT" ? "150" : "90"}-day unemployment limit.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Field label="EAD Start Date" id="eadStart" type="date" value={form.eadStartDate} onChange={(v) => set("eadStartDate", v)} max={today} />
                        {eadStartInFuture && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> EAD start date can&apos;t be in the future — you&apos;re already on OPT
                          </p>
                        )}
                      </div>
                      <Field label="EAD End Date" id="eadEnd" type="date" value={form.eadEndDate} onChange={(v) => set("eadEndDate", v)} />
                    </div>
                  </div>
                </div>
              )}

              {/* CPT/OPT Employment Details */}
              {(isOPT || form.visaStatus === "F1_CPT") && (
                <div className="border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 bg-blue-50 dark:bg-blue-950/20 space-y-3 mt-4">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Current Employment Details
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      Log your employer so we can correctly track your {isOPT ? "unemployment days" : "CPT status"}.
                    </p>
                  </div>
                  <Field label="Employer Name" id="employerName" placeholder="Tech Corp Inc." value={form.employerName} onChange={(v) => set("employerName", v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Date" id="employmentStartDate" type="date" value={form.employmentStartDate} onChange={(v) => set("employmentStartDate", v)} />
                    <Field label="End Date" id="employmentEndDate" type="date" value={form.employmentEndDate} onChange={(v) => set("employmentEndDate", v)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: DSO ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
                💡 Your DSO manages your I-20 and SEVIS record. We&apos;ll show their contact on the emergency page for quick access.
              </div>
              <Field label="DSO Name" id="dsoName" placeholder="Dr. Jane Smith" value={form.dsoName} onChange={(v) => set("dsoName", v)} />
              <Field label="DSO Email" id="dsoEmail" type="email" placeholder="jsmith@university.edu" value={form.dsoEmail} onChange={(v) => set("dsoEmail", v)} />
              <Field label="DSO Phone" id="dsoPhone" placeholder="+1 (617) 555-0123" value={form.dsoPhone} onChange={(v) => set("dsoPhone", v)} />
              <p className="text-xs text-gray-400 dark:text-gray-500">All fields optional — you can add this later in Settings.</p>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300">
                <p className="font-medium mb-1">🎉 You&apos;re all set!</p>
                <p>Your dashboard will be personalised for your visa status and program dates.</p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {([
                  ["Status", VISA_OPTIONS.find(v => v.value === form.visaStatus)?.label ?? form.visaStatus],
                  ["School", form.schoolName || "—"],
                  ["Program", `${form.programName} (${form.degreeLevel})`],
                  ["Program Dates", `${form.programStartDate || "—"} → ${form.programEndDate || "—"}`],
                  ...(isOPT && form.eadEndDate ? [["EAD Expires", form.eadEndDate]] : []),
                  ["DSO", form.dsoName || "—"],
                  ["Home Country", form.homeCountry],
                  ...(form.passportExpiry ? [["Passport Expiry", form.passportExpiry]] : []),
                  ...(form.employerName ? [["Employer", form.employerName]] : []),
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5 text-sm">
                    <span className="text-gray-400 dark:text-gray-500">{k}</span>
                    <span className="text-gray-700 dark:text-gray-300 text-right max-w-[60%] truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">Back</Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                className="flex-1"
                disabled={
                  (step === 0 && !canContinueStep0) ||
                  (step === 1 && !canContinueStep1)
                }
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleFinish} loading={loading} className="flex-1">
                Finish Setup 🚀
              </Button>
            )}
          </div>

          {step === 2 && (
            <button onClick={() => setStep(3)} className="w-full mt-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-2">
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
