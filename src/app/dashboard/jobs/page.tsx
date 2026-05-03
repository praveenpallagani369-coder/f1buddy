"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, Building2, MapPin, Briefcase } from "lucide-react";
import type { Job } from "@/app/api/jobs/route";

const CATEGORIES = [
  "software engineer", "data science", "engineering", "product management",
  "marketing", "finance", "design", "business", "it support", "research",
];

const LEVELS = [
  { value: "", label: "All Levels" },
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" },
  { value: "internship", label: "Internship" },
];

function timeAgo(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function JobsPage() {
  const [keywords, setKeywords] = useState("software engineer");
  const [level, setLevel] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasAdzuna, setHasAdzuna] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (kw: string, lv: string, loc: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ keywords: kw, level: lv, location: loc, page: String(pg) });
      const res = await fetch(`/api/jobs?${params}`);
      const json = await res.json();
      if (json.success) {
        setJobs(pg === 1 ? json.data.jobs : (prev: Job[]) => [...prev, ...json.data.jobs]);
        setHasAdzuna(json.data.hasAdzuna);
        setSearched(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount with defaults
  useEffect(() => { search(keywords, level, location, 1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    setPage(1);
    search(keywords, level, location, 1);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    search(keywords, level, location, next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">OPT Job Search</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Find employers open to OPT/CPT candidates. For STEM OPT, your employer must be enrolled in E-Verify.
        </p>
      </div>

      {/* OPT tips banner */}
      <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-300 space-y-1">
        <p className="font-semibold">Before you apply — OPT reminders</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>You can work full-time only after your EAD start date. Do not start before the card arrives.</li>
          <li>STEM OPT extension requires your employer to be enrolled in <strong>E-Verify</strong>. Confirm before accepting an offer.</li>
          <li>Report every new employer to your DSO within <strong>10 days</strong> of starting work.</li>
          <li>Job must be directly related to your degree field for OPT eligibility.</li>
        </ul>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="software engineer, data scientist, marketing..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Select value={level} onChange={(e) => setLevel(e.target.value)} className="sm:w-44">
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
            <Input
              className="sm:w-44"
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={loading} className="whitespace-nowrap">
              {loading ? "Searching..." : "Search Jobs"}
            </Button>
          </div>

          {/* Quick category chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setKeywords(cat); setPage(1); search(cat, level, location, 1); }}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  keywords === cat
                    ? "bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && !searched ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 && searched ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-gray-100">No jobs found</p>
            <p className="text-sm text-gray-500 mt-1">Try different keywords or remove filters</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {jobs.length} jobs found
              {hasAdzuna
                ? " — sourced from The Muse + Adzuna"
                : " — sourced from The Muse"}
            </p>
            {!hasAdzuna && (
              <p className="text-xs text-gray-400">
                Add Adzuna API key to <code className="font-mono">.env.local</code> for more results
              </p>
            )}
          </div>

          <div className="space-y-3">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{job.title}</p>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {job.source === "muse" ? "The Muse" : "Adzuna"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {job.location}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.level && job.level !== "Various" && (
                          <Badge variant="info" className="text-xs">{job.level}</Badge>
                        )}
                        {job.category && (
                          <Badge variant="outline" className="text-xs">{job.category}</Badge>
                        )}
                        {job.salaryMin && job.salaryMax && (
                          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200">
                            ${Math.round(job.salaryMin / 1000)}k–${Math.round(job.salaryMax / 1000)}k
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-xs text-gray-400">{timeAgo(job.postedAt)}</p>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                      >
                        Apply <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {jobs.length >= 20 && (
            <div className="text-center">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? "Loading..." : "Load more jobs"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
