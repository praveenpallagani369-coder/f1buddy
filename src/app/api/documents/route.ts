import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { z } from "zod";

const uploadSchema = z.object({
  docType: z.enum(["i20","ead","passport","visa_stamp","i94","offer_letter","pay_stub","tax_return","transcript","other"]),
  fileName: z.string().min(1),
  expirationDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/documents — list user's documents
export async function GET() {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { data, error: dbErr } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (dbErr) return err("DB_ERROR", dbErr.message);
  return ok(data);
}

// POST /api/documents — create document record + get upload URL
export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const body = await request.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { docType, fileName, expirationDate, notes } = parsed.data;

  // Generate a unique storage path for this user's document
  const ext = fileName.split(".").pop() ?? "pdf";
  const storagePath = `${user.id}/${docType}/${Date.now()}.${ext}`;

  // Create signed upload URL (valid 60 seconds)
  let uploadUrl: string | null = null;
  let publicUrl: string | null = null;

  try {
    const { data: uploadData } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(storagePath);
    uploadUrl = uploadData?.signedUrl ?? null;

    // Get the public/signed download URL
    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year
    publicUrl = urlData?.signedUrl ?? null;
  } catch {
    // Storage not configured — store record without file
  }

  // Insert document record
  const { data: doc, error: dbErr } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      doc_type: docType,
      file_url: publicUrl ?? `pending://${storagePath}`,
      file_name: fileName,
      mime_type: ext === "pdf" ? "application/pdf" : `image/${ext}`,
      expiration_date: expirationDate || null,
      notes: notes || null,
      is_current_version: true,
    })
    .select()
    .single();

  if (dbErr) return err("DB_ERROR", dbErr.message);

  return ok({ document: doc, uploadUrl, storagePath });
}

// DELETE /api/documents?id=xxx — soft delete
export async function DELETE(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return err("VALIDATION", "Document ID required");

  // Verify ownership
  const { data: doc } = await supabase.from("documents").select("user_id").eq("id", id).single();
  if (!doc || doc.user_id !== user.id) return err("FORBIDDEN", "Access denied", 403);

  await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  return ok({ deleted: true });
}
