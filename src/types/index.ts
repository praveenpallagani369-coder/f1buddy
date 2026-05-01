// ============================================================
// VisaBuddy Shared TypeScript Types
// ============================================================

export type VisaType = "F1" | "J1" | "M1";
export type UserRole = "student" | "premium" | "university_admin" | "admin";

export type DeadlineCategory =
  | "opt"
  | "visa"
  | "travel"
  | "tax"
  | "sevis"
  | "document"
  | "custom";

export type DeadlineSeverity = "critical" | "warning" | "info";
export type DeadlineStatus = "pending" | "acknowledged" | "completed" | "overdue";

export type EmploymentType = "full_time" | "part_time" | "volunteer" | "unpaid_intern";
export type OPTType = "pre_completion" | "post_completion" | "stem_extension";
export type TravelPurpose = "vacation" | "family" | "conference" | "interview" | "other";

export type DocumentType =
  | "i20"
  | "ead"
  | "passport"
  | "visa_stamp"
  | "i94"
  | "ssn_card"
  | "offer_letter"
  | "pay_stub"
  | "tax_return"
  | "transcript"
  | "other";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  visaType: VisaType;
  sevisId: string | null; // decrypted for display
  schoolName: string | null;
  programName: string | null;
  degreeLevel: string | null;
  programStartDate: string | null;
  programEndDate: string | null;
  dsoName: string | null;
  dsoEmail: string | null;
  dsoPhone: string | null;
  homeCountry: string | null;
  passportExpiry: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
}

export interface Deadline {
  id: string;
  title: string;
  description: string | null;
  deadlineDate: string;
  category: DeadlineCategory;
  severity: DeadlineSeverity;
  status: DeadlineStatus;
  daysRemaining: number;
  isSystemGenerated: boolean;
}

export interface OPTStatus {
  id: string;
  optType: OPTType;
  eadCategory: string;
  eadStartDate: string;
  eadEndDate: string;
  unemploymentDaysUsed: number;
  unemploymentLimit: number;
  daysRemaining: number;
}

export interface OPTEmployment {
  id: string;
  employerName: string;
  positionTitle: string | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  employmentType: EmploymentType;
  isStemRelated: boolean;
  eVerifyEmployer: boolean;
  reportedToSchool: boolean;
}

export interface TravelRecord {
  id: string;
  departureDate: string;
  returnDate: string | null;
  destinationCountry: string;
  purpose: TravelPurpose;
  daysOutside: number;
  documentsCarried: string[];
  notes: string | null;
}

export interface Document {
  id: string;
  docType: DocumentType;
  fileName: string;
  fileSizeBytes: number;
  expirationDate: string | null;
  daysUntilExpiry: number | null;
  uploadedAt: string;
  notes: string | null;
}

export interface ComplianceDashboard {
  overallStatus: "green" | "yellow" | "red";
  urgentDeadline: Deadline | null;
  optStatus: {
    unemploymentDaysUsed: number;
    unemploymentLimit: number;
    daysRemaining: number;
    currentEmployer: string | null;
    eadExpiryDate: string | null;
  } | null;
  travelStatus: {
    daysOutsideThisYear: number;
    fiveMonthWarning: boolean;
    currentlyAbroad: boolean;
  };
  expiringDocuments: {
    docType: DocumentType;
    expirationDate: string;
    daysUntilExpiry: number;
  }[];
  upcomingDeadlines: Deadline[];
  alerts: {
    type: string;
    message: string;
    severity: DeadlineSeverity;
  }[];
}

export interface AIAssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
