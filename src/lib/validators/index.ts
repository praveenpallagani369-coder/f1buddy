import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const onboardingSchema = z.object({
  visaType: z.enum(["F1", "J1", "M1"]),
  sevisId: z.string().optional(),
  schoolName: z.string().min(2, "School name is required"),
  programName: z.string().min(2, "Program name is required"),
  degreeLevel: z.string().min(2, "Degree level is required"),
  programStartDate: z.string().min(1, "Program start date is required"),
  programEndDate: z.string().min(1, "Program end date is required"),
  dsoName: z.string().optional(),
  dsoEmail: z.string().email().optional().or(z.literal("")),
  dsoPhone: z.string().optional(),
  homeCountry: z.string().min(2, "Home country is required"),
  passportExpiry: z.string().optional(),
});

export const optStatusSchema = z.object({
  optType: z.enum(["pre_completion", "post_completion", "stem_extension"]),
  eadCategory: z.string().optional(),
  eadStartDate: z.string().min(1, "EAD start date is required"),
  eadEndDate: z.string().min(1, "EAD end date is required"),
  applicationDate: z.string().optional(),
  approvalDate: z.string().optional(),
});

export const employmentSchema = z.object({
  employerName: z.string().min(2, "Employer name is required"),
  employerEin: z.string().optional(),
  positionTitle: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(true),
  employmentType: z.enum(["full_time", "part_time", "volunteer", "unpaid_intern"]),
  isStemRelated: z.boolean().default(true),
  eVerifyEmployer: z.boolean().default(false),
  reportedToSchool: z.boolean().default(false),
});

export const travelRecordSchema = z.object({
  departureDate: z.string().min(1, "Departure date is required"),
  returnDate: z.string().optional(),
  destinationCountry: z.string().min(2, "Destination country is required"),
  purpose: z.enum(["vacation", "family", "conference", "interview", "other"]),
  documentsCarried: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const deadlineSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  deadlineDate: z.string().min(1, "Deadline date is required"),
  category: z.enum(["opt", "visa", "travel", "tax", "sevis", "document", "custom"]),
  severity: z.enum(["critical", "warning", "info"]).default("warning"),
});

export const communityPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  body: z.string().min(20, "Post body must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  isAnonymous: z.boolean().default(false),
});

export const communityAnswerSchema = z.object({
  body: z.string().min(10, "Answer must be at least 10 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OPTStatusInput = z.infer<typeof optStatusSchema>;
export type EmploymentInput = z.infer<typeof employmentSchema>;
export type TravelRecordInput = z.infer<typeof travelRecordSchema>;
export type DeadlineInput = z.infer<typeof deadlineSchema>;
export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type CommunityAnswerInput = z.infer<typeof communityAnswerSchema>;
