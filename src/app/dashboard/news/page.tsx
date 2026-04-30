"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

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
  "Presidential Document": "bg-purple-100 text-purple-700 border-purple-200",
};

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/immigration-news");
        const data = await res.json();
        if (data.success) setArticles(data.data);
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Immigration News</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Latest Federal Register updates affecting international students</p>
      </div>

      {/* Alert banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800">
        <p className="text-sm text-amber-700 font-medium">Stay Informed</p>
        <p className="text-xs text-amber-600/80 mt-0.5">
          Immigration rules can change. These are official Federal Register documents from DHS/USCIS.
          &quot;Proposed Rules&quot; are not yet final — &quot;Rules&quot; are active law.
        </p>
      </div>

      {/* Document type legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <span key={type} className={`px-2.5 py-1 rounded-full text-xs border ${colors}`}>
            {type}
          </span>
        ))}
      </div>

      {/* Articles */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Fetching latest immigration news...</p>
        </div>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-3xl mb-2">📰</p>
            <p className="text-gray-500 dark:text-gray-400">No recent immigration news found</p>
            <p className="text-xs text-gray-500 mt-1">Check back later — the Federal Register publishes daily on weekdays</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <a
              key={article.documentNumber}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:border-slate-600 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <Badge
                          className={`text-xs border ${TYPE_COLORS[article.type] ?? "bg-gray-100 text-gray-500 border-gray-200 dark:border-gray-700"}`}
                        >
                          {article.type}
                        </Badge>
                        <span className="text-xs text-gray-500">{article.agency}</span>
                      </div>
                      <h3 className="text-sm text-gray-900 font-medium leading-snug mb-1">{article.title}</h3>
                      {article.summary && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{article.summary}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{format(parseISO(article.date), "MMM d, yyyy")}</p>
                      <p className="text-xs text-indigo-600 mt-1">Read &rarr;</p>
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
        <CardHeader><CardTitle className="text-base">More Resources</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "SEVP Portal", url: "https://studyinthestates.dhs.gov/", desc: "Official DHS site for international students" },
            { name: "USCIS News", url: "https://www.uscis.gov/news", desc: "Policy updates and announcements" },
            { name: "ICE SEVP Updates", url: "https://www.ice.gov/sevis", desc: "SEVIS system updates and guidance" },
            { name: "Federal Register (Immigration)", url: "https://www.federalregister.gov/topics/immigration", desc: "All immigration-related federal notices" },
          ].map((r) => (
            <a
              key={r.name}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border border-gray-200 hover:border-indigo-200 transition-colors"
            >
              <div>
                <p className="text-sm text-gray-900 font-medium">{r.name}</p>
                <p className="text-xs text-gray-500">{r.desc}</p>
              </div>
              <span className="text-indigo-600 text-sm">&rarr;</span>
            </a>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
