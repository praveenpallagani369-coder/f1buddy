"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EMERGENCY_CONTACTS = [
  { name: "Emergency (Police/Fire/Ambulance)", number: "911", note: "For life-threatening emergencies only", category: "emergency" },
  { name: "USCIS Contact Center", number: "1-800-375-5283", note: "Immigration case status, general questions. Hours: M-F 8am-8pm ET", category: "immigration" },
  { name: "SEVP Response Center", number: "1-703-603-3400", note: "SEVIS record issues, school transfers, OPT/STEM questions", category: "immigration" },
  { name: "ICE Tipline (Scam Reports)", number: "1-866-347-2423", note: "Report immigration scams, fraud, or threats", category: "immigration" },
  { name: "National Suicide Prevention", number: "988", note: "24/7 crisis support. Text or call. Available in multiple languages", category: "health" },
  { name: "Crisis Text Line", number: "Text HOME to 741741", note: "24/7 text-based crisis support", category: "health" },
  { name: "Poison Control", number: "1-800-222-1222", note: "24/7 for poison emergencies", category: "health" },
  { name: "Non-Emergency Police", number: "311", note: "Noise complaints, non-urgent reports (varies by city)", category: "general" },
  { name: "FBI Hate Crime Hotline", number: "1-800-225-5324", note: "Report hate crimes or discrimination", category: "safety" },
  { name: "National Domestic Violence", number: "1-800-799-7233", note: "24/7 confidential support. Immigration status is protected", category: "safety" },
];

const USCIS_OFFICES = [
  { name: "USCIS Case Status", url: "https://egov.uscis.gov/casestatus/landing.do", desc: "Check your case status online with receipt number" },
  { name: "USCIS Info Pass", url: "https://my.uscis.gov/en/appointment", desc: "Schedule an in-person appointment at a USCIS field office" },
  { name: "I-94 Record", url: "https://i94.cbp.dhs.gov/I94/", desc: "View and print your arrival/departure record" },
  { name: "SEVIS Portal", url: "https://studyinthestates.dhs.gov/", desc: "Official student visa portal" },
  { name: "E-Verify", url: "https://www.e-verify.gov/", desc: "Verify if your employer is E-Verify enrolled (required for STEM OPT)" },
];

const STUDENT_RIGHTS = [
  {
    title: "Know Your Rights at the Border",
    items: [
      "You have the right to speak with a lawyer before signing any documents",
      "NEVER sign Form I-407 (abandonment of LPR status) or voluntarily relinquish your visa",
      "You do NOT have to answer questions about your political beliefs or religion",
      "CBP can inspect your phone — consider backing up data before international travel",
      "If detained, ask for your DSO to be contacted immediately",
    ],
  },
  {
    title: "Know Your Rights on Campus",
    items: [
      "ICE generally cannot enter university buildings without a judicial warrant (not an administrative warrant)",
      "You do not have to answer questions from ICE agents outside of a port of entry",
      "Your university cannot share your SEVIS information without proper legal process",
      "You have the right to speak with an attorney before any interview with immigration officers",
      "Your university should have a designated immigration attorney — ask your DSO for contact info",
    ],
  },
  {
    title: "If You Receive a Notice to Appear (NTA)",
    items: [
      "Do NOT ignore it — this starts removal (deportation) proceedings",
      "Contact an immigration attorney IMMEDIATELY",
      "Contact your DSO within 24 hours",
      "You have the right to a hearing before an immigration judge",
      "You may be eligible for relief (voluntary departure, change of status, etc.)",
    ],
  },
];

export default function EmergencyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Emergency Resources</h1>
        <p className="text-slate-400 text-sm">Critical contacts, USCIS offices, and know-your-rights information</p>
      </div>

      {/* Emergency banner */}
      <div className="p-5 rounded-xl bg-red-900/20 border-2 border-red-800/50">
        <p className="text-lg font-bold text-red-300">If you are in immediate danger, call 911</p>
        <p className="text-sm text-red-400/80 mt-1">
          Emergency services in the US are free to call regardless of immigration status.
          You will NOT be asked about your visa status when calling 911.
        </p>
      </div>

      {/* Emergency contacts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Important Phone Numbers</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {EMERGENCY_CONTACTS.map((c) => (
            <div key={c.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800">
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-white font-medium">{c.name}</p>
                  <Badge
                    variant={c.category === "emergency" ? "critical" : c.category === "immigration" ? "info" : c.category === "health" ? "warning" : "success"}
                    className="text-xs"
                  >
                    {c.category}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{c.note}</p>
              </div>
              <a
                href={`tel:${c.number.replace(/[^0-9+]/g, "")}`}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-700 text-indigo-300 text-sm font-mono hover:bg-indigo-600/30 transition-colors"
              >
                {c.number}
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* USCIS & Government */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Government Portals</CardTitle>
          <p className="text-xs text-slate-500">Quick links to official government services</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {USCIS_OFFICES.map((o) => (
            <a
              key={o.name}
              href={o.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-indigo-800/50 transition-colors"
            >
              <div>
                <p className="text-sm text-white font-medium">{o.name}</p>
                <p className="text-xs text-slate-400">{o.desc}</p>
              </div>
              <span className="text-indigo-400 text-sm flex-shrink-0">&rarr;</span>
            </a>
          ))}
        </CardContent>
      </Card>

      {/* Know Your Rights */}
      {STUDENT_RIGHTS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">&#9679;</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Find your embassy */}
      <Card>
        <CardHeader><CardTitle className="text-base">Find Your Embassy / Consulate</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300 mb-3">
            Your home country&apos;s embassy or consulate can help with passport renewal, emergency travel documents, and legal assistance.
          </p>
          <a
            href="https://www.usembassy.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-700 text-indigo-300 text-sm hover:bg-indigo-600/30 transition-colors"
          >
            Find embassies on usembassy.gov &rarr;
          </a>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="text-xs text-slate-600 text-center p-4">
        This information is for general guidance only. For legal advice, consult an immigration attorney.
        Information is current as of 2024 but laws and policies may change.
      </div>
    </div>
  );
}
