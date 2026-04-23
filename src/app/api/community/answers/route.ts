import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
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

  const body = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { data: answer, error: dbErr } = await supabase
    .from("community_answers")
    .insert({ post_id: parsed.data.postId, user_id: user.id, body: parsed.data.body })
    .select("*, users(name)")
    .single();

  if (dbErr) return err("DB_ERROR", dbErr.message);

  // Increment answer_count on the post
  const { data: post } = await supabase.from("community_posts").select("answer_count").eq("id", parsed.data.postId).single();
  if (post) {
    await supabase.from("community_posts").update({ answer_count: (post.answer_count ?? 0) + 1 }).eq("id", parsed.data.postId);
  }

  return ok(answer, 201);
}
