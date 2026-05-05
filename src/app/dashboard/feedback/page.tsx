import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { loadDashboardFeedback } from "@/lib/feedback/load-feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("users")
    .select("email, role, name")
    .eq("id", user.id)
    .single();

  const email = profile?.email ?? user.email ?? "";
  const role = profile?.role ?? "student";

  const { items, canViewAll } = await loadDashboardFeedback(user.id, email, role);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Feedback</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
          {canViewAll
            ? "All submissions from students using VisaBuddy."
            : "Tell us what to improve — we read every note."}
        </p>
      </div>

      <FeedbackForm />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {canViewAll ? `All feedback (${items.length})` : `Your submissions (${items.length})`}
          </CardTitle>
          {!canViewAll && (
            <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
              Only you can see your own messages here unless you’re granted inbox access.
            </p>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
              No feedback yet. Be the first to share thoughts above.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((row) => (
                <li key={row.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-200 capitalize">{row.category}</span>
                    <span>·</span>
                    <time dateTime={row.created_at}>
                      {format(new Date(row.created_at), "MMM d, yyyy · h:mm a")}
                    </time>
                    {canViewAll && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[200px]">{row.submitter_email}</span>
                        {row.submitter_name && (
                          <span className="text-gray-400">({row.submitter_name})</span>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{row.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
