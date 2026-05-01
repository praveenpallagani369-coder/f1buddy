import { getAuthUser, ok, err } from "@/lib/api/helpers";
import { getGroqClient } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  docType: z.string().default("other"),
});

const EXTRACT_PROMPTS: Record<string, string> = {
  i20: `Extract from this I-20 document: program end date, SEVIS ID (starts with N), student name. Return ONLY JSON: {"expirationDate":"YYYY-MM-DD or null","sevisId":"N... or null","studentName":"... or null","documentNumber":null}`,
  ead: `Extract from this EAD card: card expiration date, card category (e.g. C3B or C3C), card number. Return ONLY JSON: {"expirationDate":"YYYY-MM-DD or null","category":"... or null","documentNumber":"... or null"}`,
  passport: `Extract from this passport: expiration date, passport number, nationality, full name. Return ONLY JSON: {"expirationDate":"YYYY-MM-DD or null","documentNumber":"... or null","nationality":"... or null","fullName":"... or null"}`,
  visa_stamp: `Extract from this US visa stamp: expiration date, visa category (F-1 etc), entries allowed. Return ONLY JSON: {"expirationDate":"YYYY-MM-DD or null","visaCategory":"... or null","entries":"... or null","documentNumber":null}`,
  i94: `Extract from this I-94: admit-until date (D/S or specific date), class of admission. Return ONLY JSON: {"expirationDate":"... or null","classOfAdmission":"... or null","documentNumber":"... or null"}`,
};

const DEFAULT_PROMPT = `Extract any expiration date and document number or ID from this document. Return ONLY JSON with no extra text: {"expirationDate":"YYYY-MM-DD or null","documentNumber":"... or null","holderName":"... or null"}`;

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return err("UNAUTHORIZED", "Sign in required", 401);

  const { allowed } = await rateLimitDB(supabase, `ai-scan:${user.id}`, 10, 60);
  if (!allowed) return err("RATE_LIMIT", "AI scanning limit reached. Please wait a moment.", 429);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "imageBase64 and mimeType are required");

  const { imageBase64, mimeType, docType } = parsed.data;

  // Validate base64 size (~7.5MB in base64 = 10MB raw)
  if (imageBase64.length > 10_000_000) {
    return err("TOO_LARGE", "Image is too large for AI scanning", 413);
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const prompt = EXTRACT_PROMPTS[docType] ?? DEFAULT_PROMPT;

  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: `${prompt}\n\nReturn ONLY valid JSON, no other text, no markdown.` },
            { type: "image_url" as const, image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    let extracted: Record<string, string | null> = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
    } catch { /* malformed response */ }

    // Clean up null strings to actual null
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(extracted)) {
      cleaned[k] = v === "null" || v === "" || v == null ? null : v;
    }

    // Validate date format if present
    if (cleaned.expirationDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(cleaned.expirationDate)) {
        cleaned.expirationDate = null;
      }
    }

    return ok({ extracted: cleaned, docType });
  } catch (e: unknown) {
    if ((e as { status?: number })?.status === 429) {
      return err("RATE_LIMIT", "AI service is busy. Please enter dates manually.", 429);
    }
    return err("AI_ERROR", "Could not scan document. Please enter dates manually.", 503);
  }
}
