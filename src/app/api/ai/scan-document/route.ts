import { getAuthUser, ok, err } from "@/lib/api/helpers";
import { getGroqClient } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  docType: z.string().default("other"),
});

const EXTRACT_PROMPTS: Record<string, string> = {
  i20: `You are reading an I-20 document. Extract: program end date, SEVIS ID (starts with N followed by digits), student name. Return ONLY valid JSON: {"expirationDate":"YYYY-MM-DD","sevisId":"N...","studentName":"..."}. Use null for any field you cannot read.`,
  ead: `You are reading an EAD (Employment Authorization Document) card. Extract: card expiration date, card category (e.g. C3B or C3C), card number. Return ONLY valid JSON: {"expirationDate":"YYYY-MM-DD","category":"...","documentNumber":"..."}. Use null for any field you cannot read.`,
  passport: `You are reading a passport. Extract: expiration date (from the "Date of Expiry" or "Expiry Date" field), passport number, nationality, full name. Return ONLY valid JSON: {"expirationDate":"YYYY-MM-DD","documentNumber":"...","nationality":"...","fullName":"..."}. Use null for any field you cannot read.`,
  visa_stamp: `You are reading a US visa stamp. Extract: expiration date (annotated expiry), visa category (F-1, B-2, etc), entries. Return ONLY valid JSON: {"expirationDate":"YYYY-MM-DD","visaCategory":"...","entries":"..."}. Use null for any field you cannot read.`,
  i94: `You are reading an I-94 arrival/departure record. Extract: admit-until date, class of admission. Return ONLY valid JSON: {"expirationDate":"YYYY-MM-DD or D/S","classOfAdmission":"...","documentNumber":"..."}. Use null for any field you cannot read.`,
};

const DEFAULT_PROMPT = `You are reading an official document. Extract any expiration date, document number or ID, and holder name if visible. Return ONLY valid JSON: {"expirationDate":"YYYY-MM-DD","documentNumber":"...","holderName":"..."}. Use null for any field you cannot read.`;

export async function POST(request: Request) {
  // Check GROQ key exists before doing anything
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: { code: "NO_AI_KEY", message: "AI scanning not configured" } }, { status: 503 });
  }

  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return err("UNAUTHORIZED", "Sign in required", 401);

  const { allowed } = await rateLimitDB(supabase, `ai-scan:${user.id}`, 15, 60);
  if (!allowed) return err("RATE_LIMIT", "AI scanning limit reached. Please wait a moment.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("VALIDATION", "Invalid request body — image may be too large");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", "imageBase64 and mimeType are required");

  const { imageBase64, mimeType, docType } = parsed.data;

  // Client resizes to max 1200px before sending, so this should be well under 2MB
  if (imageBase64.length > 5_000_000) {
    return err("TOO_LARGE", "Image is too large for AI scanning (max ~3.5MB)", 413);
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
            { type: "text" as const, text: `${prompt}\n\nIMPORTANT: Return ONLY the JSON object. No explanations, no markdown, no extra text.` },
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
    } catch { /* malformed AI response — return empty */ }

    // Clean up "null" strings and empty values
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(extracted)) {
      cleaned[k] = v === "null" || v === "" || v == null ? null : String(v);
    }

    // Validate date format — reject anything that isn't YYYY-MM-DD
    if (cleaned.expirationDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(cleaned.expirationDate)) {
        cleaned.expirationDate = null;
      }
    }
    if (cleaned.programEndDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(cleaned.programEndDate)) {
        cleaned.programEndDate = null;
      }
    }

    return ok({ extracted: cleaned, docType });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    if (status === 429) return err("RATE_LIMIT", "AI service busy. Please enter dates manually.", 429);
    if (status === 400) return err("AI_ERROR", "AI could not read this image. Please enter dates manually.", 422);
    return err("AI_ERROR", "AI scan failed. Please enter dates manually.", 503);
  }
}
