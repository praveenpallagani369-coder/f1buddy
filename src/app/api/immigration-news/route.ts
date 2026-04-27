import { ok, err } from "@/lib/api/helpers";
import { getCached, setCache } from "@/lib/api/cache";

const FR_BASE = "https://www.federalregister.gov/api/v1";
const CACHE_TTL = 60 * 60 * 1000;

const IMMIGRATION_TERMS = [
  "F-1",
  "optional practical training",
  "STEM OPT",
  "international students",
  "SEVP",
  "student visa",
  "employment authorization",
];

interface FRDocument {
  title: string;
  abstract: string | null;
  document_number: string;
  publication_date: string;
  type: string;
  html_url: string;
  agencies: { name: string }[];
}

export async function GET() {
  const cacheKey = "immigration-news";
  const cached = getCached(cacheKey);

  if (cached) {
    return ok(JSON.parse(cached));
  }

  try {
    const query = IMMIGRATION_TERMS.map((t) => `"${t}"`).join(" OR ");
    const params = new URLSearchParams({
      "conditions[term]": query,
      "conditions[agencies][]": "homeland-security-department",
      per_page: "15",
      order: "newest",
      "fields[]": "title,abstract,document_number,publication_date,type,html_url,agencies",
    });

    const res = await fetch(`${FR_BASE}/documents.json?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return err("API_ERROR", "Federal Register API unavailable", 502);
    const data = await res.json();

    const articles = (data.results ?? []).map((doc: FRDocument) => ({
      title: doc.title,
      summary: doc.abstract?.slice(0, 300) ?? null,
      documentNumber: doc.document_number,
      date: doc.publication_date,
      type: doc.type,
      url: doc.html_url,
      agency: doc.agencies?.[0]?.name ?? "DHS",
    }));

    setCache(cacheKey, JSON.stringify(articles), CACHE_TTL);
    return ok(articles);
  } catch {
    return err("API_ERROR", "Failed to fetch immigration news", 502);
  }
}
