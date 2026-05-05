/** Emails that may view all feedback (comma-separated in FEEDBACK_VIEWER_EMAILS). Owner without DB admin role. */
export function isFeedbackViewerEmail(email: string | undefined): boolean {
  if (!email) return false;
  const raw = process.env.FEEDBACK_VIEWER_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export function canViewAllFeedback(role: string, email: string | undefined): boolean {
  return role === "admin" || isFeedbackViewerEmail(email);
}
