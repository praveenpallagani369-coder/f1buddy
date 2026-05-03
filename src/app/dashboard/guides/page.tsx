"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeftRight, CalendarDays, Newspaper, ShieldAlert } from "lucide-react";

const TOOLS = [
  { href: "/dashboard/currency", icon: <ArrowLeftRight className="w-5 h-5" />, label: "Currency Converter", desc: "Live exchange rates", color: "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400" },
  { href: "/dashboard/holidays", icon: <CalendarDays className="w-5 h-5" />, label: "US Holidays", desc: "Bank & federal closures", color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400" },
  { href: "/dashboard/news", icon: <Newspaper className="w-5 h-5" />, label: "Immigration News", desc: "Rule changes & alerts", color: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400" },
  { href: "/dashboard/emergency", icon: <ShieldAlert className="w-5 h-5" />, label: "Emergency & Rights", desc: "Contacts & know your rights", color: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" },
];

type GuideId = "ssn" | "bank" | "phone" | "housing" | "health" | "driving" | "credit";

interface Guide {
  id: GuideId;
  icon: string;
  title: string;
  subtitle: string;
  steps: { title: string; detail: string }[];
  tips: string[];
}

const GUIDES: Guide[] = [
  {
    id: "ssn",
    icon: "🆔",
    title: "Getting a Social Security Number",
    subtitle: "Required for on-campus employment, OPT, and tax filing",
    steps: [
      { title: "Wait 10 days after arrival", detail: "SSA needs your SEVIS record to be active. Apply too early and you'll be denied." },
      { title: "Get a letter from your DSO", detail: "Ask your international student office for an SSN support letter confirming your enrollment and employment eligibility." },
      { title: "Gather documents", detail: "You need: passport, I-94, I-20, DSO letter, and job offer letter (for on-campus job) or EAD card (for OPT)." },
      { title: "Visit your local SSA office", detail: "Find offices at ssa.gov/locator. Go early — wait times can be 1-3 hours. Walk-ins only (no appointments)." },
      { title: "Fill out Form SS-5", detail: "Available at the office or download from ssa.gov. Mark 'Legal alien allowed to work' under citizenship status." },
      { title: "Receive your card", detail: "Takes 2-4 weeks by mail. Your SSN is assigned immediately — you can ask for a receipt letter for urgent needs." },
    ],
    tips: [
      "You do NOT need an SSN to open a bank account — use your passport and I-20",
      "Never share your SSN over email or text. Memorize it.",
      "If you don't have a job, you can still get an ITIN for tax filing (Form W-7)",
      "Your SSN card does NOT expire — it's valid for life in the US",
      "If your card says 'VALID FOR WORK ONLY WITH DHS AUTHORIZATION', that's normal for F-1 students",
    ],
  },
  {
    id: "bank",
    icon: "🏦",
    title: "Opening a US Bank Account",
    subtitle: "Essential for rent, tuition, and daily expenses",
    steps: [
      { title: "Choose a bank", detail: "Major banks: Chase, Bank of America, Wells Fargo, Citi. Credit unions often have lower fees. Many have student accounts with no monthly fees." },
      { title: "Gather documents", detail: "Passport, I-20, I-94, university ID, proof of address (dorm assignment letter works). SSN is NOT required." },
      { title: "Visit a branch", detail: "Some banks allow online applications, but in-person is easier for international students. Bring all documents." },
      { title: "Open checking + savings", detail: "Checking for daily use (debit card), savings for emergency fund. Ask about student account perks." },
      { title: "Set up online banking", detail: "Download the mobile app, set up direct deposit if you have a job, and enable alerts for transactions." },
    ],
    tips: [
      "Avoid banks with monthly fees — most have free student accounts",
      "Get a debit card immediately — you'll need it for daily purchases",
      "Zelle (built into most bank apps) is how Americans send money to each other",
      "Set up Venmo or Zelle for splitting bills with roommates",
      "Keep $500-$1000 as an emergency buffer — unexpected costs come up often",
      "Discover and Capital One cards have no foreign transaction fees — great for international students",
    ],
  },
  {
    id: "phone",
    icon: "📱",
    title: "Getting a US Phone Number",
    subtitle: "Needed for 2FA, banking, and daily life",
    steps: [
      { title: "Choose a plan type", detail: "Prepaid (no credit check, pay monthly) or postpaid (requires SSN/credit check). Start with prepaid." },
      { title: "Popular options for students", detail: "Mint Mobile ($15/mo, uses T-Mobile), Visible ($25/mo, uses Verizon), T-Mobile prepaid ($25/mo), Google Fi ($20/mo)." },
      { title: "Buy a SIM or eSIM", detail: "You can buy at the carrier store, Walmart/Target, or activate online. eSIM works if your phone supports it." },
      { title: "Activate and port", detail: "If you have a US number already, you can port it. Otherwise, you'll get a new number." },
    ],
    tips: [
      "Mint Mobile and Visible are the best value for students — both work well in most cities",
      "Your US number is critical for 2FA on bank accounts — don't lose it",
      "Consider Google Voice as a free backup number",
      "WiFi calling works great in dorms — you don't need the strongest signal",
      "Family plans (4+ lines on T-Mobile/Verizon) are cheapest per line if you split with friends",
    ],
  },
  {
    id: "housing",
    icon: "🏠",
    title: "Finding Housing",
    subtitle: "On-campus dorms vs off-campus apartments",
    steps: [
      { title: "Decide: on-campus vs off-campus", detail: "First year: dorms are easiest (furnished, no lease hassle). After that: off-campus is usually cheaper." },
      { title: "Start early", detail: "For fall semester, start looking in March-April. Popular areas near campus fill up fast." },
      { title: "Understand lease terms", detail: "Most leases are 12 months. Read EVERYTHING before signing. Never pay before seeing the apartment in person or via video." },
      { title: "Budget for move-in costs", detail: "First month + last month + security deposit = usually 3x monthly rent upfront. Budget accordingly." },
      { title: "Set up utilities", detail: "Some apartments include utilities. If not, you'll need to set up electricity, internet, and sometimes water/gas separately." },
    ],
    tips: [
      "Use your university's housing portal — many list verified landlords",
      "Facebook groups for '[YourSchool] housing' are very active",
      "Never wire money to someone you haven't met — housing scams are common",
      "Subletting for summer is common and often cheaper than a 12-month lease",
      "Renter's insurance is usually $10-15/month and covers theft/fire — worth it",
      "Report your address change to your DSO within 10 days (SEVIS requirement)",
    ],
  },
  {
    id: "health",
    icon: "🏥",
    title: "Health Insurance & Healthcare",
    subtitle: "Most universities require health insurance",
    steps: [
      { title: "Check school requirements", detail: "Most universities require health insurance and auto-enroll you in the school plan. You can waive it if you have equivalent coverage." },
      { title: "Understand your plan", detail: "Know your: deductible (what you pay before insurance kicks in), copay (per-visit fee), and network (which doctors/hospitals are covered)." },
      { title: "Find in-network doctors", detail: "Your insurance company's website has a provider directory. Going out-of-network is much more expensive." },
      { title: "Use campus health center", detail: "Usually free or very low cost with your student fees. Good for routine visits, flu shots, and prescriptions." },
      { title: "Get your flu shot", detail: "Free at most pharmacies (CVS, Walgreens) with insurance. Recommended every fall." },
    ],
    tips: [
      "Urgent Care ($50-150 copay) is much cheaper than the Emergency Room ($500+) for non-life-threatening issues",
      "GoodRx app gives pharmacy coupons that can save 50-80% on prescriptions",
      "Dental and vision are usually separate from health insurance — check if your school plan includes them",
      "If you need to see a specialist, you usually need a referral from your primary care doctor",
      "Keep your insurance card in your wallet at all times",
      "Mental health services are usually included in campus health — use them if needed",
    ],
  },
  {
    id: "driving",
    icon: "🚗",
    title: "Getting a Driver's License",
    subtitle: "Rules vary by state — check your state's DMV",
    steps: [
      { title: "Check your state's rules", detail: "Some states accept your foreign license, others require a US license after 30-90 days. Check your state's DMV website." },
      { title: "Gather documents", detail: "Typically: passport, I-94, I-20, proof of address (bank statement/utility bill), SSN (or SSN denial letter)." },
      { title: "Study for written test", detail: "Your state's driver handbook is free online. Focus on traffic signs, right-of-way rules, and speed limits." },
      { title: "Pass written test", detail: "Multiple choice, usually 20-40 questions. Must get ~80% correct. Some states offer it in your native language." },
      { title: "Practice driving (if needed)", detail: "If you don't have experience, take driving lessons ($40-60/hour). Practice in parking lots first." },
      { title: "Pass road test", detail: "Schedule early — wait times can be weeks. You'll need to bring a car with valid registration and insurance." },
    ],
    tips: [
      "In most states, F-1 students get a license valid until the I-20 end date, not the standard 5-10 years",
      "You MUST have car insurance to drive legally — liability at minimum ($50-100/month for students)",
      "An International Driving Permit (IDP) is useful but not a replacement for a US license",
      "Uber/Lyft and campus shuttles are alternatives if you don't need a car",
      "Never drive without a license, insurance, and registration — penalties are severe and can affect your visa status",
    ],
  },
  {
    id: "credit",
    icon: "💳",
    title: "Building US Credit History",
    subtitle: "Important for renting apartments, buying a car, and future loans",
    steps: [
      { title: "Understand credit scores", detail: "US uses credit scores (300-850). No credit history = no score. You need to build it from scratch." },
      { title: "Get a secured credit card", detail: "Discover It Secured or Capital One Secured require a $200 deposit. This builds your credit when you use and pay it off monthly." },
      { title: "Use it for small purchases", detail: "Buy groceries or gas on the credit card. Pay the FULL balance every month — never carry a balance." },
      { title: "Get added as authorized user", detail: "If you have a friend or partner with good credit, being added to their card can boost your score." },
      { title: "Monitor your credit", detail: "Free at Credit Karma or annualcreditreport.com. Check monthly to ensure no errors or fraud." },
    ],
    tips: [
      "After 6-12 months of on-time payments, you'll qualify for regular (unsecured) credit cards",
      "NEVER miss a payment — even one missed payment drops your score significantly",
      "Keep credit utilization below 30% (if your limit is $1000, don't carry more than $300)",
      "Discover It gives cash back and has no annual fee — best first card for international students",
      "Your credit score follows you if you stay in the US (H-1B, green card) — start building now",
      "Student loans (if any) also build credit history",
    ],
  },
];

export default function GuidesPage() {
  const [expanded, setExpanded] = useState<GuideId | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Guides & Tools</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Resources, tools, and step-by-step guides for international students</p>
      </div>

      {/* Tools grid */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick Tools</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOOLS.map(({ href, icon, label, desc, color }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 active:scale-[0.95] transition-all">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
              <span className="text-sm text-gray-800 dark:text-gray-200 font-semibold">{label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">New Arrival Guides</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {GUIDES.map((guide) => {
          const isExpanded = expanded === guide.id;
          return (
            <Card
              key={guide.id}
              className={`transition-all cursor-pointer ${isExpanded ? "md:col-span-2 border-indigo-200" : "hover:border-slate-600"}`}
              onClick={() => setExpanded(isExpanded ? null : guide.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{guide.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{guide.title}</h3>
                      <span className="text-gray-600 dark:text-gray-400 text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{guide.subtitle}</p>

                    {isExpanded && (
                      <div className="mt-5 space-y-6" onClick={(e) => e.stopPropagation()}>
                        {/* Steps */}
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Steps</p>
                          <div className="space-y-3">
                            {guide.steps.map((step, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-700 flex items-center justify-center text-xs text-indigo-700 font-bold flex-shrink-0 mt-0.5">
                                  {i + 1}
                                </div>
                                <div>
                                  <p className="text-sm text-gray-900 font-medium">{step.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tips */}
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Tips</p>
                          <div className="space-y-2">
                            {guide.tips.map((tip) => (
                              <div key={tip} className="flex items-start gap-2">
                                <span className="text-amber-600 text-xs mt-0.5 flex-shrink-0">&#9733;</span>
                                <p className="text-xs text-gray-600 leading-relaxed">{tip}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "SSA Office Locator", url: "https://secure.ssa.gov/ICON/main.jsp" },
            { label: "USCIS Case Status", url: "https://egov.uscis.gov/casestatus/landing.do" },
            { label: "I-94 Record", url: "https://i94.cbp.dhs.gov/I94/" },
            { label: "Credit Karma", url: "https://www.creditkarma.com" },
            { label: "GoodRx", url: "https://www.goodrx.com" },
            { label: "Mint Mobile", url: "https://www.mintmobile.com" },
            { label: "Discover Student", url: "https://www.discover.com/credit-cards/student/" },
            { label: "Apartment List", url: "https://www.apartmentlist.com" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-lg bg-gray-100 border border-gray-200 hover:border-indigo-200 transition-colors text-center"
            >
              <p className="text-xs text-indigo-600 hover:underline">{link.label}</p>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
