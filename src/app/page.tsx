import Link from "next/link";
import {
  GraduationCap,
  CalendarClock,
  Briefcase,
  Plane,
  FolderOpen,
  Receipt,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: CalendarClock,
    title: "Deadline Tracker",
    desc: "Never miss OPT, SEVIS, or tax deadlines. Smart alerts at 30, 14, 7, and 1 day.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Briefcase,
    title: "OPT Employment",
    desc: "Track unemployment days in real-time. Get alerted before you hit the 90-day limit.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Plane,
    title: "Travel Tracker",
    desc: "Log trips, track days outside the US, and get warned before the 5-month limit.",
    color: "bg-sky-50 text-sky-600",
  },
  {
    icon: FolderOpen,
    title: "Document Vault",
    desc: "Store I-20, EAD, passport scans with expiration tracking and alerts.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Receipt,
    title: "Tax Guide",
    desc: "1040-NR vs 1040, Form 8843 reminders, and treaty benefit lookup.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Ask any F-1 question. Powered by Groq + Llama 3.3 with CFR citations.",
    color: "bg-indigo-50 text-indigo-600",
  },
];

const stats = [
  { value: "1.1M", label: "F-1 students in the US" },
  { value: "90", label: "Day OPT unemployment limit" },
  { value: "5+", label: "Compliance areas tracked" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 px-6 py-4 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">F1Buddy</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-medium mb-6">
          <GraduationCap className="w-3.5 h-3.5" />
          Built for 1.1M F-1 International Students
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Never miss an{" "}
          <span className="text-indigo-600">immigration</span>{" "}
          deadline again
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          F1Buddy tracks your OPT unemployment days, visa deadlines, travel limits, and tax obligations so you can focus on studying — not spreadsheets.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors text-lg"
          >
            Start Free — No Credit Card
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors text-lg"
          >
            Sign In
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Free plan · Premium $6.99/mo · University licenses available
        </p>
      </div>

      {/* Stats */}
      <div className="max-w-3xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-3 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-3xl font-bold text-indigo-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Everything to stay in F-1 status
        </h2>
        <p className="text-gray-500 text-center mb-10">All your compliance tools in one dashboard</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-gray-900 font-semibold mb-1">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Ready to stop worrying about deadlines?
          </h2>
          <p className="text-gray-500 mb-6">
            Join F-1 students staying in compliance with F1Buddy
          </p>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Create Free Account →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-gray-600 font-medium">F1Buddy</span>
          </div>
          <p className="text-center">Not affiliated with USCIS or DHS · Always consult your DSO</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
