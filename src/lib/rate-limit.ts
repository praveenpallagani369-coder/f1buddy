import type { SupabaseClient } from "@supabase/supabase-js";

const rateMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export async function rateLimitDB(
  supabase: SupabaseClient,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return { allowed: data === true, remaining: data ? maxRequests - 1 : 0 };
  } catch {
    return rateLimit(key, maxRequests, windowSeconds * 1000);
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rateMap.forEach((entry, key) => {
      if (now > entry.resetAt) rateMap.delete(key);
    });
  }, 60_000);
}
