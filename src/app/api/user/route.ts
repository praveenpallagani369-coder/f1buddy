import { getAuthUser, ok, err, UNAUTHORIZED } from "@/lib/api/helpers";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  schoolName: z.string().optional().nullable(),
  programName: z.string().optional().nullable(),
  degreeLevel: z.string().optional().nullable(),
  programStartDate: z.string().optional().nullable(),
  programEndDate: z.string().optional().nullable(),
  dsoName: z.string().optional().nullable(),
  dsoEmail: z.string().email().optional().nullable().or(z.literal("")),
  dsoPhone: z.string().optional().nullable(),
  homeCountry: z.string().optional().nullable(),
  passportExpiry: z.string().optional().nullable(),
  visaStampExpiry: z.string().optional().nullable(),
  i20TravelSignatureDate: z.string().optional().nullable(),
}).strict();

export async function GET() {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const { data } = await supabase
    .from("users")
    .select("id,email,name,avatar_url,visa_type,school_name,program_name,degree_level,program_start_date,program_end_date,dso_name,dso_email,dso_phone,home_country,passport_expiry,visa_stamp_expiry,i20_travel_signature_date,role,onboarding_completed,created_at")
    .eq("id", user.id)
    .single();

  return ok(data);
}

export async function PATCH(request: Request) {
  const { user, supabase, error } = await getAuthUser();
  if (error || !user) return UNAUTHORIZED();

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.schoolName !== undefined) updates.school_name = parsed.data.schoolName;
  if (parsed.data.programName !== undefined) updates.program_name = parsed.data.programName;
  if (parsed.data.degreeLevel !== undefined) updates.degree_level = parsed.data.degreeLevel;
  if (parsed.data.programStartDate !== undefined) updates.program_start_date = parsed.data.programStartDate || null;
  if (parsed.data.programEndDate !== undefined) updates.program_end_date = parsed.data.programEndDate || null;
  if (parsed.data.dsoName !== undefined) updates.dso_name = parsed.data.dsoName;
  if (parsed.data.dsoEmail !== undefined) updates.dso_email = parsed.data.dsoEmail || null;
  if (parsed.data.dsoPhone !== undefined) updates.dso_phone = parsed.data.dsoPhone;
  if (parsed.data.homeCountry !== undefined) updates.home_country = parsed.data.homeCountry;
  if (parsed.data.passportExpiry !== undefined) updates.passport_expiry = parsed.data.passportExpiry || null;
  if (parsed.data.visaStampExpiry !== undefined) updates.visa_stamp_expiry = parsed.data.visaStampExpiry || null;
  if (parsed.data.i20TravelSignatureDate !== undefined) updates.i20_travel_signature_date = parsed.data.i20TravelSignatureDate || null;

  const { data } = await supabase.from("users").update(updates).eq("id", user.id).select().single();
  return ok(data);
}
