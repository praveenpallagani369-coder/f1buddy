import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";

const answerSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().min(10, "Answer must be at least 10 characters"),
});

export async function GET(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId) return err("VALIDATION", "postId required");

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(postId)) return err("VALIDATION", "Invalid postId format");

  const { data } = await supabase
    .from("community_answers")
    .select("*, users(name)")
    .eq("post_id", postId)
    .order("upvotes", { ascending: false });

  return ok(data ?? []);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { allowed } = await rateLimitDB(supabase, `answers:${user.id}`, 10, 60);
  if (!allowed) return err("RATE_LIMIT", "Too many requests. Please wait.", 429);

  const body = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { data: answer, error: dbErr } = await supabase
    .from("community_answers")
    .insert({ post_id: parsed.data.postId, user_id: user.id, body: parsed.data.body })
    .select("*, users(name)")
    .single();

  if (dbErr) return err("DB_ERROR", "Failed to save answer");

  // Atomic increment to avoid race condition
  await supabase.rpc("increment_answer_count", { post_id_input: parsed.data.postId });

  return ok(answer, 201);
}
