"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, formatDistanceToNow } from "date-fns";

interface Article {
  title: string;
  summary: string | null;
  documentNumber: string;
  date: string;
  type: string;
  url: string;
  agency: string;
}

const TYPE_COLORS: Record<string, string> = {
  Rule: "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800",
  "Proposed Rule": "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-800",
  Notice: "bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-800",
  "Presidential Document": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
};

const TYPE_FILTERS = ["All", "Rule", "Proposed Rule", "Notice", "Presidential Document"];

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const [error, setError] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/immigration-news");
      const data = await res.json();
      if (data.success) {
        setArticles(data.data.articles ?? []);
        setFetchedAt(data.data.fetchedAt ?? null);
        setTotal(data.data.total ?? null);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = typeFilter === "All" ? articles : articles.filter(a => a.type === typeFilter);

  const typeCounts = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.type] = (acc[a.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Immigration News</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Latest Federal Register updates affecting F-1 students
            {total !== null && <span className="ml-1">· {total.toLocaleString()} total matching records</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {fetchedAt && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Updated {formatDistanceToNow(parseISO(fetchedAt), { addSuffix: true })}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            loading={refreshing}
            disabled={loading || refreshing}
          >
            ↻ Refresh
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Stay Informed</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
          These are official Federal Register documents from DHS/USCIS.
          <strong> &quot;Proposed Rules&quot;</strong> are not yet final — <strong>&quot;Rules&quot;</strong> are active law.
          Federal Register publishes on weekdays.
        </p>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(t => {
          const count = t === "All" ? articles.length : (typeCounts[t] ?? 0);
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border flex items-center gap-1.5 ${
                typeFilter === t
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : TYPE_COLORS[t]
                    ? `${TYPE_COLORS[t]} hover:opacity-80`
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {t}
              {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
                    <div className="h-5 w-24 bg-gray-100 dark:bg-gray-800 rounded-full" />
                  </div>
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="h-3 w-2/3 bg-gray-100 dark:bg-gray-800 rounded" />
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
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">The Federal Register API may be temporarily unavailable</p>
            <Button variant="outline" onClick={() => load(true)}>Try Again</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-2">📰</p>
            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">
              {typeFilter === "All" ? "No recent immigration news found" : `No "${typeFilter}" documents found`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              {typeFilter !== "All" ? "Try selecting a different type or" : "Check back later —"} the Federal Register publishes daily on weekdays
            </p>
            {typeFilter !== "All" && (
              <Button variant="outline" size="sm" onClick={() => setTypeFilter("All")}>Show all types</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <a
              key={article.documentNumber}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <Card className="hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${TYPE_COLORS[article.type] ?? "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700"}`}>
                          {article.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{article.agency}</span>
                      </div>
                      <h3 className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-snug mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {article.title}
                      </h3>
                      {article.summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{article.summary}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {format(parseISO(article.date), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 group-hover:underline">Read &rarr;</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {/* Resources */}
      <Card>
        <CardHeader><CardTitle className="text-base">Official Resources</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "SEVP — Study in the States", url: "https://studyinthestates.dhs.gov/", desc: "Official DHS site for international students & DSOs" },
            { name: "USCIS News & Updates", url: "https://www.uscis.gov/news", desc: "Policy updates and press releases" },
            { name: "ICE SEVP Updates", url: "https://www.ice.gov/sevis", desc: "SEVIS system updates and guidance" },
            { name: "Federal Register — Immigration", url: "https://www.federalregister.gov/topics/immigration", desc: "All immigration-related federal notices (primary source)" },
          ].map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors"
            >
              <div>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">{r.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{r.desc}</p>
              </div>
              <span className="text-indigo-600 dark:text-indigo-400 text-sm flex-shrink-0 ml-3">&rarr;</span>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
