// ============================================================
// VisaBuddy Database Schema (Drizzle ORM)
// Used to generate SQL migrations for Supabase
// ============================================================

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---- Enums ----
export const visaTypeEnum = pgEnum("visa_type", ["F1", "J1", "M1"]);
export const userRoleEnum = pgEnum("user_role", [
  "student",
  "premium",
  "university_admin",
  "lawyer",
  "admin",
]);
export const deadlineCategoryEnum = pgEnum("deadline_category", [
  "opt",
  "visa",
  "travel",
  "tax",
  "sevis",
  "document",
  "custom",
]);
export const deadlineSeverityEnum = pgEnum("deadline_severity", [
  "critical",
  "warning",
  "info",
]);
export const deadlineStatusEnum = pgEnum("deadline_status", [
  "pending",
  "acknowledged",
  "completed",
  "overdue",
]);
export const employmentTypeEnum = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "volunteer",
  "unpaid_intern",
]);
export const optTypeEnum = pgEnum("opt_type", [
  "pre_completion",
  "post_completion",
  "stem_extension",
]);
export const travelPurposeEnum = pgEnum("travel_purpose", [
  "vacation",
  "family",
  "conference",
  "interview",
  "other",
]);
export const documentTypeEnum = pgEnum("document_type", [
  "i20",
  "ead",
  "passport",
  "visa_stamp",
  "i94",
  "ssn_card",
  "offer_letter",
  "pay_stub",
  "tax_return",
  "transcript",
  "other",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "deadline_reminder",
  "document_expiry",
  "opt_alert",
  "travel_warning",
  "system",
  "tax_reminder",
]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "free",
  "premium",
  "university",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
]);
export const taxFilingStatusEnum = pgEnum("tax_filing_status", [
  "nonresident_1040nr",
  "resident_1040",
  "exempt_treaty",
  "not_required",
]);

// ---- Tables ----

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  visaType: visaTypeEnum("visa_type").default("F1"),
  sevisIdEncrypted: text("sevis_id_encrypted"),
  i94NumberEncrypted: text("i94_number_encrypted"),
  passportNumberEncrypted: text("passport_number_encrypted"),
  passportExpiry: date("passport_expiry"),
  schoolName: text("school_name"),
  programName: text("program_name"),
  degreeLevel: text("degree_level"),
  programStartDate: date("program_start_date"),
  programEndDate: date("program_end_date"),
  dsoName: text("dso_name"),
  dsoEmail: text("dso_email"),
  dsoPhone: text("dso_phone"),
  homeCountry: text("home_country"),
  portOfEntry: text("port_of_entry"),
  role: userRoleEnum("role").default("student").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const complianceDeadlines = pgTable("compliance_deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  deadlineDate: date("deadline_date").notNull(),
  category: deadlineCategoryEnum("category").notNull(),
  severity: deadlineSeverityEnum("severity").default("warning").notNull(),
  status: deadlineStatusEnum("status").default("pending").notNull(),
  isSystemGenerated: boolean("is_system_generated").default(false).notNull(),
  reminder30dSent: boolean("reminder_30d_sent").default(false).notNull(),
  reminder14dSent: boolean("reminder_14d_sent").default(false).notNull(),
  reminder7dSent: boolean("reminder_7d_sent").default(false).notNull(),
  reminder3dSent: boolean("reminder_3d_sent").default(false).notNull(),
  reminder1dSent: boolean("reminder_1d_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const optStatus = pgTable("opt_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  optType: optTypeEnum("opt_type").notNull(),
  eadCategory: text("ead_category"),
  eadStartDate: date("ead_start_date"),
  eadEndDate: date("ead_end_date"),
  unemploymentDaysUsed: integer("unemployment_days_used").default(0).notNull(),
  unemploymentLimit: integer("unemployment_limit").default(90).notNull(),
  applicationDate: date("application_date"),
  approvalDate: date("approval_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const optEmployment = pgTable("opt_employment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  employerName: text("employer_name").notNull(),
  employerEin: text("employer_ein"),
  positionTitle: text("position_title"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isCurrent: boolean("is_current").default(true).notNull(),
  employmentType: employmentTypeEnum("employment_type").notNull(),
  isStemRelated: boolean("is_stem_related").default(true).notNull(),
  eVerifyEmployer: boolean("e_verify_employer").default(false).notNull(),
  reportedToSchool: boolean("reported_to_school").default(false).notNull(),
  reportedDate: date("reported_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const travelRecords = pgTable("travel_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  departureDate: date("departure_date").notNull(),
  returnDate: date("return_date"),
  destinationCountry: text("destination_country").notNull(),
  purpose: travelPurposeEnum("purpose").default("vacation").notNull(),
  daysOutside: integer("days_outside").default(0).notNull(),
  documentsCarried: jsonb("documents_carried").$type<string[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  docType: documentTypeEnum("doc_type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileSizeBytes: integer("file_size_bytes"),
  mimeType: text("mime_type"),
  expirationDate: date("expiration_date"),
  isCurrentVersion: boolean("is_current_version").default(true).notNull(),
  previousVersionId: uuid("previous_version_id"),
  notes: text("notes"),
  aiExtractedData: jsonb("ai_extracted_data").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const taxRecords = pgTable("tax_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  taxYear: integer("tax_year").notNull(),
  filingStatus: taxFilingStatusEnum("filing_status"),
  treatyCountry: text("treaty_country"),
  treatyArticle: text("treaty_article"),
  substantialPresenceDays: integer("substantial_presence_days"),
  form8843Filed: boolean("form_8843_filed").default(false).notNull(),
  federalFiled: boolean("federal_filed").default(false).notNull(),
  stateFiled: boolean("state_filed").default(false).notNull(),
  stateName: text("state_name"),
  filedDate: date("filed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false).notNull(),
  isEmailSent: boolean("is_email_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  answerCount: integer("answer_count").default(0).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const communityAnswers = pgTable("community_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => communityPosts.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isAccepted: boolean("is_accepted").default(false).notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cptTypeEnum = pgEnum("cpt_type", ["part_time", "full_time"]);

export const optApplicationSteps = pgTable("opt_application_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stepName: text("step_name").notNull(),
  stepOrder: integer("step_order").notNull(),
  targetDate: date("target_date"),
  completedDate: date("completed_date"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cptRecords = pgTable("cpt_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  employerName: text("employer_name").notNull(),
  positionTitle: text("position_title"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isCurrent: boolean("is_current").default(false),
  cptType: cptTypeEnum("cpt_type").default("part_time"),
  isAuthorizedOnI20: boolean("is_authorized_on_i20").default(false),
  courseName: text("course_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  messages: jsonb("messages")
    .$type<{ role: "user" | "assistant"; content: string; timestamp: string }[]>()
    .default([])
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: subscriptionPlanEnum("plan").default("free").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- Push Subscriptions (Web Push API) ----
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---- WebAuthn Credentials (Biometric Auth) ----
export const webauthnCredentials = pgTable("webauthn_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").default(0).notNull(),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webauthnChallenges = pgTable("webauthn_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  challenge: text("challenge").notNull(),
  type: text("type").notNull(), // "registration" | "authentication"
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lawyerProfiles = pgTable("lawyer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  barNumber: text("bar_number").notNull(),
  statesLicensed: jsonb("states_licensed").$type<string[]>().default([]).notNull(),
  consultationUrl: text("consultation_url"),
  hourlyRate: integer("hourly_rate"),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lawyerReviews = pgTable("lawyer_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawyerId: uuid("lawyer_id")
    .notNull()
    .references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  submitterEmail: text("submitter_email").notNull(),
  submitterName: text("submitter_name"),
  message: text("message").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---- Relations ----
export const usersRelations = relations(users, ({ many, one }) => ({
  deadlines: many(complianceDeadlines),
  optStatus: one(optStatus),
  optEmployment: many(optEmployment),
  travelRecords: many(travelRecords),
  documents: many(documents),
  taxRecords: many(taxRecords),
  notifications: many(notifications),
  posts: many(communityPosts),
  answers: many(communityAnswers),
  subscription: one(subscriptions),
  optApplicationSteps: many(optApplicationSteps),
  cptRecords: many(cptRecords),
  aiConversation: one(aiConversations),
  pushSubscription: one(pushSubscriptions),
  webauthnCredentials: many(webauthnCredentials),
  lawyerProfile: one(lawyerProfiles),
  lawyerReviews: many(lawyerReviews),
  feedback: many(feedback),
}));

export const lawyerProfilesRelations = relations(lawyerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [lawyerProfiles.userId],
    references: [users.id],
  }),
  reviews: many(lawyerReviews),
}));

export const lawyerReviewsRelations = relations(lawyerReviews, ({ one }) => ({
  lawyer: one(lawyerProfiles, {
    fields: [lawyerReviews.lawyerId],
    references: [lawyerProfiles.id],
  }),
  student: one(users, {
    fields: [lawyerReviews.studentId],
    references: [users.id],
  }),
}));
