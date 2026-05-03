import { ok, err } from "@/lib/api/helpers";
import { getCached, setCache } from "@/lib/api/cache";

const BASE = "https://restcountries.com/v3.1";
const FIELDS = "name,flags,capital,currencies,timezones,region,cca2";
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface RestCountry {
  cca2: string;
  name: { common: string; official: string };
  flags: { emoji?: string; png?: string };
  capital?: string[];
  currencies?: Record<string, { name: string; symbol: string }>;
  timezones?: string[];
  region?: string;
}

function normalize(c: RestCountry) {
  const currencyEntry = Object.entries(c.currencies ?? {})[0];
  return {
    code: c.cca2,
    name: c.name.common,
    flag: c.flags?.emoji ?? "",
    capital: c.capital?.[0] ?? null,
    currency: currencyEntry
      ? { code: currencyEntry[0], name: currencyEntry[1].name, symbol: currencyEntry[1].symbol }
      : null,
    timezone: c.timezones?.[0] ?? null,
    region: c.region ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim();
  const code = searchParams.get("code")?.trim().toUpperCase();

  if (!name && !code) return err("VALIDATION", "Provide name or code");

  const cacheKey = `country:${code ?? name?.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return ok(JSON.parse(cached));

  try {
    const url = code
      ? `${BASE}/alpha/${encodeURIComponent(code)}?fields=${FIELDS}`
      : `${BASE}/name/${encodeURIComponent(name!)}?fields=${FIELDS}&fullText=false`;

    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return err("NOT_FOUND", "Country not found", 404);

    const raw = await res.json();
    const list: RestCountry[] = Array.isArray(raw) ? raw : [raw];
    if (!list.length) return err("NOT_FOUND", "Country not found", 404);

    const result = normalize(list[0]);
    setCache(cacheKey, JSON.stringify(result), CACHE_TTL);
    return ok(result);
  } catch {
    return err("API_ERROR", "Failed to fetch country data", 502);
  }
}
