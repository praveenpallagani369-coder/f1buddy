import Link from "next/link";
import { Check, X } from "lucide-react";
import { AppIcon } from "@/components/icons/AppIcon";

export const metadata = { title: "Pricing — VisaBuddy" };

const FREE_FEATURES = [
  { label: "OPT unemployment day counter", included: true },
  { label: "Days-outside-US tracker (5-month rule)", included: true },
  { label: "System-generated compliance deadlines", included: true },
  { label: "Travel trip log", included: true },
  { label: "CPT tracker", included: true },
  { label: "Visa timeline & H-1B guide", included: true },
  { label: "New arrival guides (SSN, banking, housing)", included: true },
  { label: "Emergency contacts & rights guide", included: true },
  { label: "Community Q&A (read + post)", included: true },
  { label: "Unlimited document uploads", included: false },
  { label: "AI immigration assistant (Groq/Llama)", included: false },
  { label: "Email deadline reminders (30/14/7/3/1 day)", included: false },
  { label: "Tax filing assistant & treaty lookup", included: false },
  { label: "Compliance export (PDF)", included: false },
];

const PREMIUM_FEATURES = [
  { label: "Everything in Free", included: true },
  { label: "Unlimited document uploads", included: true },
  { label: "AI immigration assistant (Groq/Llama)", included: true },
  { label: "Email deadline reminders (30/14/7/3/1 day)", included: true },
  { label: "Tax filing assistant & treaty lookup", included: true },
  { label: "Compliance export (PDF)", included: true },
  { label: "Priority support", included: true },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <AppIcon size={32} />
            <span className="font-bold text-gray-900 dark:text-gray-100">VisaBuddy</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
              Sign in
            </Link>
            <Link href="/auth/register" className="text-sm px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">Simple, transparent pricing</h1>
          <p className="text-gray-500 text-lg">Start free. Upgrade when you need email reminders and the AI assistant.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {/* Free */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-7">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Free</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">$0</span>
              <span className="text-gray-500">/mo</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">Forever free. No credit card.</p>
            <Link
              href="/auth/register"
              className="block text-center px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium mb-6"
            >
              Get Started
            </Link>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(({ label, included }) => (
                <li key={label} className="flex items-start gap-2.5 text-sm">
                  {included
                    ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    : <X className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />}
                  <span className={included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-600"}>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium */}
          <div className="bg-orange-600 rounded-2xl p-7 relative md:-mt-2 shadow-xl shadow-orange-200 dark:shadow-orange-900/40">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              Most Popular
            </div>
            <p className="text-xs font-bold text-orange-200 uppercase tracking-widest mb-2">Premium</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-white">$6.99</span>
              <span className="text-orange-200">/mo</span>
            </div>
            <p className="text-sm text-orange-200 mb-1">or $59.99/year <span className="text-amber-300 font-medium">(save 28%)</span></p>
            <p className="text-xs text-orange-300 mb-6">Cancel anytime.</p>
            <div className="flex flex-col gap-2 mb-6">
              <a
                href="/api/payments/create-checkout?plan=monthly"
                className="block text-center px-6 py-2.5 rounded-xl bg-white text-orange-600 hover:bg-indigo-50 transition-colors text-sm font-semibold"
              >
                Subscribe Monthly →
              </a>
              <a
                href="/api/payments/create-checkout?plan=yearly"
                className="block text-center px-6 py-2 rounded-xl border border-orange-300 text-orange-100 hover:bg-orange-500 transition-colors text-xs font-medium"
              >
                Subscribe Yearly (save 28%) →
              </a>
            </div>
            <ul className="space-y-2.5">
              {PREMIUM_FEATURES.map(({ label }) => (
                <li key={label} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-orange-200 flex-shrink-0 mt-0.5" />
                  <span className="text-orange-100">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* University */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-7">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">University</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">Custom</span>
            </div>
            <p className="text-sm text-gray-500 mb-6">$15–25/student/year. For ISSS offices.</p>
            <a
              href="mailto:hello@visabuddy.app?subject=University%20License%20Inquiry"
              className="block text-center px-6 py-2.5 rounded-xl bg-orange-600 text-white hover:bg-orange-700 transition-colors text-sm font-medium mb-6"
            >
              Contact Us
            </a>
            <ul className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
              {[
                "All Premium features for every student",
                "Admin dashboard for ISSS office",
                "Compliance monitoring across all students",
                "Aggregate reports & statistics",
                "Custom university branding",
                "Dedicated support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8">Frequently asked questions</h2>
          <div className="max-w-2xl mx-auto space-y-6">
            {[
              {
                q: "Is the free plan actually free?",
                a: "Yes, forever. The core compliance tracking — OPT counter, travel tracker, deadline system — will always be free. We'll add paid features on top.",
              },
              {
                q: "When will Premium launch?",
                a: "Premium is live now. Subscribe monthly ($6.99/mo) or yearly ($59.99/yr) to unlock the AI assistant, email reminders, unlimited document uploads, and tax filing tools.",
              },
              {
                q: "Is my immigration data secure?",
                a: "Yes. Your SEVIS ID is encrypted with AES-256-GCM before it's stored. Document files are stored in private Supabase Storage with row-level access controls. We never sell your data.",
              },
              {
                q: "How does the University plan work?",
                a: "We build a branded dashboard for your ISSS office with aggregate compliance views across enrolled students. Students get all Premium features included. Pricing is per enrolled international student.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Yes. Premium is month-to-month. Cancel any time from your account settings. Your data stays available on the Free plan after cancellation.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-gray-200 dark:border-gray-700 pb-5">
                <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-gray-200 dark:border-gray-700 px-6 py-8 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <AppIcon size={24} />
            <span className="text-gray-600 font-medium">VisaBuddy</span>
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
