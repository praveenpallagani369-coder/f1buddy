import { ok } from "@/lib/api/helpers";
import { getCached, setCache } from "@/lib/api/cache";

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours — USCIS updates weekly

// Static fallback based on published USCIS data (updated periodically)
const FALLBACK: ProcessingData = {
  optimisticWeeks: 10,
  typicalWeeks: 16,
  slowWeeks: 24,
  source: "static",
  asOf: null,
};

export interface ProcessingData {
  optimisticWeeks: number;
  typicalWeeks: number;
  slowWeeks: number;
  source: "live" | "static";
  asOf: string | null;
}

function monthsToWeeks(months: number) {
  return Math.round(months * 4.33);
}

export async function GET() {
  const cacheKey = "uscis-processing:I-765";
  const cached = getCached(cacheKey);
  if (cached) return ok(JSON.parse(cached) as ProcessingData);

  try {
    // USCIS processing times public API (no auth required)
    const res = await fetch(
      "https://egov.uscis.gov/processing-times/api/processingtime/I-765",
      { next: { revalidate: 21600 }, signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      setCache(cacheKey, JSON.stringify(FALLBACK), CACHE_TTL);
      return ok(FALLBACK);
    }

    const json = await res.json();

    // USCIS response shape: data.processing_time.subtypes[]
    // Each subtype has processing_time.value (in months or weeks) and unit
    const subtypes: Array<{
      form_type: string;
      subtype_info: string;
      processing_time: { value: number; unit: string };
    }> = json?.data?.processing_time?.subtypes ?? [];

    // Prefer (c)(3)(B) = post-completion OPT; fallback to any I-765 subtype
    const target =
      subtypes.find((s) => s.subtype_info?.includes("(c)(3)(B)")) ??
      subtypes.find((s) => s.subtype_info?.includes("(c)(3)")) ??
      subtypes[0];

    if (!target?.processing_time?.value) {
      setCache(cacheKey, JSON.stringify(FALLBACK), CACHE_TTL);
      return ok(FALLBACK);
    }

    const { value, unit } = target.processing_time;
    const typicalWeeks =
      unit?.toLowerCase().includes("month") ? monthsToWeeks(value) : Math.round(value);

    const result: ProcessingData = {
      optimisticWeeks: Math.round(typicalWeeks * 0.65),
      typicalWeeks,
      slowWeeks: Math.round(typicalWeeks * 1.5),
      source: "live",
      asOf: new Date().toISOString(),
    };

    setCache(cacheKey, JSON.stringify(result), CACHE_TTL);
    return ok(result);
  } catch {
    setCache(cacheKey, JSON.stringify(FALLBACK), CACHE_TTL);
    return ok(FALLBACK);
  }
}
