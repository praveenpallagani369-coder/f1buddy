"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppIcon } from "@/components/icons/AppIcon";
import { KeyRound } from "lucide-react";

const MIN_LEN = 8;

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setSessionReady(!!session);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/auth/login?msg=password-updated");
    router.refresh();
  }

  if (sessionReady === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  if (sessionReady === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <AppIcon size={56} />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Link invalid or expired</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Request a new password reset from the sign-in page.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block mt-6 text-sm text-orange-600 dark:text-orange-400 font-medium hover:underline"
          >
            Send reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <AppIcon size={56} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">VisaBuddy</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Set a new password</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-card">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center mb-4">
            <KeyRound className="w-6 h-6 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">New password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose a strong password you haven&apos;t used here before.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New password</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_LEN}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm password</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={MIN_LEN}
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-3">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" loading={loading}>
              Update password
            </Button>
          </form>
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
