import { createClient, createAdminClient } from "@/lib/supabase/server";
import { canViewAllFeedback } from "./viewers";

export type FeedbackRow = {
  id: string;
  user_id: string;
  submitter_email: string;
  submitter_name: string | null;
  message: string;
  category: string;
  created_at: string;
};

export async function loadDashboardFeedback(
  userId: string,
  email: string,
  role: string
): Promise<{ items: FeedbackRow[]; canViewAll: boolean }> {
  if (canViewAllFeedback(role, email)) {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("feedback")
      .select("id, user_id, submitter_email, submitter_name, message, category, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return { items: [], canViewAll: true };
    }
    return { items: (data as FeedbackRow[]) ?? [], canViewAll: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("id, user_id, submitter_email, submitter_name, message, category, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    return { items: [], canViewAll: false };
  }
  return { items: (data as FeedbackRow[]) ?? [], canViewAll: false };
}
