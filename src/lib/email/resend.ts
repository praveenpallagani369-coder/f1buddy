import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface DeadlineReminderData {
  to: string;
  studentName: string;
  deadlines: { title: string; daysRemaining: number; severity: string; deadlineDate: string }[];
}

export async function sendDeadlineReminder(data: DeadlineReminderData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const resend = getResend();
  const criticalCount = data.deadlines.filter((d) => d.severity === "critical").length;
  const safeName = escapeHtml(data.studentName);

  const deadlineRows = data.deadlines
    .map((d) => {
      const safeTitle = escapeHtml(d.title);
      const urgency = d.daysRemaining === 0 ? "TODAY" : d.daysRemaining < 0 ? "OVERDUE" : `${d.daysRemaining} days`;
      const color = d.severity === "critical" ? "#ef4444" : d.severity === "warning" ? "#f59e0b" : "#6366f1";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #1e293b;color:#e2e8f0;font-size:14px">${safeTitle}</td>
          <td style="padding:10px 0;border-bottom:1px solid #1e293b;text-align:right">
            <span style="color:${color};font-weight:600;font-size:14px">${urgency}</span>
          </td>
        </tr>`;
    })
    .join("");

  const subject = criticalCount > 0
    ? `${criticalCount} Critical F-1 Deadline${criticalCount > 1 ? "s" : ""} - Action Required`
    : `VisaBuddy: ${data.deadlines.length} Upcoming Deadline Reminder`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://visabuddy.app";

  await resend.emails.send({
    from: "VisaBuddy <reminders@visabuddy.app>",
    to: data.to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#020817;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
        <div style="max-width:560px;margin:40px auto;padding:0 20px">
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:32px">
            <div style="text-align:center;margin-bottom:28px">
              <div style="display:inline-block;background:#4f46e5;border-radius:12px;padding:10px 16px;font-size:20px">&#127891;</div>
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:12px 0 4px">VisaBuddy</h1>
              <p style="color:#94a3b8;font-size:13px;margin:0">F-1 Compliance Reminder</p>
            </div>

            <p style="color:#e2e8f0;font-size:16px;margin:0 0 20px">Hi ${safeName},</p>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px">
              You have <strong style="color:#e2e8f0">${data.deadlines.length} upcoming deadline${data.deadlines.length > 1 ? "s" : ""}</strong> that need your attention.
              ${criticalCount > 0 ? `<strong style="color:#ef4444"> ${criticalCount} are critical.</strong>` : ""}
            </p>

            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th style="text-align:left;padding:8px 0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1e293b">Deadline</th>
                  <th style="text-align:right;padding:8px 0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #1e293b">Due</th>
                </tr>
              </thead>
              <tbody>${deadlineRows}</tbody>
            </table>

            <div style="text-align:center;margin-top:28px">
              <a href="${siteUrl}/dashboard/deadlines"
                style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
                View All Deadlines
              </a>
            </div>

            <p style="color:#475569;font-size:12px;margin:24px 0 0;line-height:1.6;border-top:1px solid #1e293b;padding-top:20px">
              This is a compliance reminder from VisaBuddy. Always verify deadlines with your DSO.
              This is not legal advice. <a href="${siteUrl}/dashboard" style="color:#6366f1">Manage your account</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
