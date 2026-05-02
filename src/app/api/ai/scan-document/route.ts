import { getAuthUser, ok, err } from "@/lib/api/helpers";
import { getGroqClient } from "@/lib/ai/groq";
import { rateLimitDB } from "@/lib/rate-limit";
import { z } from "zod";
import { NextResponse } from "next/server";

const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const schema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/jpg", "image/png", "image/webp"]),
  docType: z.string().default("other"),
});

// Tell the AI to return dates in any format it sees — we'll normalize on our side
const EXTRACT_PROMPTS: Record<string, string> = {
  i20: `You are reading an I-20 document. Extract: program end date (look for "Program End Date" field), SEVIS ID (starts with N followed by 9 digits), student name. Return ONLY valid JSON: {"expirationDate":"date as shown on document","sevisId":"N...","studentName":"..."}. Use null for any field you cannot read clearly.`,
  ead: `You are reading an EAD (Employment Authorization Document) card. Extract: card expiration date (look for "Card Expires" field), card category (e.g. C3B or C3C), card number. Return ONLY valid JSON: {"expirationDate":"date as shown on card","category":"...","documentNumber":"..."}. Use null for any field you cannot read clearly.`,
  passport: `You are reading a passport. Extract: expiration date (look for "Date of Expiry" or "Expiry Date" or "Expires" field), passport number, nationality, full name. Return ONLY valid JSON: {"expirationDate":"date as shown","documentNumber":"...","nationality":"...","fullName":"..."}. Use null for any field you cannot read clearly.`,
  visa_stamp: `You are reading a US visa stamp. Extract: expiration date, visa category (F-1, B-2, H-1B etc), entries allowed. Return ONLY valid JSON: {"expirationDate":"date as shown","visaCategory":"...","entries":"..."}. Use null for any field you cannot read clearly.`,
  i94: `You are reading an I-94 arrival/departure record. Extract: admit-until date (could be D/S or a specific date), class of admission. Return ONLY valid JSON: {"expirationDate":"date or D/S as shown","classOfAdmission":"...","documentNumber":"..."}. Use null for any field you cannot read clearly.`,
  ssn_card: `You are reading a Social Security card. Extract the name and SSN if visible. Return ONLY valid JSON: {"holderName":"...","documentNumber":"XXX-XX-XXXX"}. Use null for any field you cannot read clearly.`,
  offer_letter: `You are reading an employment offer letter. Extract: start date, company name, job title. Return ONLY valid JSON: {"expirationDate":"start date as shown","holderName":"...","documentNumber":"..."}. Use null for any field you cannot read clearly.`,
};

const DEFAULT_PROMPT = `You are reading an official document or ID card. Look carefully for any expiration date, valid-through date, or document number/ID number, and the holder's name. Return ONLY valid JSON: {"expirationDate":"date exactly as printed on document","documentNumber":"...","holderName":"..."}. Use null for any field you cannot read clearly.`;

// Convert any common date format to YYYY-MM-DD
function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw || raw === "null") return null;

  const s = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const months: Record<string, string> = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
  const monthsFull: Record<string, string> = { january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",july:"07",august:"08",september:"09",october:"10",november:"11",december:"12" };

  // X/Y/YYYY — disambiguate MM/DD vs DD/MM by value: if first > 12 it's DD, if second > 12 it's MM first
  const slashDate = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDate) {
    const a = parseInt(slashDate[1], 10);
    const b = parseInt(slashDate[2], 10);
    if (a > 12) {
      // First number can't be a month — must be DD/MM/YYYY
      return `${slashDate[3]}-${slashDate[2].padStart(2, "0")}-${slashDate[1].padStart(2, "0")}`;
    } else if (b > 12) {
      // Second number can't be a month — must be MM/DD/YYYY
      return `${slashDate[3]}-${slashDate[1].padStart(2, "0")}-${slashDate[2].padStart(2, "0")}`;
    } else {
      // Ambiguous: assume MM/DD/YYYY (US docs like EAD use this)
      return `${slashDate[3]}-${slashDate[1].padStart(2, "0")}-${slashDate[2].padStart(2, "0")}`;
    }
  }

  // DD MMM YYYY  (e.g. "15 JAN 2029" or "15 Jan 2029") — common on passports
  const dMonthY = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dMonthY) {
    const m = months[dMonthY[2].toLowerCase()];
    if (m) return `${dMonthY[3]}-${m}-${dMonthY[1].padStart(2, "0")}`;
  }

  // DD MMMMMM YYYY  (e.g. "15 January 2029") — full month name
  const dFullMonthY = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dFullMonthY) {
    const m = monthsFull[dFullMonthY[2].toLowerCase()] ?? months[dFullMonthY[2].toLowerCase().slice(0, 3)];
    if (m) return `${dFullMonthY[3]}-${m}-${dFullMonthY[1].padStart(2, "0")}`;
  }

  // MMM DD, YYYY  (e.g. "Jan 15, 2029")
  const monthDY = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDY) {
    const m = months[monthDY[1].toLowerCase()];
    if (m) return `${monthDY[3]}-${m}-${monthDY[2].padStart(2, "0")}`;
  }

  // MMMMMM DD, YYYY  (e.g. "January 15, 2029")
  const fullMonthDY = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (fullMonthDY) {
    const m = monthsFull[fullMonthDY[1].toLowerCase()];
    if (m) return `${fullMonthDY[3]}-${m}-${fullMonthDY[2].padStart(2, "0")}`;
  }

  // YYYY/MM/DD
  const ymd = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  // MM-DD-YYYY
  const mdyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdyDash) return `${mdyDash[3]}-${mdyDash[1].padStart(2, "0")}-${mdyDash[2].padStart(2, "0")}`;

  return null; // unrecognized format
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

  try {
    const completion = await client.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: `${prompt}\n\nReturn ONLY the JSON object. No explanations, no markdown code blocks.` },
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
    } catch { /* malformed AI response */ }

    // Clean null strings + normalize all date fields
    const cleaned: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(extracted)) {
      const raw = v === "null" || v === "" || v == null ? null : String(v);
      if (k === "expirationDate" || k === "programEndDate") {
        cleaned[k] = normalizeDate(raw);
      } else {
        cleaned[k] = raw;
      }
    }

    return ok({ extracted: cleaned, docType });
  } catch (e: unknown) {
    const status = (e as { status?: number })?.status;
    const errMsg = (e as { message?: string })?.message ?? "unknown";
    console.error(`[scan-document] Vision model error: ${status} — ${errMsg}`);

    if (status === 429) return err("RATE_LIMIT", "AI service busy. Please enter dates manually.", 429);
    return NextResponse.json({
      success: false,
      error: { code: "AI_ERROR", message: "AI scan failed", detail: `${status ?? "?"}: ${errMsg}` }
    }, { status: 503 });
  }
}
