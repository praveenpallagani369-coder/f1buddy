import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

const RP_ID = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost";

export async function POST(req: NextRequest) {
  // email is passed to look up user credentials without being logged in
  const { email } = await req.json().catch(() => ({}));

  const supabase = await createClient();
  let userId: string | undefined;

  // If email provided, look up user id from public profile
  if (email) {
    const { data } = await supabase.from("users").select("id").eq("email", email).single();
    userId = data?.id;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: creds } = await supabase
    .from("webauthn_credentials")
    .select("credential_id")
    .eq("user_id", userId);

  if (!creds?.length) return NextResponse.json({ error: "No credentials registered" }, { status: 404 });

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      transports: ["internal"] as AuthenticatorTransport[],
    })),
  });

  // Store challenge
  await supabase.from("webauthn_challenges").upsert(
    {
      user_id: userId,
      challenge: options.challenge,
      type: "authentication",
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id,type" }
  );

  return NextResponse.json({ ...options, userId });
}
