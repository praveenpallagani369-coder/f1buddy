import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/** Only allow same-origin relative paths (avoids open redirects). */
function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("://") || next.includes("\\")) return null;
  return next;
}

/**
 * Email links (password recovery, some magic links) arrive here with token_hash + type.
 * verifyOtp does NOT require the PKCE cookie — unlike exchangeCodeForSession(code) — so the
 * reset link works when opened on another device or inbox app vs where reset was requested.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const nextPath = safeInternalPath(searchParams.get("next"));

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    });
    if (!error) {
      // If type is recovery, always default to update-password
      const defaultDest = type === "recovery" ? "/auth/update-password" : "/dashboard";
      const dest = nextPath ?? defaultDest;
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (nextPath) {
        return NextResponse.redirect(`${origin}${nextPath}`);
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (!profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
