"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FeedbackForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<"bug" | "idea" | "general">("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim(), category }),
    });
    const json = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok || !json?.success) {
      setError(json?.error?.message ?? "Something went wrong");
      return;
    }
    setMessage("");
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Send feedback</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
          Bugs, ideas, or anything confusing — we read every message.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-sm"
            >
              <option value="general">General</option>
              <option value="idea">Feature idea</option>
              <option value="bug">Bug / problem</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
            <textarea
              required
              minLength={3}
              maxLength={8000}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would make VisaBuddy better for you?"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm resize-y min-h-[120px]"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {done && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Thanks — your feedback was saved.</p>
          )}
          <Button type="submit" loading={loading}>
            Submit feedback
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
