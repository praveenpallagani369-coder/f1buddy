import { getAuthUser, ok, err } from "@/lib/api/helpers";
import { getGroqClient } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";
import { NextResponse } from "next/server";

const VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

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

async function tryVisionModel(client: ReturnType<typeof getGroqClient>, model: string, prompt: string, dataUrl: string) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: `${prompt}\n\nReturn ONLY the JSON object. No explanations, no markdown.` },
          { type: "image_url" as const, image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 300,
  });
  return completion.choices[0]?.message?.content ?? "{}";
}

export async function POST(request: Request) {
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

  if (imageBase64.length > 5_000_000) {
    return err("TOO_LARGE", "Image is too large for AI scanning", 413);
  }

  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  const prompt = EXTRACT_PROMPTS[docType] ?? DEFAULT_PROMPT;
  const client = getGroqClient();

  let lastError: unknown;
  for (const model of VISION_MODELS) {
    try {
      const text = await tryVisionModel(client, model, prompt, dataUrl);

      let extracted: Record<string, string | null> = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
      } catch { /* malformed AI response */ }

      const cleaned: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(extracted)) {
        cleaned[k] = v === "null" || v === "" || v == null ? null : String(v);
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (cleaned.expirationDate && !dateRegex.test(cleaned.expirationDate)) cleaned.expirationDate = null;
      if (cleaned.programEndDate && !dateRegex.test(cleaned.programEndDate)) cleaned.programEndDate = null;

      return ok({ extracted: cleaned, docType, model });
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { status?: number })?.status;
      // 429 = rate limited on this model, try next
      // 404 = model not found, try next
      // 400 = bad request, try next model
      if (status === 503 || status === 500) break; // server error, no point retrying
    }
  }

  // All models failed — log for debugging
  const errStatus = (lastError as { status?: number })?.status;
  const errMsg = (lastError as { message?: string })?.message ?? "unknown";
  console.error(`[scan-document] All vision models failed. Last error: ${errStatus} — ${errMsg}`);

  if (errStatus === 429) return err("RATE_LIMIT", "AI service busy. Please enter dates manually.", 429);
  return NextResponse.json({
    success: false,
    error: { code: "AI_ERROR", message: "AI scan failed", detail: `${errStatus ?? "?"}: ${errMsg}` }
  }, { status: 503 });
}
