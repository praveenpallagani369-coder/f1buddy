"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, formatDistanceToNow } from "date-fns";

interface Article {
  id: string;
  title: string;
  summary: string | null;
  date: string;
  type: string;
  url: string;
  source: string;
}

interface NewsData {
  articles: Article[];
  fetchedAt: string;
  hasGNews: boolean;
  sources: { uscis: number; fr: number; gnews: number };
}

// Source → badge style
function sourceBadge(source: string) {
  if (source === "USCIS" || source === "USCIS Alert")
    return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700";
  if (source === "Federal Register")
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700";
  return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700";
}

// Type badge (Rule / Proposed Rule / Notice / etc.)
const TYPE_STYLES: Record<string, string> = {
  "Rule": "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  "Proposed Rule": "bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
  "Notice": "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  "Official Update": "bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
  "News Article": "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
};

function sourceGroup(source: string) {
  if (source === "USCIS" || source === "USCIS Alert") return "USCIS";
  if (source === "Federal Register") return "Federal Register";
  return "News";
}

const FILTER_OPTIONS = ["All", "USCIS", "News", "Federal Register"];

export default function NewsPage() {
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/immigration-news");
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(true);
    } catch { setError(true); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const articles = data?.articles ?? [];
  const filtered = filter === "All" ? articles : articles.filter(a => sourceGroup(a.source) === filter);

  const counts: Record<string, number> = { All: articles.length };
  articles.forEach(a => { const g = sourceGroup(a.source); counts[g] = (counts[g] ?? 0) + 1; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Immigration News</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Live updates from USCIS, Federal Register
            {data?.hasGNews && " & news outlets"}
            {data?.fetchedAt && (
              <span className="ml-2 text-gray-400">· fetched {formatDistanceToNow(parseISO(data.fetchedAt), { addSuffix: true })}</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} loading={refreshing} disabled={loading || refreshing}>
          ↻ Refresh
        </Button>
      </div>

      {/* Source summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{data.sources.uscis}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">USCIS Updates</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{data.sources.gnews}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              {data.hasGNews ? "News Articles" : "News (add key →)"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{data.sources.fr}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Federal Register</p>
          </div>
        </div>
      )}

      {/* GNews tip */}
      {data && !data.hasGNews && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">📰</span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Get news articles from major outlets</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Add a free <strong>GNews API key</strong> (gnews.io — 100 req/day free) as <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">GNEWS_API_KEY</code> in your Vercel environment variables to pull live F-1 news from major publications.
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
        <strong>Stay Informed:</strong> USCIS updates are official. Federal Register &quot;Rules&quot; are active law — &quot;Proposed Rules&quot; are not yet final. News articles are from third-party outlets.
      </div>

      {/* Source filter */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
              filter === f
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}>
            {f === "USCIS" && "🏛️ "}
            {f === "News" && "📰 "}
            {f === "Federal Register" && "📋 "}
            {f}
            {counts[f] !== undefined && <span className="opacity-60">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2"><div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full" /><div className="h-5 w-20 bg-gray-100 dark:bg-gray-800 rounded-full" /></div>
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
                <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-2">⚠️</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">Could not load news</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">USCIS or Federal Register may be temporarily unavailable</p>
            <Button variant="outline" onClick={() => load(true)}>Try Again</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">No articles in this category</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilter("All")}>Show all</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <a key={article.id} href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
              <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Source badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${sourceBadge(article.source)}`}>
                          {article.source}
                        </span>
                        {/* Type badge (only if different from source) */}
                        {article.type !== "Official Update" && (
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${TYPE_STYLES[article.type] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {article.type}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-snug mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{article.summary}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs text-gray-400 whitespace-nowrap">{format(parseISO(article.date), "MMM d, yyyy")}</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 group-hover:underline">Read →</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {/* Official resources */}
      <Card>
        <CardHeader><CardTitle className="text-base">Official Resources</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "USCIS News", url: "https://www.uscis.gov/news", desc: "Official policy updates and press releases" },
            { name: "Study in the States (DHS/SEVP)", url: "https://studyinthestates.dhs.gov/", desc: "DHS resource hub for international students & DSOs" },
            { name: "ICE SEVIS", url: "https://www.ice.gov/sevis", desc: "SEVIS system updates and F-1 guidance" },
            { name: "Federal Register — Immigration", url: "https://www.federalregister.gov/topics/immigration", desc: "All immigration-related federal regulatory notices" },
          ].map(r => (
            <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{r.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{r.desc}</p>
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 text-sm flex-shrink-0 ml-3">→</span>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
