import { getAuthUser, ok, err } from "@/lib/api/helpers";
import { getGroqClient } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({ docId: z.string().uuid() });

const PARSEABLE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

const EXTRACT_PROMPTS: Record<string, string> = {
  i20: `Extract from this I-20 document: program end date, SEVIS ID (7 characters starting with N followed by 9 digits), student name. Return JSON: {"programEndDate":"YYYY-MM-DD","sevisId":"N...", "studentName":"..."}`,
  ead: `Extract from this EAD card: card expiration date, card category (e.g. C3B or C3C), card number. Return JSON: {"expirationDate":"YYYY-MM-DD","category":"...","cardNumber":"..."}`,
  passport: `Extract from this passport: expiration date, passport number, nationality, full name. Return JSON: {"expirationDate":"YYYY-MM-DD","passportNumber":"...","nationality":"...","fullName":"..."}`,
  visa_stamp: `Extract from this US visa: expiration date (annotated expiry), visa category (F-1, B-2 etc), number of entries. Return JSON: {"expirationDate":"YYYY-MM-DD","visaCategory":"...","entries":"..."}`,
  i94: `Extract from this I-94: admit-until date (D/S or a specific date), class of admission. Return JSON: {"admitUntil":"...","classOfAdmission":"..."}`,
};

const DEFAULT_PROMPT = `Extract any expiration date and document number from this document. Return JSON: {"expirationDate":"YYYY-MM-DD or null","documentNumber":"..."}`;

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return err("UNAUTHORIZED", "Sign in required", 401);

  const { allowed } = await rateLimitDB(supabase, `ai-parse:${user.id}`, 5, 60);
  if (!allowed) return err("RATE_LIMIT", "AI parsing limit reached. Please wait a moment.", 429);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "docId is required");

  const { data: doc } = await supabase
    .from("documents")
    .select("id, doc_type, file_url, mime_type, user_id, expiration_date")
    .eq("id", parsed.data.docId)
    .single();

  if (!doc || doc.user_id !== user.id) return err("NOT_FOUND", "Document not found", 404);

  if (!doc.mime_type || !PARSEABLE_MIMES.has(doc.mime_type)) {
    return err("UNSUPPORTED", "AI parsing only works for image files (JPG, PNG, WEBP). PDFs must be entered manually.", 422);
  }

  if (!doc.file_url || doc.file_url.startsWith("pending://") || doc.file_url.startsWith("demo://")) {
    return err("NOT_READY", "Document file not yet available for parsing", 422);
  }

  const prompt = EXTRACT_PROMPTS[doc.doc_type] ?? DEFAULT_PROMPT;

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: `${prompt}\n\nReturn ONLY valid JSON, no other text.` },
            { type: "image_url" as const, image_url: { url: doc.file_url } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 256,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    let extracted: Record<string, string> = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    } catch { /* malformed */ }

    const updates: Record<string, unknown> = { ai_extracted_data: extracted };

    // Auto-fill expiration date only if user hasn't set one
    if (extracted.expirationDate && extracted.expirationDate !== "null" && !doc.expiration_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(extracted.expirationDate)) {
        updates.expiration_date = extracted.expirationDate;
      }
    }

    await supabase.from("documents").update(updates).eq("id", doc.id);

    return ok({ extracted, autoFilledExpiry: !!updates.expiration_date, documentId: doc.id });
  } catch (e: unknown) {
    if ((e as { status?: number })?.status === 429) {
      return err("RATE_LIMIT", "AI service is busy. Please try again in a moment.", 429);
    }
    return err("AI_ERROR", "Document parsing failed. Please enter dates manually.", 503);
  }
}
