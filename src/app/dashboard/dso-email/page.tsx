"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Template {
  id: string;
  icon: string;
  title: string;
  description: string;
  fields: { id: string; label: string; placeholder: string; type?: string }[];
  generate: (profile: Record<string, string | boolean | null>, fields: Record<string, string>) => { subject: string; body: string };
}

const TEMPLATES: Template[] = [
  {
    id: "travel_signature",
    icon: "✈️",
    title: "Travel Signature Request",
    description: "Request DSO to sign your I-20 for international travel",
    fields: [
      { id: "departure_date", label: "Departure Date", placeholder: "June 15, 2025", type: "date" },
      { id: "return_date", label: "Return Date", placeholder: "July 10, 2025", type: "date" },
      { id: "destination", label: "Destination Country", placeholder: "India" },
      { id: "purpose", label: "Purpose of Travel", placeholder: "Family visit / conference / vacation" },
    ],
    generate: (profile, fields) => ({
      subject: `I-20 Travel Signature Request — ${profile.name ?? "Student"}`,
      body: `Dear ${profile.dso_name ? `${profile.dso_name}` : "DSO"},

I hope this message finds you well. I am writing to request a travel signature on my I-20 for an upcoming international trip.

My details:
- Name: ${profile.name ?? "[Your Full Name]"}
- SEVIS ID: ${profile.sevis_id ? profile.sevis_id : "[Your SEVIS ID]"}
- Program: ${profile.program_name ?? "[Your Program]"} (${profile.degree_level ?? "[Degree]"})
- Program End Date: ${profile.program_end_date ?? "[Program End Date]"}

Travel Details:
- Departure Date: ${fields.departure_date || "[Departure Date]"}
- Return Date: ${fields.return_date || "[Return Date]"}
- Destination: ${fields.destination || "[Country]"}
- Purpose: ${fields.purpose || "[Purpose of Travel]"}

I understand that the travel signature is valid for ${profile.has_ead ? "6 months (I am currently on OPT)" : "12 months"}. I plan to carry the following documents:
- Valid passport
- Current I-20 with travel signature
- F-1 visa stamp
${profile.has_ead ? "- EAD card\n- Employment verification letter" : ""}

Please let me know if you need any additional information. I would appreciate the updated I-20 at your earliest convenience.

Thank you for your continued support.

Best regards,
${profile.name ?? "[Your Full Name]"}
${profile.email ?? "[Your Email]"}
${profile.school_name ? `${profile.school_name}` : ""}`,
    }),
  },
  {
    id: "new_employer",
    icon: "💼",
    title: "New Employer Report",
    description: "Report a new employer to DSO within the 10-day window",
    fields: [
      { id: "employer_name", label: "Employer Name", placeholder: "Acme Corporation" },
      { id: "employer_address", label: "Employer Address", placeholder: "123 Main St, Boston, MA 02115" },
      { id: "position_title", label: "Position Title", placeholder: "Software Engineer" },
      { id: "start_date", label: "Employment Start Date", placeholder: "May 1, 2025", type: "date" },
      { id: "hours_per_week", label: "Hours Per Week", placeholder: "40" },
      { id: "is_stem", label: "Is Position STEM-Related?", placeholder: "Yes / No" },
    ],
    generate: (profile, fields) => ({
      subject: `OPT Employer Reporting — ${profile.name ?? "Student"} — ${fields.employer_name || "New Employer"}`,
      body: `Dear ${profile.dso_name ? `${profile.dso_name}` : "DSO"},

I am writing to report my new OPT employer as required under 8 CFR 214.2(f)(10)(ii)(C). I understand this must be reported within 10 days of starting employment.

My Information:
- Name: ${profile.name ?? "[Your Full Name]"}
- SEVIS ID: ${profile.sevis_id ? profile.sevis_id : "[Your SEVIS ID]"}
- Program: ${profile.program_name ?? "[Program]"}, ${profile.degree_level ?? "[Degree]"}

New Employment Details:
- Employer Name: ${fields.employer_name || "[Employer Name]"}
- Employer Address: ${fields.employer_address || "[Employer Address]"}
- Position Title: ${fields.position_title || "[Position Title]"}
- Employment Start Date: ${fields.start_date || "[Start Date]"}
- Hours Per Week: ${fields.hours_per_week || "[Hours]"}
- STEM-Related Position: ${fields.is_stem || "[Yes/No]"}

Please update my SEVIS record with this information at your earliest convenience. Let me know if you need additional documentation such as an offer letter or employment verification.

Thank you,
${profile.name ?? "[Your Full Name]"}
${profile.email ?? "[Your Email]"}`,
    }),
  },
  {
    id: "stem_recommendation",
    icon: "🔬",
    title: "STEM OPT Recommendation",
    description: "Request DSO recommendation letter for STEM OPT extension",
    fields: [
      { id: "current_employer", label: "Current Employer", placeholder: "Acme Corporation" },
      { id: "opt_end_date", label: "Current OPT End Date", placeholder: "May 15, 2025", type: "date" },
      { id: "stem_degree", label: "STEM Degree (for documentation)", placeholder: "MS Computer Science" },
      { id: "evverify_number", label: "E-Verify Company ID (if known)", placeholder: "1234567" },
    ],
    generate: (profile, fields) => ({
      subject: `STEM OPT Extension Recommendation Request — ${profile.name ?? "Student"}`,
      body: `Dear ${profile.dso_name ? `${profile.dso_name}` : "DSO"},

I am writing to request your recommendation for a STEM OPT extension. My current OPT expires on ${fields.opt_end_date || "[OPT End Date]"} and I wish to apply for a 24-month STEM extension.

My Information:
- Name: ${profile.name ?? "[Your Full Name]"}
- SEVIS ID: ${profile.sevis_id ? profile.sevis_id : "[Your SEVIS ID]"}
- Degree: ${fields.stem_degree || profile.program_name || "[STEM Degree]"}
- Current Employer: ${fields.current_employer || "[Employer]"}
- E-Verify Company ID: ${fields.evverify_number || "[E-Verify ID — confirm with HR]"}

I confirm that:
✓ My degree qualifies under the DHS STEM Designated Degree Program list
✓ My employer uses E-Verify
✓ My employer has signed Form I-983 (Training Plan for STEM OPT Students)

I have attached / am ready to provide:
- Completed Form I-983
- Copy of current EAD card
- Proof of employer's E-Verify participation

Please advise on next steps and let me know if you need any additional documentation. I understand that to receive a timely-filed automatic extension, I must submit my application at least 90 days before my OPT expires.

Thank you,
${profile.name ?? "[Your Full Name]"}
${profile.email ?? "[Your Email]"}`,
    }),
  },
  {
    id: "i20_extension",
    icon: "📋",
    title: "I-20 Program Extension",
    description: "Request an I-20 extension if you need more time to complete your degree",
    fields: [
      { id: "new_end_date", label: "Requested New End Date", placeholder: "December 15, 2025", type: "date" },
      { id: "reason", label: "Reason for Extension", placeholder: "Need one additional semester to complete thesis" },
      { id: "advisor_support", label: "Academic Advisor Supporting? (Yes/No)", placeholder: "Yes" },
    ],
    generate: (profile, fields) => ({
      subject: `I-20 Program Extension Request — ${profile.name ?? "Student"}`,
      body: `Dear ${profile.dso_name ? `${profile.dso_name}` : "DSO"},

I am writing to request an extension of my I-20 program end date. My current program end date is ${profile.program_end_date ?? "[Current End Date]"} and I require additional time to complete my degree requirements.

My Information:
- Name: ${profile.name ?? "[Your Full Name]"}
- SEVIS ID: ${profile.sevis_id ? profile.sevis_id : "[Your SEVIS ID]"}
- Program: ${profile.program_name ?? "[Program]"}, ${profile.degree_level ?? "[Degree]"}
- Current Program End Date: ${profile.program_end_date ?? "[Current End Date]"}

Extension Request:
- Requested New End Date: ${fields.new_end_date || "[New End Date]"}
- Reason for Extension: ${fields.reason || "[Explanation]"}
- Academic Advisor Supporting: ${fields.advisor_support || "[Yes/No]"}

I understand that an I-20 extension must be requested before the current program end date. I am maintaining full-time enrollment and continue to make normal progress toward my degree.

I will provide any supporting documentation required (academic plan, advisor letter, transcript) upon your request.

Thank you for your assistance.

Best regards,
${profile.name ?? "[Your Full Name]"}
${profile.email ?? "[Your Email]"}`,
    }),
  },
  {
    id: "address_update",
    icon: "🏠",
    title: "Address Update Notification",
    description: "Notify DSO of address change to update SEVIS (required within 10 days)",
    fields: [
      { id: "new_address", label: "New Address (full)", placeholder: "123 Main St, Apt 4B, Boston, MA 02115" },
      { id: "move_date", label: "Move Date", placeholder: "April 1, 2025", type: "date" },
    ],
    generate: (profile, fields) => ({
      subject: `SEVIS Address Update — ${profile.name ?? "Student"}`,
      body: `Dear ${profile.dso_name ? `${profile.dso_name}` : "DSO"},

I am writing to notify you of my change of address as required under 8 CFR 214.2(f)(18). F-1 students must report address changes within 10 days.

My Information:
- Name: ${profile.name ?? "[Your Full Name]"}
- SEVIS ID: ${profile.sevis_id ? profile.sevis_id : "[Your SEVIS ID]"}
- Program: ${profile.program_name ?? "[Program]"}

Address Change Details:
- New Address: ${fields.new_address || "[New Full Address]"}
- Effective Date: ${fields.move_date || "[Move Date]"}

Please update my SEVIS record with the new address at your earliest convenience. Let me know if any additional information is required.

Thank you,
${profile.name ?? "[Your Full Name]"}
${profile.email ?? "[Your Email]"}`,
    }),
  },
];

function DSOEmailContent() {
  const searchParams = useSearchParams();
  const defaultTemplate = searchParams.get("template") ?? "";
  const supabase = createClient();
  const [profile, setProfile] = useState<Record<string, string | boolean | null>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<string>(defaultTemplate || "travel_signature");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch user via API so SEVIS ID is decrypted server-side
      const [apiRes, optRes] = await Promise.all([
        fetch("/api/user"),
        supabase.from("opt_status").select("ead_end_date").eq("user_id", user.id).single(),
      ]);
      const apiJson = await apiRes.json();
      if (apiJson.success) {
        setProfile({
          ...apiJson.data,
          sevis_id: apiJson.data.sevisId ?? null,
          has_ead: !!optRes.data?.ead_end_date,
        });
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const template = TEMPLATES.find(t => t.id === selectedTemplate)!;
  const email = template.generate(profile, fields);

  function setField(id: string, value: string) {
    setFields(f => ({ ...f, [id]: value }));
  }

  async function copy(type: "subject" | "body") {
    await navigator.clipboard.writeText(type === "subject" ? email.subject : email.body);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  function openMailto() {
    const mailto = `mailto:${profile.dso_email ?? ""}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
    window.open(mailto, "_blank");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DSO Email Generator</h1>
        <p className="text-gray-600 text-sm mt-0.5">Professional, pre-written emails for common DSO requests — fill in a few fields, copy, and send.</p>
      </div>

      {/* Template selector */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => { setSelectedTemplate(t.id); setFields({}); }}
            className={`p-4 rounded-xl border text-left transition-colors ${selectedTemplate === t.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-200 dark:border-gray-700"}`}>
            <span className="text-xl mb-2 block">{t.icon}</span>
            <p className="text-sm font-medium text-gray-900">{t.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{template.icon} {template.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto-filled profile notice */}
            <div className="p-3 rounded-lg bg-gray-100 border border-gray-200 text-xs text-gray-500">
              ✨ Your name, SEVIS ID, program, and DSO info are automatically filled from your profile.
            </div>
            {template.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm text-gray-600 mb-1.5">{field.label}</label>
                <Input
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={fields[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-3">
          {/* Subject */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Subject Line</p>
                <button onClick={() => copy("subject")}
                  className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
                  {copied === "subject" ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-gray-900 font-medium">{email.subject}</p>
            </CardContent>
          </Card>

          {/* Body */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email Body</p>
                <button onClick={() => copy("body")}
                  className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
                  {copied === "body" ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto font-sans">
                {email.body}
              </pre>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => copy("body")} variant="outline" className="flex-1">
              {copied === "body" ? "✓ Copied!" : "📋 Copy Email"}
            </Button>
            {profile.dso_email && (
              <Button onClick={openMailto} className="flex-1">
                ✉️ Open in Mail App
              </Button>
            )}
          </div>
          {!profile.dso_email && (
            <p className="text-xs text-gray-500 text-center">
              Add your DSO email in <a href="/dashboard/profile" className="text-indigo-600 hover:underline">Profile</a> to enable one-click mail
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DSOEmailPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 dark:text-gray-400 text-center py-20">Loading...</div>}>
      <DSOEmailContent />
    </Suspense>
  );
}
