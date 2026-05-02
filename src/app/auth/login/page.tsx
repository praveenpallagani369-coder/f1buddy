"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Sparkles } from "lucide-react";
import { AppIcon } from "@/components/icons/AppIcon";
import { BiometricLoginButton } from "@/components/auth/biometric-login-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "auth_failed") {
      setError("Google sign-in failed. Please check that Google is enabled in Supabase Auth settings, or use email sign-in below.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleMagicLink() {
    if (!email) { setError("Enter your email first"); return; }
    setMagicLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setMagicSent(true);
    setMagicLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success the browser redirects — no need to setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <AppIcon size={56} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">VisaBuddy</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Immigration & Visa Manager</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Sign in to your account</h2>

          {magicSent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-orange-600" />
              </div>
              <p className="text-gray-900 dark:text-gray-100 font-semibold">Check your email</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                We sent a magic link to <strong className="text-gray-900 dark:text-gray-100">{email}</strong>
              </p>
              <button
                className="text-orange-600 text-sm mt-4 hover:text-orange-700"
                onClick={() => setMagicSent(false)}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 active:bg-gray-100 dark:active:bg-gray-600 transition-all mb-6 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-gray-900 px-3 text-gray-400 dark:text-gray-500 font-medium">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                  <Input
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 border border-red-200 rounded-lg p-3 dark:bg-red-950/40 dark:border-red-800">
                    <span className="flex-1">{error}</span>
                  </div>
                )}

                <Button type="submit" className="w-full" loading={loading}>
                  Sign In
                </Button>
              </form>

              <button
                onClick={handleMagicLink}
                disabled={magicLoading}
                className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/60 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {magicLoading ? "Sending magic link…" : "Send magic link instead"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100 dark:border-gray-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-gray-900 px-3 text-gray-400 dark:text-gray-500">or</span>
                </div>
              </div>
              <BiometricLoginButton email={email} />
            </>
          )}
        </div>

        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium">
            Sign up free
          </Link>
        </p>
        <p className="text-center text-gray-400 dark:text-gray-500 text-xs mt-3">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          {" · "}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
