import { ok } from "@/lib/api/helpers";

const FR_BASE = "https://www.federalregister.gov/api/v1";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  date: string;
  type: string;
  url: string;
  source: string;
}

// ── RSS parser (no external lib needed) ──────────────────────────────────────
function extractRSSField(xml: string, field: string): string {
  const regex = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

function parseRSS(xml: string, source: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractRSSField(block, "title");
    const url = extractRSSField(block, "link");
    const summary = extractRSSField(block, "description");
    const pubDate = extractRSSField(block, "pubDate");
    if (!title || !url) continue;
    let date = new Date().toISOString().split("T")[0];
    try { date = new Date(pubDate).toISOString().split("T")[0]; } catch { /* keep default */ }
    items.push({ id: url, title, summary: summary ? summary.slice(0, 350) : null, date, type: "Official Update", url, source });
  }
  return items;
}

// ── Source 1: USCIS news RSS (always on, no API key) ────────────────────────
async function fetchUSCIS(): Promise<NewsArticle[]> {
  try {
    const res = await fetch("https://www.uscis.gov/rss/uscis-news.xml", { cache: "no-store" });
    if (!res.ok) return [];
    return parseRSS(await res.text(), "USCIS");
  } catch { return []; }
}

// ── Source 2: USCIS Alerts RSS ───────────────────────────────────────────────
async function fetchUSCISAlerts(): Promise<NewsArticle[]> {
  try {
    const res = await fetch("https://www.uscis.gov/rss/uscis-alerts.xml", { cache: "no-store" });
    if (!res.ok) return [];
    return parseRSS(await res.text(), "USCIS Alert");
  } catch { return []; }
}

// ── Source 3: Federal Register (regulatory docs, keep as context) ────────────
interface FRDoc { title: string; abstract: string | null; document_number: string; publication_date: string; type: string; html_url: string; agencies: { name: string }[]; }
async function fetchFederalRegister(): Promise<NewsArticle[]> {
  try {
    const params = new URLSearchParams();
    params.set("conditions[term]", "optional practical training OR F-1 student OR SEVIS OR employment authorization");
    params.set("per_page", "8");
    params.set("order", "newest");
    for (const f of ["title", "abstract", "document_number", "publication_date", "type", "html_url", "agencies"]) params.append("fields[]", f);
    const res = await fetch(`${FR_BASE}/documents.json?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results ?? []).map((doc: FRDoc): NewsArticle => ({
      id: doc.document_number,
      title: doc.title,
      summary: doc.abstract?.slice(0, 350) ?? null,
      date: doc.publication_date,
      type: doc.type,
      url: doc.html_url,
      source: "Federal Register",
    }));
  } catch { return []; }
}

// ── Source 4: GNews API (optional — set GNEWS_API_KEY in env) ────────────────
interface GNewsArticle { title: string; description: string | null; url: string; publishedAt: string; source: { name: string }; }
async function fetchGNews(): Promise<NewsArticle[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];
  try {
    const params = new URLSearchParams({
      q: '"F-1 visa" OR "OPT" OR "SEVIS" OR "international student" OR "STEM OPT" OR "work authorization"',
      lang: "en",
      country: "us",
      max: "10",
      sortby: "publishedAt",
      token: apiKey,
    });
    const res = await fetch(`https://gnews.io/api/v4/search?${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles ?? []).map((a: GNewsArticle): NewsArticle => ({
      id: a.url,
      title: a.title,
      summary: a.description?.slice(0, 350) ?? null,
      date: a.publishedAt.split("T")[0],
      type: "News Article",
      url: a.url,
      source: a.source.name,
    }));
  } catch { return []; }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET() {
  const [uscis, uscisAlerts, fr, gnews] = await Promise.all([
    fetchUSCIS(),
    fetchUSCISAlerts(),
    fetchFederalRegister(),
    fetchGNews(),
  ]);

  const seen = new Set<string>();
  const articles = [...uscis, ...uscisAlerts, ...gnews, ...fr]
    .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 35);

  return ok({
    articles,
    fetchedAt: new Date().toISOString(),
    hasGNews: !!process.env.GNEWS_API_KEY,
    sources: { uscis: uscis.length + uscisAlerts.length, fr: fr.length, gnews: gnews.length },
  });
}
