"use client";
import { useState } from "react";

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function seed() {
    setLoading(true);
    const res = await fetch("/api/seed", { method: "POST" });
    const json = await res.json();
    if (json.success) {
      setDone(true);
      setTimeout(() => window.location.reload(), 800);
    }
    setLoading(false);
  }

  if (done) return (
    <div className="fixed bottom-4 right-4 bg-emerald-600 text-gray-900 text-xs px-4 py-2 rounded-full shadow-lg z-50">
      ✓ Demo data loaded — refreshing...
    </div>
  );

  return (
    <button
      onClick={seed}
      disabled={loading}
      className="fixed bottom-4 right-4 bg-gray-100 border border-gray-200 text-gray-600 hover:bg-slate-700 text-xs px-4 py-2 rounded-full shadow-lg z-50 transition-colors"
    >
      {loading ? "Loading demo data..." : "🌱 Load Demo Data"}
    </button>
  );
}
