"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppIcon } from "@/components/icons/AppIcon";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }
    setLoading(true);
    setError(null);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const next = encodeURIComponent("/auth/update-password");
    // Use /auth/confirm so Supabase can complete recovery with verifyOtp(token_hash)
    // — works when the email is opened on another device (PKCE /auth/callback often fails).
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/confirm?next=${next}`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <AppIcon size={56} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">VisaBuddy</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Immigration & Visa Manager</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-card">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Check your email</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                If an account exists for <strong className="text-gray-900 dark:text-gray-100">{email}</strong>, we sent a
                link to reset your password. Open it and choose a new password on the next page.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                Didn&apos;t get it? Check spam, or try again in a few minutes.
              </p>
              <Link
                href="/auth/login"
                className="inline-block mt-6 text-sm text-orange-600 dark:text-orange-400 font-medium hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Forgot password</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Enter the email you used to register. We&apos;ll send a secure link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" loading={loading}>
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          <Link href="/auth/login" className="text-orange-600 dark:text-orange-400 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
