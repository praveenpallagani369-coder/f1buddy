"use client";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BiometricRegisterButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function register() {
    setStatus("loading");
    setError("");
    try {
      const optRes = await fetch("/api/auth/webauthn/register-options");
      if (!optRes.ok) throw new Error(await optRes.text());
      const options = await optRes.json();

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...credential,
          deviceName: navigator.userAgent.includes("iPhone")
            ? "iPhone"
            : navigator.userAgent.includes("Android")
            ? "Android"
            : "This Device",
        }),
      });
      if (!verifyRes.ok) {
        const { error: e } = await verifyRes.json();
        throw new Error(e);
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Biometric sign-in enabled
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="outline"
        onClick={register}
        disabled={status === "loading"}
        className="w-full flex items-center gap-2"
      >
        {status === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Fingerprint className="w-4 h-4" />
        )}
        {status === "loading" ? "Setting up…" : "Enable Biometric Sign-In"}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
