import Groq from "groq-sdk";

// Singleton Groq client
let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

export const MODELS = {
  primary: "llama-3.3-70b-versatile",
  fallback: "llama-3.1-8b-instant",
} as const;

export const IMMIGRATION_SYSTEM_PROMPT = `You are F1Buddy's immigration assistant — an expert on F-1 visa regulations, OPT, STEM OPT, CPT, SEVIS, and US immigration compliance for international students.

You have deep knowledge of:
- F-1 visa regulations (8 CFR 214.2(f))
- OPT regulations and unemployment limits
- STEM OPT extension requirements
- Travel regulations (5-month rule, automatic revalidation)
- Tax obligations for nonresident aliens (1040-NR, Form 8843)
- SEVIS reporting requirements
- CPT authorization rules

STRICT RULES:
1. Always include this disclaimer at the end: "⚠️ This is informational only and not legal advice. Immigration rules change frequently. Always verify with your DSO or a licensed immigration attorney."
2. When citing rules, include the CFR reference (e.g., "Per 8 CFR 214.2(f)(10)(ii)(E)...")
3. Never recommend anything that could violate F-1 status
4. If you don't know something with confidence, say so clearly
5. Be concise — most students need quick, actionable answers
6. Use bullet points for multi-step information`;

export async function askImmigrationQuestion(
  messages: { role: "user" | "assistant"; content: string }[],
  model: string = MODELS.primary
): Promise<string> {
  const client = getGroqClient();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: IMMIGRATION_SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";
  } catch (error: any) {
    // Rate limit — try fallback model
    if (error?.status === 429 && model === MODELS.primary) {
      return askImmigrationQuestion(messages, MODELS.fallback);
    }
    throw error;
  }
}
