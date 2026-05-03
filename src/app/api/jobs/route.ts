import { ok, err } from "@/lib/api/helpers";
import { getCached, setCache } from "@/lib/api/cache";

const CACHE_TTL = 30 * 60 * 1000; // 30 min

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  level: string;
  category: string;
  postedAt: string;
  url: string;
  source: "muse" | "adzuna";
  salaryMin?: number;
  salaryMax?: number;
}

// The Muse — no auth required
async function fetchMuse(keywords: string, level: string, page: number): Promise<Job[]> {
  const params = new URLSearchParams({ page: String(page), descending: "true" });

  // Map level to The Muse's expected values
  const levelMap: Record<string, string> = {
    entry: "Entry Level",
    mid: "Mid Level",
    senior: "Senior Level",
    internship: "Internship",
  };
  if (level && levelMap[level]) params.set("level", levelMap[level]);

  // Use keyword as category if it matches a known Muse category, else search by name
  const museCategories = [
    "Software Engineer", "Data and Analytics", "Engineering", "IT",
    "Product and Project Management", "Marketing and PR", "Finance",
    "Science and Research", "Design and UX", "Business and Strategy",
    "Legal", "HR and Recruiting",
  ];
  const matchedCategory = museCategories.find(
    (c) => c.toLowerCase().includes(keywords.toLowerCase()) || keywords.toLowerCase().includes(c.toLowerCase().split(" ")[0])
  );
  if (matchedCategory) params.set("category", matchedCategory);

  const res = await fetch(`https://www.themuse.com/api/public/jobs?${params}`, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results ?? []).map((j: {
    id: number;
    name: string;
    company: { name: string };
    locations: { name: string }[];
    levels: { name: string }[];
    categories: { name: string }[];
    publication_date: string;
    refs: { landing_page: string };
  }) => ({
    id: `muse-${j.id}`,
    title: j.name,
    company: j.company?.name ?? "Unknown",
    location: j.locations?.[0]?.name ?? "Remote / Various",
    level: j.levels?.[0]?.name ?? "Not specified",
    category: j.categories?.[0]?.name ?? "General",
    postedAt: j.publication_date,
    url: j.refs?.landing_page ?? "",
    source: "muse" as const,
  }));
}

// Adzuna — free API key (sign up at developer.adzuna.com)
async function fetchAdzuna(keywords: string, location: string, page: number): Promise<Job[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "20",
    what: keywords || "software engineer",
    sort_by: "date",
    content_type: "application/json",
  });
  if (location) params.set("where", location);

  const res = await fetch(
    `https://api.adzuna.com/v1/api/jobs/us/search/${page}?${params}`,
    { next: { revalidate: 1800 }, signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results ?? []).map((j: {
    id: string;
    title: string;
    company: { display_name: string };
    location: { display_name: string };
    category: { label: string };
    created: string;
    redirect_url: string;
    salary_min?: number;
    salary_max?: number;
  }) => ({
    id: `adzuna-${j.id}`,
    title: j.title,
    company: j.company?.display_name ?? "Unknown",
    location: j.location?.display_name ?? "US",
    level: "Various",
    category: j.category?.label ?? "General",
    postedAt: j.created,
    url: j.redirect_url,
    source: "adzuna" as const,
    salaryMin: j.salary_min,
    salaryMax: j.salary_max,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("keywords") ?? "software engineer";
  const level = searchParams.get("level") ?? "";
  const location = searchParams.get("location") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));

  const cacheKey = `jobs:${keywords}:${level}:${location}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return ok(JSON.parse(cached));

  try {
    const [museJobs, adzunaJobs] = await Promise.allSettled([
      fetchMuse(keywords, level, page),
      fetchAdzuna(keywords, location, page),
    ]);

    const jobs: Job[] = [
      ...(museJobs.status === "fulfilled" ? museJobs.value : []),
      ...(adzunaJobs.status === "fulfilled" ? adzunaJobs.value : []),
    ];

    const hasAdzuna = !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
    const result = { jobs, total: jobs.length, page, hasAdzuna };

    setCache(cacheKey, JSON.stringify(result), CACHE_TTL);
    return ok(result);
  } catch {
    return err("API_ERROR", "Failed to fetch jobs", 502);
  }
}
