import Link from "next/link";
import { GraduationCap } from "lucide-react";

export const metadata = { title: "Privacy Policy — F1Buddy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">F1Buddy</span>
        </Link>
        <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-900">Sign in</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: April 28, 2026</p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-sm text-amber-800">
          <strong>Important:</strong> F1Buddy handles sensitive immigration data. We take your privacy seriously and have designed the app to store the minimum data necessary to provide the service.
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p>F1Buddy is an immigration compliance tracking tool for F-1 international students in the United States. We are not affiliated with USCIS, DHS, or any US government agency.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect only what you provide to help you track your compliance:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account information:</strong> Email address, name, and profile photo (if using Google sign-in)</li>
              <li><strong>Student profile:</strong> University name, program, program dates, degree level</li>
              <li><strong>DSO contact:</strong> Your Designated School Official&apos;s name, email, and phone</li>
              <li><strong>Visa information:</strong> Visa type, passport expiry date, EAD dates, I-20 signature date</li>
              <li><strong>Sensitive identifiers (encrypted):</strong> SEVIS ID — stored using AES-256-GCM encryption. We cannot read the decrypted value without your encryption key.</li>
              <li><strong>Employment records:</strong> Employer names, dates, and OPT status you enter</li>
              <li><strong>Travel records:</strong> Trip dates and destinations you log</li>
              <li><strong>Documents:</strong> Files you upload to the document vault (stored encrypted on Supabase Storage)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To calculate compliance deadlines and alert you before they pass</li>
              <li>To provide personalized AI assistant answers based on your OPT status</li>
              <li>To generate travel checklists and unemployment day counts</li>
              <li>To send deadline reminder emails (only if you have notifications enabled)</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your data. We do <strong>not</strong> share it with third parties except as described below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We use the following services to operate F1Buddy:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Supabase</strong> (database, authentication, file storage) — US servers. <a href="https://supabase.com/privacy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>Groq</strong> (AI assistant) — only your profile summary and question are sent; never raw SEVIS IDs or passport numbers. <a href="https://groq.com/privacy-policy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>Vercel</strong> (hosting) — <a href="https://vercel.com/legal/privacy-policy" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>Resend</strong> (email delivery) — only used to send deadline reminders you request</li>
              <li><strong>Stripe</strong> (payments) — only used when you subscribe to a paid plan. We never store payment card details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>SEVIS IDs are encrypted at rest using AES-256-GCM before being stored</li>
              <li>All data is transmitted over HTTPS (TLS 1.2+)</li>
              <li>Row-Level Security policies ensure you can only access your own data</li>
              <li>Document files are stored in private Supabase Storage buckets with access controls</li>
              <li>We do not log SEVIS IDs, passport numbers, or I-94 numbers in application logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p>We retain your data as long as your account is active. AI conversation history is retained for no more than 90 days. If you delete your account, we will delete all your data within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Access</strong> all data we hold about you</li>
              <li><strong>Export</strong> your data in machine-readable format</li>
              <li><strong>Delete</strong> your account and all associated data</li>
              <li><strong>Correct</strong> any inaccurate data via your profile settings</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us at <a href="mailto:privacy@f1buddy.app" className="text-indigo-600 hover:underline">privacy@f1buddy.app</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>We use session cookies set by Supabase Auth to maintain your login state. We do not use advertising cookies or third-party tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>F1Buddy is not intended for users under 13. We do not knowingly collect data from children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>We will notify active users of material changes to this policy via email at least 14 days before the changes take effect.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Questions? Email us at <a href="mailto:privacy@f1buddy.app" className="text-indigo-600 hover:underline">privacy@f1buddy.app</a>.</p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-200 px-6 py-6 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-gray-600 transition-colors">Terms of Service</Link>
          <span>·</span>
          <span>F1Buddy · Not affiliated with USCIS or DHS</span>
        </div>
      </footer>
    </div>
  );
}
