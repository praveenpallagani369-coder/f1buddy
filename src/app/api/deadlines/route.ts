import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  deadlineDate: z.string().min(1),
  category: z.enum(["opt","visa","travel","tax","sevis","document","custom"]),
  severity: z.enum(["critical","warning","info"]).default("warning"),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending","acknowledged","completed","overdue"]).optional(),
});

export async function GET() {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { data } = await supabase
    .from("compliance_deadlines")
    .select("*")
    .eq("user_id", user.id)
    .order("deadline_date");

  return ok(data ?? []);
}

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { data, error: dbErr } = await supabase
    .from("compliance_deadlines")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      deadline_date: parsed.data.deadlineDate,
      category: parsed.data.category,
      severity: parsed.data.severity,
      status: "pending",
      is_system_generated: false,
    })
    .select()
    .single();

  if (dbErr) return err("DB_ERROR", dbErr.message);
  return ok(data, 201);
}

export async function PATCH(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  // Verify ownership
  const { data: existing } = await supabase.from("compliance_deadlines").select("user_id").eq("id", parsed.data.id).single();
  if (!existing || existing.user_id !== user.id) return err("FORBIDDEN", "Access denied", 403);

  const { data } = await supabase
    .from("compliance_deadlines")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .select()
    .single();

  return ok(data);
}
