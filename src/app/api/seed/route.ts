// POST /api/seed — populates demo data for the logged-in user (DEV ONLY)
// Remove or protect this route before going to production
import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { format, addDays, subDays } from "date-fns";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return err("FORBIDDEN", "Seed endpoint disabled in production", 403);
  }

  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const today = new Date();
  const f = (d: Date) => format(d, "yyyy-MM-dd");

  // Update user profile with realistic data
  await supabase.from("users").update({
    name: "Priya Sharma",
    school_name: "Massachusetts Institute of Technology",
    program_name: "Computer Science",
    degree_level: "Master's",
    program_start_date: "2023-09-01",
    program_end_date: f(addDays(today, 120)),
    dso_name: "Dr. Sarah Johnson",
    dso_email: "sjohnson@mit.edu",
    dso_phone: "+1 (617) 253-1234",
    home_country: "India",
    passport_expiry: f(addDays(today, 540)),
    visa_stamp_expiry: f(addDays(today, 180)),
    i20_travel_signature_date: f(subDays(today, 45)),
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  // OPT Status
  await supabase.from("opt_status").upsert({
    user_id: user.id,
    opt_type: "post_completion",
    ead_category: "C3B",
    ead_start_date: f(subDays(today, 60)),
    ead_end_date: f(addDays(today, 305)),
    unemployment_days_used: 23,
    unemployment_limit: 90,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // OPT Employment
  await supabase.from("opt_employment").upsert([
    {
      user_id: user.id,
      employer_name: "TechCorp Inc.",
      employer_ein: "12-3456789",
      position_title: "Software Engineer",
      start_date: f(subDays(today, 37)),
      is_current: true,
      employment_type: "full_time",
      is_stem_related: true,
      e_verify_employer: true,
      reported_to_school: true,
    }
  ], { onConflict: "id", ignoreDuplicates: false });

  // Travel Records
  await supabase.from("travel_records").insert([
    {
      user_id: user.id,
      departure_date: f(subDays(today, 120)),
      return_date: f(subDays(today, 108)),
      destination_country: "India",
      purpose: "family",
      days_outside: 12,
      documents_carried: ["Valid Passport", "Valid F-1 Visa Stamp", "I-20 with Travel Signature"],
    },
    {
      user_id: user.id,
      departure_date: f(subDays(today, 40)),
      return_date: f(subDays(today, 35)),
      destination_country: "Canada",
      purpose: "conference",
      days_outside: 5,
      documents_carried: ["Valid Passport", "I-20 with Travel Signature", "EAD Card"],
    },
  ]);

  // Compliance Deadlines
  await supabase.from("compliance_deadlines").insert([
    {
      user_id: user.id,
      title: "Apply for STEM OPT Extension",
      description: "You are eligible for a 24-month STEM OPT extension. Apply at least 90 days before your current OPT expires.",
      deadline_date: f(addDays(today, 215)),
      category: "opt",
      severity: "warning",
      status: "pending",
      is_system_generated: true,
    },
    {
      user_id: user.id,
      title: "Renew I-20 Travel Signature",
      description: "Your I-20 travel signature is 45 days old. If you plan to travel, get a fresh signature (valid 6 months on OPT).",
      deadline_date: f(addDays(today, 45)),
      category: "document",
      severity: "warning",
      status: "pending",
      is_system_generated: false,
    },
    {
      user_id: user.id,
      title: `File Form 8843 for ${today.getFullYear() - 1}`,
      description: "All F-1 students must file Form 8843 by April 15, even with no US income.",
      deadline_date: `${today.getFullYear()}-04-15`,
      category: "tax",
      severity: "warning",
      status: today.getMonth() >= 3 ? "completed" : "pending",
      is_system_generated: true,
    },
    {
      user_id: user.id,
      title: "Report Address Change to DSO",
      description: "You recently moved. Report your new address to your DSO within 10 days to update SEVIS.",
      deadline_date: f(addDays(today, 7)),
      category: "sevis",
      severity: "critical",
      status: "pending",
      is_system_generated: true,
    },
  ]);

  // Documents
  await supabase.from("documents").insert([
    {
      user_id: user.id,
      doc_type: "i20",
      file_url: "demo://i20.pdf",
      file_name: "I-20_MIT_2024.pdf",
      expiration_date: f(addDays(today, 120)),
      is_current_version: true,
    },
    {
      user_id: user.id,
      doc_type: "ead",
      file_url: "demo://ead.pdf",
      file_name: "EAD_C3B_2024.pdf",
      expiration_date: f(addDays(today, 305)),
      is_current_version: true,
    },
    {
      user_id: user.id,
      doc_type: "passport",
      file_url: "demo://passport.pdf",
      file_name: "Passport_India.pdf",
      expiration_date: f(addDays(today, 540)),
      is_current_version: true,
    },
    {
      user_id: user.id,
      doc_type: "visa_stamp",
      file_url: "demo://visa.pdf",
      file_name: "F1_Visa_Stamp.pdf",
      expiration_date: f(addDays(today, 180)),
      is_current_version: true,
    },
  ]);

  // Tax Records
  await supabase.from("tax_records").insert([
    {
      user_id: user.id,
      tax_year: today.getFullYear() - 1,
      filing_status: "nonresident_1040nr",
      treaty_country: "India",
      treaty_article: "Article 21",
      form_8843_filed: true,
      federal_filed: true,
      state_filed: true,
      state_name: "Massachusetts",
      filed_date: `${today.getFullYear()}-03-28`,
    },
  ]);

  // Community Posts
  await supabase.from("community_posts").insert([
    {
      user_id: user.id,
      title: "Can I work remotely for an Indian company while on OPT?",
      body: "I have an offer from a company in India to work remotely. I am currently on post-completion OPT. Is this allowed? Will it count toward my OPT employment requirement?",
      category: "OPT",
      is_anonymous: false,
      upvotes: 14,
      answer_count: 3,
    },
    {
      user_id: user.id,
      title: "Does conference travel to Canada count as days outside US?",
      body: "I am attending a 3-day conference in Toronto next month. I am on STEM OPT. Does this count toward my days outside the US? Do I need a travel signature?",
      category: "Travel",
      is_anonymous: true,
      upvotes: 8,
      answer_count: 2,
    },
  ]);

  return ok({ seeded: true, message: "Demo data loaded! Refresh the dashboard." });
}
