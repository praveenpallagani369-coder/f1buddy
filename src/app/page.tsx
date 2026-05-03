import Link from "next/link";
import {
  CalendarClock,
  Briefcase,
  Plane,
  FolderOpen,
  Receipt,
  Sparkles,
} from "lucide-react";
import { AppIcon } from "@/components/icons/AppIcon";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VisaBuddy — International Student Life Manager",
  description: "Never miss an immigration deadline again. Track OPT unemployment, SEVIS status, and travel limits automatically.",
  keywords: ["F-1 visa", "OPT tracker", "STEM OPT", "international student", "USCIS deadlines"],
};

const features = [
  {
    icon: CalendarClock,
    title: "Deadline Tracker",
    desc: "Never miss OPT, SEVIS, or tax deadlines. Smart alerts at 30, 14, 7, and 1 day.",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
  },
  {
    icon: Briefcase,
    title: "OPT Employment",
    desc: "Track unemployment days in real-time. Get alerted before you hit the 90-day limit.",
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  {
    icon: Plane,
    title: "Travel Tracker",
    desc: "Log trips, track days outside the US, and get warned before the 5-month limit.",
    color: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300",
  },
  {
    icon: FolderOpen,
    title: "Document Vault",
    desc: "Store I-20, EAD, passport scans with expiration tracking and alerts.",
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300",
  },
  {
    icon: Receipt,
    title: "Tax Guide",
    desc: "1040-NR vs 1040, Form 8843 reminders, and treaty benefit lookup.",
    color: "bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Ask any immigration question. Powered by Groq + Llama 3.3 with CFR citations.",
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
];

const stats = [
  { value: "1.1M", label: "F-1 students in the US" },
  { value: "90", label: "days before OPT limit hits" },
  { value: "6", label: "compliance areas tracked" },
];

const steps = [
  {
    step: "1",
    title: "Scan your documents",
    desc: "Upload your I-20 and EAD card. AI auto-fills your dates in seconds.",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300",
  },
  {
    step: "2",
    title: "Get your compliance score",
    desc: "See your phase, OPT unemployment days, travel limits, and upcoming deadlines — all in one dashboard.",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  },
  {
    step: "3",
    title: "Never miss a deadline",
    desc: "Smart alerts at 30, 14, 7, and 1 day before anything important. Ask the AI assistant anything about F-1 rules.",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
];

const testimonials = [
  {
    quote: "I was tracking OPT unemployment days in a spreadsheet and nearly missed the 90-day limit. VisaBuddy now shows me exactly where I am in real-time.",
    name: "Krupakar P.",
    school: "MS Computer Science, University of Illinois",
  },
  {
    quote: "The AI assistant answered my STEM OPT question at midnight with CFR citations. My DSO didn't even know that specific rule off the top of their head.",
    name: "Shiva S.",
    school: "MBA, University of Texas at Austin",
  },
  {
    quote: "Uploading my EAD and having the expiry date auto-detected and added to my deadline tracker took 30 seconds. This app is exactly what we needed.",
    name: "Jagan P.",
    school: "PhD Electrical Engineering, Georgia Tech",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
      <nav className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <AppIcon size={32} />
            <span className="font-bold text-gray-900 dark:text-gray-100">VisaBuddy</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors hidden sm:block">
              Pricing
            </Link>
            <Link id="nav-login" href="/auth/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Sign in
            </Link>
            <Link
              id="nav-register"
              href="/auth/register"
              className="text-sm px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Subtle radial gradient mesh — purely decorative */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-orange-500/[0.07] blur-3xl" />
          <div className="absolute top-10 right-0 w-[400px] h-[400px] rounded-full bg-amber-400/[0.05] blur-2xl" />
          <div className="absolute top-20 left-0 w-[300px] h-[300px] rounded-full bg-orange-300/[0.06] blur-2xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 dark:bg-orange-950/60 dark:border-orange-800 dark:text-orange-300 text-xs font-medium mb-6">
            <span>🛂</span>
            Built for F-1 students, H-1B workers & NRIs
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-6 text-balance">
            Never miss an{" "}
            <span className="text-orange-600 dark:text-orange-400">immigration</span>{" "}
            deadline again
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            VisaBuddy tracks your OPT unemployment days, visa deadlines, travel limits, and tax obligations so you can focus on studying — not spreadsheets.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              id="hero-register"
              href="/auth/register"
              className="px-8 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors text-lg shadow-lg shadow-orange-200/60 dark:shadow-orange-900/40"
            >
              Start Free — No Credit Card
            </Link>
            <Link
              id="hero-login"
              href="/auth/login"
              className="px-8 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-lg"
            >
              Sign In
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">Free forever · No credit card needed</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-3 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 [font-variant-numeric:tabular-nums]">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Product screenshot mockup */}
      <div className="max-w-5xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          See your compliance at a glance
        </h2>
        <p className="text-gray-500 text-center mb-10">One dashboard replaces 5 spreadsheets and constant DSO emails</p>

        {/* Dashboard mockup */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/60 dark:shadow-black/40 overflow-hidden">
          {/* Mock browser bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <div className="flex-1 mx-4 h-6 bg-gray-200 dark:bg-gray-700 rounded-md" />
          </div>

          <div className="p-6 space-y-5">
            {/* Mock header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">Good morning, Rajan 👋</p>
                <p className="text-gray-500 text-sm">Here&apos;s your compliance overview for today</p>
              </div>
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All Clear
              </span>
            </div>

            {/* Mock phase banner */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 dark:from-emerald-950/50 dark:to-teal-950/50 dark:border-emerald-800 p-4">
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Current Phase: OPT Active</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">Work must be directly related to your degree. Track unemployment days carefully.</p>
            </div>

            {/* Mock stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "OPT UNEMPLOYMENT", value: "12", sub: "78 of 90 days remaining", bar: 13, barColor: "bg-emerald-500", accent: "bg-emerald-400" },
                { label: "DAYS OUTSIDE US", value: "18", sub: "Within safe limit", bar: null, barColor: "", accent: "bg-sky-400" },
                { label: "EAD EXPIRY", value: "187d", sub: "2026-11-05", bar: null, barColor: "", accent: "bg-violet-400" },
                { label: "EXPIRING DOCUMENTS", value: "1", sub: "Expiring within 90 days", bar: null, barColor: "", accent: "bg-amber-400" },
              ].map((card) => (
                <div key={card.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 relative overflow-hidden">
                  <div className={`absolute inset-x-0 top-0 h-0.5 ${card.accent} rounded-t-xl`} />
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-1">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{card.sub}</p>
                  {card.bar !== null && (
                    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${card.barColor} rounded-full`} style={{ width: `${card.bar}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mock upcoming deadlines */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming Deadlines</p>
              {[
                { title: "File 2025 Tax Return (Form 1040-NR)", date: "2026-06-15", days: "43d", severity: "bg-blue-400" },
                { title: "Passport Expiring — Renew Before Travel", date: "2026-07-22", days: "80d", severity: "bg-amber-400" },
              ].map((d) => (
                <div key={d.title} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.severity}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{d.title}</p>
                    <p className="text-xs text-gray-400">{d.date}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-medium flex-shrink-0">{d.days}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          Up and running in 3 minutes
        </h2>
        <p className="text-gray-500 text-center mb-10">No manual data entry — AI reads your documents</p>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map(({ step, title, desc, color }) => (
            <div key={step} className="text-center">
              <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-xl font-bold mx-auto mb-4`}>
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          Everything to stay in immigration compliance
        </h2>
        <p className="text-gray-500 text-center mb-10">All your compliance tools in one dashboard</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-1">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="max-w-5xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          Students trust VisaBuddy with their status
        </h2>
        <p className="text-gray-500 text-center mb-10">Real quotes from international students</p>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map(({ quote, name, school }) => (
            <div key={name} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed flex-1">&ldquo;{quote}&rdquo;</p>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{school}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl p-10 shadow-xl shadow-orange-200/50 dark:shadow-orange-900/30">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to stop worrying about deadlines?
          </h2>
          <p className="text-orange-100 mb-6">
            Free forever. No credit card. Takes 3 minutes to set up.
          </p>
          <Link
            id="cta-register"
            href="/auth/register"
            className="inline-block px-8 py-3 rounded-xl bg-white text-orange-600 font-semibold hover:bg-orange-50 transition-colors"
          >
            Create Free Account →
          </Link>
          <p className="text-orange-200 text-xs mt-4">Free plan · Premium $6.99/mo · University licenses available</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 px-6 py-8 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <AppIcon size={24} />
            <span className="text-gray-600 font-medium">VisaBuddy</span>
          </div>
          <p className="text-center">Not affiliated with USCIS or DHS · Always consult your DSO</p>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-gray-600 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
