import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

const RP_ID = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { deviceName, ...credential } = body;

  // Get stored challenge
  const { data: challengeRow } = await supabase
    .from("webauthn_challenges")
    .select("challenge, expires_at")
    .eq("user_id", user.id)
    .eq("type", "registration")
    .single();

  if (!challengeRow) return NextResponse.json({ error: "No challenge found" }, { status: 400 });
  if (new Date(challengeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    const { credential: cred } = verification.registrationInfo;

    await supabase.from("webauthn_credentials").insert({
      user_id: user.id,
      credential_id: Buffer.from(cred.id).toString("base64url"),
      public_key: Buffer.from(cred.publicKey).toString("base64url"),
      counter: cred.counter,
      device_name: deviceName ?? "Biometric Device",
    });

    // Clean up challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "registration");

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
