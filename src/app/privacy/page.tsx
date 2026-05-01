import Link from "next/link";
import { AppIcon } from "@/components/icons/AppIcon";

export const metadata = { title: "Privacy Policy — VisaBuddy" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <AppIcon size={32} />
            <span className="font-bold text-gray-900 dark:text-gray-100">VisaBuddy</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Sign in</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-10">Last updated: April 30, 2026</p>

        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-8 text-sm text-amber-800 dark:text-amber-300">
          <strong>Important:</strong> VisaBuddy handles sensitive immigration data. We take your privacy seriously and have designed the app to store the minimum data necessary to provide the service. We do <strong>not</strong> share your information with USCIS, ICE, DHS, or any government agency — ever — except as required by a specific, valid legal process such as a court order.
        </div>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Who We Are</h2>
            <p>VisaBuddy is an immigration compliance tracking tool for F-1 international students in the United States. We are not affiliated with USCIS, DHS, or any US government agency. Nothing in this app constitutes legal advice — always consult your DSO or a licensed immigration attorney for your specific situation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect only what you provide to help you track your compliance:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account information:</strong> Email address, name, and profile photo (if using Google sign-in)</li>
              <li><strong>Student profile:</strong> University name, program, program dates, degree level, home country</li>
              <li><strong>DSO contact:</strong> Your Designated School Official&apos;s name, email, and phone</li>
              <li><strong>Visa information:</strong> Visa type, passport expiry date, EAD dates, I-20 signature date</li>
              <li><strong>Employment records:</strong> Employer names, dates, and OPT status you enter</li>
              <li><strong>Travel records:</strong> Trip dates and destinations you log</li>
              <li><strong>Documents:</strong> Files you upload to the document vault</li>
            </ul>

            <div className="mt-5 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2 text-sm">Immigration Document Identifiers — Special Category Data</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                VisaBuddy allows you to optionally store the following sensitive immigration identifiers for compliance tracking purposes. <strong>All three values are encrypted using AES-256-GCM encryption before being written to the database.</strong> The plaintext value is never stored, never logged, and never transmitted to any third party.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-indigo-700 dark:text-indigo-300">
                <li><strong>SEVIS ID</strong> — your student record number (format: N + 9 digits)</li>
                <li><strong>Passport number</strong> — from your travel document</li>
                <li><strong>I-94 Admission Number</strong> — from your last US entry record</li>
              </ul>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-3">
                These fields are write-only: once saved, the decrypted values are <strong>never returned to the client or displayed in the app</strong>. They exist solely so you have a record that these documents are on file. You may delete them at any time from your profile settings.
              </p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-2">
                <strong>Government non-disclosure:</strong> VisaBuddy does not share your SEVIS ID, passport number, I-94 number, or any other data with USCIS, ICE, DHS, CBP, or any government agency, absent a valid, specific, and legally compelled court order or subpoena directed to us. If we receive such an order, we will notify you to the extent legally permitted before complying.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To calculate compliance deadlines and alert you before they pass</li>
              <li>To provide personalized AI assistant answers based on your OPT status and profile</li>
              <li>To generate travel checklists and unemployment day counts</li>
              <li>To send deadline reminder emails (only if you have notifications enabled)</li>
              <li>To display your compliance dashboard and phase status</li>
            </ul>
            <p className="mt-3">We do <strong>not</strong> sell your data. We do <strong>not</strong> use your data for advertising. We do <strong>not</strong> share it with third parties except as described in Section 4.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We use the following services to operate VisaBuddy. Each receives only the minimum data necessary:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Supabase</strong> (database, authentication, file storage) — US-based servers. Your data is stored in Supabase&apos;s US region. <a href="https://supabase.com/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>Groq</strong> (AI assistant) — only a non-identifiable summary of your compliance situation is sent (e.g., &quot;Student on OPT active, 45 unemployment days used, EAD expires in 60 days&quot;). Raw SEVIS IDs, passport numbers, and I-94 numbers are <strong>never</strong> sent to Groq. <a href="https://groq.com/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>Vercel</strong> (hosting and serverless functions) — <a href="https://vercel.com/legal/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>Resend</strong> (email delivery) — only your email address and deadline information are passed to send reminder emails you have requested</li>
              <li><strong>Stripe</strong> (payments) — only used when you subscribe to a paid plan. We never see or store your payment card details. Stripe handles all payment processing under PCI DSS compliance. <a href="https://stripe.com/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong>PostHog</strong> (product analytics) — anonymous usage events only (page views, feature usage). No PII is sent to PostHog.</li>
              <li><strong>Sentry</strong> (error monitoring) — error stack traces only. We scrub PII from error reports before they are sent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>SEVIS IDs, passport numbers, and I-94 numbers are encrypted at rest using AES-256-GCM before storage — the plaintext value is never persisted</li>
              <li>All data is transmitted over HTTPS (TLS 1.2+)</li>
              <li>Row-Level Security (RLS) policies in the database ensure each user can only access their own records — this is enforced at the database level, not just the application layer</li>
              <li>Document files are stored in private Supabase Storage buckets with per-user access controls</li>
              <li>Application logs never contain SEVIS IDs, passport numbers, I-94 numbers, or other sensitive immigration identifiers</li>
              <li>Admin access to the database does not expose decrypted immigration identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Data Retention</h2>
            <p className="mb-2">We retain your data as long as your account is active.</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>AI conversation history</strong> is automatically deleted after 90 days</li>
              <li><strong>Account deletion</strong> — all your data is permanently deleted within 30 days of account deletion</li>
              <li><strong>Inactive accounts</strong> — accounts with no activity for 24 months may be deleted with 30 days&apos; email notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">7. Your Rights</h2>
            <p className="mb-3">Regardless of where you are located, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Access</strong> all data we hold about you — request a full export at any time</li>
              <li><strong>Rectification</strong> — correct any inaccurate data via your profile settings</li>
              <li><strong>Erasure</strong> — delete your account and all associated data permanently (Profile → Settings → Delete Account)</li>
              <li><strong>Portability</strong> — export your compliance data in machine-readable format</li>
              <li><strong>Objection</strong> — opt out of any non-essential data processing at any time</li>
            </ul>
            <p className="mt-3">If you are in the European Economic Area (EEA), UK, or Switzerland, you have additional rights under GDPR including the right to lodge a complaint with your local data protection authority.</p>
            <p className="mt-2">To exercise any of these rights, email <a href="mailto:privacy@visabuddy.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">privacy@visabuddy.app</a>. We respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Business Transfers</h2>
            <p>If VisaBuddy is acquired, merged, or its assets are transferred to another company, your data may be transferred as part of that transaction. We will notify you by email at least 30 days before any such transfer takes effect, and you will have the option to delete your account before the transfer occurs. Any acquiring company would be required to honor this privacy policy or provide you with 30 days&apos; notice of material changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">9. Cookies</h2>
            <p>We use session cookies set by Supabase Auth to maintain your login state. These are strictly necessary for the app to function. We do not use advertising cookies, third-party tracking cookies, or persistent analytics cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">10. Children&apos;s Privacy</h2>
            <p>VisaBuddy is not intended for users under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us data, contact us at <a href="mailto:privacy@visabuddy.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">privacy@visabuddy.app</a> and we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">11. Changes to This Policy</h2>
            <p>We will notify active users of material changes to this policy via email at least 14 days before the changes take effect. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">12. Contact</h2>
            <p>Privacy questions or data requests: <a href="mailto:privacy@visabuddy.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">privacy@visabuddy.app</a></p>
            <p className="mt-1">General questions: <a href="mailto:hello@visabuddy.app" className="text-indigo-600 dark:text-indigo-400 hover:underline">hello@visabuddy.app</a></p>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-200 dark:border-gray-700 px-6 py-6 text-center text-gray-400 dark:text-gray-500 text-sm bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Home</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms of Service</Link>
          <span>·</span>
          <span>VisaBuddy · Not affiliated with USCIS or DHS</span>
        </div>
      </footer>
    </div>
  );
}
