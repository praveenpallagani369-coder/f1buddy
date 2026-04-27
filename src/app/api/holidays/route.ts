import { ok, err } from "@/lib/api/helpers";
import { getCached, setCache } from "@/lib/api/cache";

const NAGER_BASE = "https://date.nager.at/api/v3";
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface Holiday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  types: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const country = (searchParams.get("country") ?? "US").toUpperCase().slice(0, 2);

  if (year < 2000 || year > 2100) return err("VALIDATION", "Year must be between 2000 and 2100");

  const cacheKey = `holidays:${country}:${year}`;
  const cached = getCached(cacheKey);

  if (cached) {
    return ok(JSON.parse(cached));
  }

  try {
    const res = await fetch(`${NAGER_BASE}/PublicHolidays/${year}/${encodeURIComponent(country)}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return err("API_ERROR", "Holiday API unavailable", 502);
    const holidays: Holiday[] = await res.json();

    const formatted = holidays.map((h) => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      types: h.types,
    }));

    setCache(cacheKey, JSON.stringify(formatted), CACHE_TTL);
    return ok(formatted);
  } catch {
    return err("API_ERROR", "Failed to fetch holidays", 502);
  }
}
