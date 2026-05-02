import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";

const RP_NAME = "VisaBuddy";
const RP_ID = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get existing credentials to exclude
  const { data: creds } = await supabase
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email ?? user.id,
    userDisplayName: user.user_metadata?.name ?? user.email ?? "User",
    attestationType: "none",
    excludeCredentials: (creds ?? []).map((c) => ({
      id: c.credential_id,
      transports: ["internal"] as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      requireResidentKey: false,
      userVerification: "preferred",
    },
  });

  // Store challenge (expires in 5 minutes)
  await supabase.from("webauthn_challenges").upsert(
    {
      user_id: user.id,
      challenge: options.challenge,
      type: "registration",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id,type" }
  );

  return NextResponse.json(options);
}
