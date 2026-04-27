import { ok, err } from "@/lib/api/helpers";
import { getCached, setCache } from "@/lib/api/cache";

const FRANKFURTER_BASE = "https://api.frankfurter.app";
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "USD").toUpperCase();
  const to = (searchParams.get("to") ?? "INR").toUpperCase();
  const amount = Math.min(Math.max(parseFloat(searchParams.get("amount") ?? "1") || 1, 0.01), 1_000_000);

  const cacheKey = `currency:${from}:${to}`;
  const cached = getCached(cacheKey);

  let rate: number;

  if (cached) {
    rate = parseFloat(cached);
  } else {
    try {
      const res = await fetch(`${FRANKFURTER_BASE}/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        next: { revalidate: 1800 },
      });
      if (!res.ok) return err("API_ERROR", "Currency API unavailable", 502);
      const data = await res.json();
      rate = data.rates?.[to];
      if (!rate) return err("NOT_FOUND", `No rate found for ${from} to ${to}`);
      setCache(cacheKey, String(rate), CACHE_TTL);
    } catch {
      return err("API_ERROR", "Failed to fetch exchange rates", 502);
    }
  }

  return ok({
    from,
    to,
    amount,
    rate,
    converted: Math.round(amount * rate * 100) / 100,
    lastUpdated: new Date().toISOString(),
  });
}
