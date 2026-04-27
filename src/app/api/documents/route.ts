import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";

const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "gif", "tiff"];
const ALLOWED_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  tiff: "image/tiff",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const uploadSchema = z.object({
  docType: z.enum(["i20","ead","passport","visa_stamp","i94","ssn_card","offer_letter","pay_stub","tax_return","transcript","other"]),
  fileName: z.string().min(1).max(255).refine(
    (name) => {
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      return ALLOWED_EXTENSIONS.includes(ext);
    },
    { message: "File type not allowed. Accepted: PDF, PNG, JPG, WEBP, GIF, TIFF" }
  ),
  fileSizeBytes: z.number().int().min(1).max(MAX_FILE_SIZE, `File size must be under ${MAX_FILE_SIZE / 1024 / 1024} MB`).optional(),
  expirationDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
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

  if (dbErr) return err("DB_ERROR", "Failed to load documents");
  return ok(data);
}

// POST /api/documents — create document record + get upload URL
export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { allowed } = await rateLimitDB(supabase, `documents:${user.id}`, 10, 60);
  if (!allowed) return err("RATE_LIMIT", "Too many upload requests. Please wait.", 429);

  const body = await request.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const { docType, fileName, expirationDate, notes } = parsed.data;

  const ext = (fileName.split(".").pop() ?? "pdf").toLowerCase();
  const mimeType = ALLOWED_MIME_TYPES[ext] ?? "application/octet-stream";
  const storagePath = `${user.id}/${docType}/${Date.now()}.${ext}`;

  let uploadUrl: string | null = null;
  let publicUrl: string | null = null;

  try {
    const { data: uploadData } = await supabase.storage
      .from("documents")
      .createSignedUploadUrl(storagePath);
    uploadUrl = uploadData?.signedUrl ?? null;

    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60 * 60); // 1 hour — re-sign on demand
    publicUrl = urlData?.signedUrl ?? null;
  } catch {
    // Storage not configured — store record without file
  }

  const { data: doc, error: dbErr } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      doc_type: docType,
      file_url: publicUrl ?? `pending://${storagePath}`,
      file_name: fileName,
      file_size_bytes: parsed.data.fileSizeBytes ?? null,
      mime_type: mimeType,
      expiration_date: expirationDate || null,
      notes: notes || null,
      is_current_version: true,
    })
    .select()
    .single();

  if (dbErr) return err("DB_ERROR", "Failed to save document record");

  return ok({ document: doc, uploadUrl, storagePath });
}

// DELETE /api/documents?id=xxx — soft delete
export async function DELETE(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return err("VALIDATION", "Document ID required");

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return err("VALIDATION", "Invalid document ID");

  // Verify ownership
  const { data: doc } = await supabase.from("documents").select("user_id").eq("id", id).single();
  if (!doc || doc.user_id !== user.id) return err("FORBIDDEN", "Access denied", 403);

  await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  return ok({ deleted: true });
}
