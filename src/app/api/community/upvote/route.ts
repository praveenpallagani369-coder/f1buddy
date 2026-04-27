import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  type: z.enum(["post", "answer"]),
  id: z.string().uuid(),
});

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { type, id } = parsed.data;

  // One upvote per user per item per 24 hours — prevents duplicate voting
  const { allowed } = await rateLimitDB(
    supabase,
    `upvote:${type}:${id}:${user.id}`,
    1,
    86400
  );
  if (!allowed) return err("RATE_LIMIT", "You have already voted on this item.", 429);

  const table = type === "post" ? "community_posts" : "community_answers";
  const { data: current } = await supabase
    .from(table)
    .select("upvotes")
    .eq("id", id)
    .single();

  if (!current) return err("NOT_FOUND", "Item not found", 404);

  const { data, error: dbErr } = await supabase
    .from(table)
    .update({ upvotes: current.upvotes + 1 })
    .eq("id", id)
    .select("upvotes")
    .single();

  if (dbErr) return err("DB_ERROR", "Failed to record vote");
  return ok({ upvotes: data.upvotes });
}
