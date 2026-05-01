import Link from "next/link";
import { AppIcon } from "@/components/icons/AppIcon";

export const metadata = { title: "Terms of Service — VisaBuddy" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <AppIcon size={32} />
          <span className="font-bold text-gray-900">VisaBuddy</span>
        </Link>
        <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-900">Sign in</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
          <strong>Not Legal Advice:</strong> VisaBuddy provides informational tools to help you track immigration deadlines. Nothing in this app or these terms constitutes legal advice. Always consult your DSO or a licensed immigration attorney for decisions affecting your visa status.
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using VisaBuddy, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>VisaBuddy is a personal compliance tracking tool for F-1 visa international students. It helps you track OPT deadlines, travel days, document expiration, and other immigration-related dates. VisaBuddy is <strong>not</strong>:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>An immigration legal service</li>
              <li>Affiliated with or authorized by USCIS, DHS, or any US government agency</li>
              <li>A substitute for advice from your Designated School Official (DSO)</li>
              <li>A licensed immigration attorney or law firm</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Informational Use Only</h2>
            <p>All calculations, deadline alerts, AI assistant responses, and other outputs from VisaBuddy are provided for informational purposes only. Immigration regulations change frequently. You are responsible for verifying all information with your DSO or a licensed immigration attorney before making any immigration-related decisions.</p>
            <p className="mt-3 font-medium">VisaBuddy is not liable for visa violations, SEVIS terminations, deportation, or any other immigration consequences resulting from reliance on information provided by this app.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Eligibility</h2>
            <p>You must be at least 13 years old to use VisaBuddy. By using the service, you represent that you meet this requirement.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your Account</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>Each person may only maintain one account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Use the service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the service</li>
              <li>Interfere with or disrupt the service&apos;s infrastructure</li>
              <li>Scrape, copy, or redistribute content from the service without permission</li>
              <li>Post content that violates others&apos; rights or contains harmful material</li>
              <li>Use the AI assistant to seek advice on violating immigration laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Subscription and Payments</h2>
            <p>VisaBuddy offers a free tier and optional paid subscriptions. Paid subscriptions are billed in advance on a monthly or annual basis. You may cancel at any time. Refunds are provided at our discretion within 7 days of charge. We use Stripe for payment processing — your payment details are never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Intellectual Property</h2>
            <p>VisaBuddy and its original content, features, and functionality are owned by VisaBuddy and are protected by intellectual property laws. You retain ownership of any personal data you submit.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>VisaBuddy is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not warrant that the service will be uninterrupted, error-free, or that deadline calculations will be accurate in all circumstances. Immigration rules change — always verify with official USCIS sources.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, VisaBuddy shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to immigration violations, visa status issues, or loss of employment authorization, arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time. Upon termination, your data will be deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p>We may update these terms. We will notify active users via email at least 14 days before material changes take effect. Continued use of the service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
            <p>These terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h2>
            <p>Questions about these terms? Email us at <a href="mailto:legal@visabuddy.app" className="text-indigo-600 hover:underline">legal@visabuddy.app</a>.</p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-200 px-6 py-6 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <span>VisaBuddy · Not affiliated with USCIS or DHS</span>
        </div>
      </footer>
    </div>
  );
}
