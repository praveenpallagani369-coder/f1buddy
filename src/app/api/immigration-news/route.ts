import { ok, err } from "@/lib/api/helpers";

const FR_BASE = "https://www.federalregister.gov/api/v1";

const SEARCH_TERMS = [
  "optional practical training",
  "F-1 student visa",
  "SEVIS",
  "employment authorization document",
  "student work authorization",
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
  try {
    const params = new URLSearchParams();
    params.set("conditions[term]", SEARCH_TERMS.join(" OR "));
    params.set("per_page", "20");
    params.set("order", "newest");
    for (const field of ["title", "abstract", "document_number", "publication_date", "type", "html_url", "agencies"]) {
      params.append("fields[]", field);
    }

    const res = await fetch(`${FR_BASE}/documents.json?${params}`, { cache: "no-store" });

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

    return ok({ articles, fetchedAt: new Date().toISOString(), total: data.count ?? articles.length });
  } catch {
    return err("API_ERROR", "Failed to fetch immigration news", 502);
  }
}
