import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    // Light query to verify DB is reachable
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, db: "connected", ts: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 503 }
    );
  }
}
