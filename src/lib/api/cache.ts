const cache = new Map<string, { value: string; expiresAt: number }>();

export function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key: string, value: string, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    cache.forEach((entry, key) => {
      if (now > entry.expiresAt) cache.delete(key);
    });
  }, 300_000);
}
