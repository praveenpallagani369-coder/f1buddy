import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

const RP_ID = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost";
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { userId, ...credential } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Get challenge
  const { data: challengeRow } = await supabase
    .from("webauthn_challenges")
    .select("challenge, expires_at")
    .eq("user_id", userId)
    .eq("type", "authentication")
    .single();

  if (!challengeRow) return NextResponse.json({ error: "No challenge found" }, { status: 400 });
  if (new Date(challengeRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Challenge expired" }, { status: 400 });
  }

  // Find matching credential
  const credentialId = credential.id;
  const { data: storedCred } = await supabase
    .from("webauthn_credentials")
    .select("*")
    .eq("user_id", userId)
    .eq("credential_id", credentialId)
    .single();

  if (!storedCred) return NextResponse.json({ error: "Credential not found" }, { status: 404 });

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: storedCred.credential_id,
        publicKey: Buffer.from(storedCred.public_key, "base64url"),
        counter: storedCred.counter,
        transports: ["internal"],
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Verification failed" }, { status: 401 });
    }

    // Update counter
    await supabase
      .from("webauthn_credentials")
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq("id", storedCred.id);

    // Clean up challenge
    await supabase
      .from("webauthn_challenges")
      .delete()
      .eq("user_id", userId)
      .eq("type", "authentication");

    // Generate a magic link for the user to exchange for a session
    const adminSupabase = (await import("@/lib/supabase/service")).createServiceClient();
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "magiclink",
      email: body.email,
    });

    if (linkError || !linkData) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Extract token from the magic link
    const url = new URL(linkData.properties.action_link);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    return NextResponse.json({ success: true, token, type });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
