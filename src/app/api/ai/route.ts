import { createClient } from "@/lib/supabase/server";
import { askImmigrationQuestion } from "@/lib/ai/groq";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).min(1),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION", message: "Invalid request body" } }, { status: 400 });
  }

  try {
    const answer = await askImmigrationQuestion(parsed.data.messages);
    return NextResponse.json({ success: true, data: { answer } });
  } catch (error: any) {
    console.error("Groq API error:", error?.message);
    return NextResponse.json({ success: false, error: { code: "AI_ERROR", message: "AI service temporarily unavailable. Please try again." } }, { status: 503 });
  }
}
