import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// CLAUDE.md: "Never store AI conversation content longer than 90 days"
export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffISO = cutoff.toISOString();

  const { count, error } = await supabase
    .from("ai_conversations")
    .delete({ count: "exact" })
    .lt("updated_at", cutoffISO);

  if (error) {
    console.error("Cleanup cron error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: count ?? 0, cutoff: cutoffISO });
}
