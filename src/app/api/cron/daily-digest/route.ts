import { createClient } from "@/lib/supabase/server";
import { generateComplianceBrief } from "@/lib/immigration/compliance-brief";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify CRON_SECRET to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = await createClient();

  // Fetch all users who have onboarding completed
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("onboarding_completed", true);

  if (usersError || !users) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  const results = [];

  for (const user of users) {
    // Fetch user data needed for compliance brief
    const [
      { data: optStatus },
      { data: deadlines },
      { data: documents },
      { data: travelRecords }
    ] = await Promise.all([
      supabase.from("opt_status").select("*").eq("user_id", user.id).single(),
      supabase.from("compliance_deadlines").select("*").eq("user_id", user.id),
      supabase.from("documents").select("*").eq("user_id", user.id).eq("is_current_version", true),
      supabase.from("travel_records").select("*").eq("user_id", user.id),
    ]);

    const brief = generateComplianceBrief({
      optStatus,
      deadlines: deadlines || [],
      documents: documents || [],
      travelRecords: travelRecords || [],
    });

    // Save notification to DB
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "system",
      title: "Daily Compliance Brief",
      message: brief.oneLiner,
      link: "/dashboard",
    });

    // TODO: Send email/push notification here using Resend or Web Push
    // For now we just log it and save to DB
    
    results.push({ userId: user.id, status: brief.status });
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    timestamp: new Date().toISOString(),
  });
}
