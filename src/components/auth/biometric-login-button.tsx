"use client";
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function BiometricLoginButton({ email }: { email?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function signIn() {
    setStatus("loading");
    setError("");
    try {
      const optRes = await fetch("/api/auth/webauthn/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!optRes.ok) {
        const { error: e } = await optRes.json();
        throw new Error(e);
      }
      const { userId, ...options } = await optRes.json();

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credential, userId, email }),
      });
      if (!verifyRes.ok) {
        const { error: e } = await verifyRes.json();
        throw new Error(e);
      }
      const { token, type } = await verifyRes.json();

      if (token && type) {
        const { error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: "magiclink",
        });
        if (sessionError) throw sessionError;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Biometric sign-in failed";
      setError(msg);
      setStatus("error");
    }
  }

  return (
    <div>
      <button
        onClick={signIn}
        disabled={status === "loading"}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 active:scale-[0.98]"
      >
        {status === "loading" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Fingerprint className="w-5 h-5 text-orange-600" />
        )}
        {status === "loading" ? "Verifying…" : "Sign in with Biometrics"}
      </button>
      {error && <p className="text-xs text-red-500 mt-1.5 text-center">{error}</p>}
    </div>
  );
}
