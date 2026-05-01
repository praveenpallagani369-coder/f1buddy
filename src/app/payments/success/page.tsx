import Link from "next/link";
import { GraduationCap, Check } from "lucide-react";

export const metadata = { title: "Subscription Confirmed — VisaBuddy" };

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">You&apos;re all set!</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Welcome to VisaBuddy Premium. Your AI assistant, email reminders, and unlimited document uploads are now active.
        </p>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-8 text-left space-y-3">
          {[
            "AI Immigration Assistant — ask anything about F-1 compliance",
            "Email reminders at 30, 14, 7, 3, and 1 days before deadlines",
            "Unlimited document uploads with expiration tracking",
            "Tax filing assistant & treaty lookup",
          ].map((f) => (
            <div key={f} className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{f}</p>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
        >
          <GraduationCap className="w-4 h-4" />
          Go to Dashboard
        </Link>

        <p className="text-xs text-gray-400 mt-6">
          Questions? Email us at{" "}
          <a href="mailto:hello@visabuddy.app" className="underline hover:text-gray-600">
            hello@visabuddy.app
          </a>
        </p>
      </div>
    </div>
  );
}
