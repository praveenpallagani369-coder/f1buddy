"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AppIcon } from "@/components/icons/AppIcon";
import {
  GraduationCap, Briefcase, FlaskConical, BookOpen, Globe, Building2,
  Upload, Loader2, CheckCircle2, AlertCircle, ScanLine,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type VisaStatus =
  | "F1_STUDENT" | "F1_CPT" | "F1_OPT" | "F1_STEM_OPT"
  | "F1_PRE_COMPLETION_OPT" | "J1" | "M1" | "OTHER";

type ScanState = "idle" | "scanning" | "done" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const VISA_OPTIONS: { value: VisaStatus; label: string; sublabel: string; icon: React.ElementType }[] = [
  { value: "F1_STUDENT",            label: "F-1 Student",              sublabel: "Currently enrolled, studying on campus",         icon: GraduationCap },
  { value: "F1_CPT",                label: "F-1 CPT",                  sublabel: "Curricular Practical Training during program",    icon: BookOpen },
  { value: "F1_PRE_COMPLETION_OPT", label: "F-1 Pre-Completion OPT",   sublabel: "Working part-time before graduation",            icon: Briefcase },
  { value: "F1_OPT",                label: "F-1 OPT",                  sublabel: "Post-completion OPT — working after graduation",  icon: Briefcase },
  { value: "F1_STEM_OPT",           label: "F-1 STEM OPT",             sublabel: "24-month STEM OPT extension",                   icon: FlaskConical },
  { value: "J1",                    label: "J-1 Exchange Visitor",     sublabel: "Research scholar, professor, or intern",         icon: Globe },
  { value: "M1",                    label: "M-1 Vocational",           sublabel: "Vocational or non-academic program",             icon: Building2 },
  { value: "OTHER",                 label: "Other",                    sublabel: "Different visa type or status",                  icon: Globe },
];

const OPT_STATUSES: VisaStatus[] = ["F1_OPT", "F1_STEM_OPT", "F1_PRE_COMPLETION_OPT"];

const STEPS = ["Your Status", "Your Program", "DSO Contact", "Review"];

const COUNTRIES = [
  "India","China","South Korea","Canada","Taiwan","Mexico","Vietnam","Brazil",
  "Japan","Saudi Arabia","Iran","Nigeria","Turkey","Bangladesh","Pakistan",
  "Nepal","Sri Lanka","Indonesia","Thailand","Philippines","Other",
];

const DEGREES = ["Bachelor's", "Master's", "PhD", "Certificate", "Associate's", "Non-degree"];

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/jpg,image/png,image/webp";

// ─── Document Scanner ─────────────────────────────────────────────────────────

interface ScannerProps {
  docType: "passport" | "ead";
  label: string;
  hint: string;
  onExtracted: (data: Record<string, string | null>) => void;
}

function DocumentScanner({ docType, label, hint, onExtracted }: ScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanMsg, setScanMsg] = useState("");
  const [fileName, setFileName] = useState("");

  async function handleFile(file: File) {
    if (!file) return;

    // Only images — the vision model doesn't accept PDFs
    if (!file.type.startsWith("image/")) {
      setScanState("error");
      setScanMsg("Please use a photo (JPG, PNG, WEBP). PDFs can't be scanned.");
      return;
    }
    if (file.size > 5_000_000) {
      setScanState("error");
      setScanMsg("Image is too large — please use a photo under 5 MB.");
      return;
    }

    setFileName(file.name);
    setScanState("scanning");
    setScanMsg("Scanning document with AI…");

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/ai/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type, docType }),
      });

      const data = await res.json();

      if (!data.success) {
        setScanState("error");
        setScanMsg(data.error?.message ?? "Scan failed — please enter dates manually.");
        return;
      }

      const extracted: Record<string, string | null> = data.data?.extracted ?? {};
      onExtracted(extracted);

      const filled = Object.values(extracted).filter(Boolean).length;
      setScanState("done");
      setScanMsg(filled > 0 ? `Extracted ${filled} field${filled > 1 ? "s" : ""} — review below.` : "Couldn't read fields clearly — please enter manually.");
    } catch {
      setScanState("error");
      setScanMsg("Scan failed — please enter dates manually.");
    }
  }

  return (
    <div className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
      scanState === "done"  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" :
      scanState === "error" ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20" :
      "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
    }`}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {scanState === "scanning" ? (
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-orange-500 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{scanMsg}</p>
          </div>
        </div>
      ) : scanState === "done" ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{fileName}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">{scanMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setScanState("idle"); setScanMsg(""); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline flex-shrink-0"
          >
            Re-scan
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
            {scanState === "error" ? <AlertCircle className="w-5 h-5 text-red-500" /> : <ScanLine className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {scanState === "error" ? scanMsg : hint}
            </p>
          </div>
          <Upload className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
        </button>
      )}
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, id, type = "text", placeholder, value, onChange, required, highlighted }: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; highlighted?: boolean;
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
  });

  // Track which fields were auto-filled by AI so we can highlight them
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());

  function set(field: string, value: string, fromAI = false) {
    setForm((f) => ({ ...f, [field]: value }));
    if (fromAI) setAiFilledFields((prev) => new Set(prev).add(field));
    else setAiFilledFields((prev) => { const n = new Set(prev); n.delete(field); return n; });
  }

  const isOPT = OPT_STATUSES.includes(form.visaStatus as VisaStatus);

  function getVisaType(): "F1" | "J1" | "M1" {
    if (form.visaStatus === "J1") return "J1";
    if (form.visaStatus === "M1") return "M1";
    return "F1";
  }

  function getOptType(): "pre_completion" | "post_completion" | "stem_extension" | null {
    if (form.visaStatus === "F1_PRE_COMPLETION_OPT") return "pre_completion";
    if (form.visaStatus === "F1_OPT") return "post_completion";
    if (form.visaStatus === "F1_STEM_OPT") return "stem_extension";
    return null;
  }

  function handlePassportScan(extracted: Record<string, string | null>) {
    if (extracted.expirationDate) set("passportExpiry", extracted.expirationDate, true);
    if (extracted.nationality) {
      const country = COUNTRIES.find(c => c.toLowerCase() === extracted.nationality?.toLowerCase());
      if (country) set("homeCountry", country, true);
    }
  }

  function handleEADScan(extracted: Record<string, string | null>) {
    if (extracted.expirationDate) set("eadEndDate", extracted.expirationDate, true);
    if (extracted.category) set("eadCategory", extracted.category, true);
  }

  const canContinueStep0 = form.visaStatus !== "" && form.homeCountry !== "";
  const canContinueStep1 = form.schoolName !== "" && form.programName !== "" && form.programStartDate !== "" && form.programEndDate !== "";

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
    if (optType && (form.eadStartDate || form.eadEndDate)) {
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
            <div className="space-y-5">
              {/* Visa status selector */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  What best describes your current status? <span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                  {VISA_OPTIONS.map(({ value, label, sublabel, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => set("visaStatus", value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all active:scale-[0.99] ${
                        form.visaStatus === value
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        form.visaStatus === value
                          ? "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${form.visaStatus === value ? "text-orange-700 dark:text-orange-300" : "text-gray-800 dark:text-gray-200"}`}>{label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sublabel}</p>
                      </div>
                      {form.visaStatus === value && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passport scan */}
              <div className="space-y-3">
                <DocumentScanner
                  docType="passport"
                  label="Scan passport to auto-fill expiry date"
                  hint="Take a photo of your passport data page · JPG, PNG, WEBP"
                  onExtracted={handlePassportScan}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Home Country <span className="text-red-500">*</span></label>
                    <Select value={form.homeCountry} onChange={(e) => set("homeCountry", e.target.value)}>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Select>
                    {aiFilledFields.has("homeCountry") && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Auto-filled</p>
                    )}
                  </div>
                  <Field label="Passport Expiry" id="passportExpiry" type="date"
                    value={form.passportExpiry} onChange={(v) => set("passportExpiry", v)}
                    highlighted={aiFilledFields.has("passportExpiry")} />
                </div>
              </div>

              {/* SEVIS ID */}
              <div>
                <label htmlFor="sevisId" className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                  SEVIS ID <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input id="sevisId" placeholder="N00xxxxxxxxx" value={form.sevisId} onChange={(e) => set("sevisId", e.target.value)} />
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
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
                <div className="border border-orange-200 dark:border-orange-800/50 rounded-xl p-4 bg-orange-50 dark:bg-orange-950/20 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      {form.visaStatus === "F1_STEM_OPT" ? "STEM OPT EAD Card" : "OPT EAD Card"}
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                      We&apos;ll use these dates to track your {form.visaStatus === "F1_STEM_OPT" ? "150" : "90"}-day unemployment limit.
                    </p>
                  </div>

                  {/* EAD scanner */}
                  <DocumentScanner
                    docType="ead"
                    label="Scan EAD card to auto-fill expiry date"
                    hint="Take a clear photo of the front of your EAD card · JPG, PNG, WEBP"
                    onExtracted={handleEADScan}
                  />

                  {form.eadCategory && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Card category: <strong>{form.eadCategory}</strong>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="EAD Start Date" id="eadStart" type="date" value={form.eadStartDate} onChange={(v) => set("eadStartDate", v)} />
                    <Field label="EAD End Date" id="eadEnd" type="date" value={form.eadEndDate} onChange={(v) => set("eadEndDate", v)} highlighted={aiFilledFields.has("eadEndDate")} />
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
