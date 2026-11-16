import { request } from "@/lib/api";
import { json } from "@/lib/admin-api";

/**
 * Scholarship Tests (API src/scholarships). Each test owns a candidates batch and an exam in the hidden
 * "Scholarship Tests" course; registering enrols the student in that batch only. Awards are % off course
 * fees, decided by score slabs (or an admin override) and applied once to a fee invoice.
 */

export type ScholarshipStatus = "DRAFT" | "OPEN" | "RESULTS_PUBLISHED";
export type Slab = { minPercentage: number; discountPercent: number };

export const SCHOLARSHIP_STATUS_LABEL: Record<ScholarshipStatus, string> = {
  DRAFT: "Draft", OPEN: "Registration open", RESULTS_PUBLISHED: "Results published",
};

/** Classes offered in the registration form and the eligibility picker. */
export const SCHOLARSHIP_GRADES = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Passed Class 12"];

/** Admin shape (GET /scholarship-tests, /scholarship-tests/:id). */
export type ScholarshipTest = {
  id: number;
  title: string;
  description: string | null;
  exam_id: number;
  batch_id: number;
  /** Empty = any class. */
  eligible_grades: string[];
  /** Highest minimum first. */
  slabs: Slab[];
  registration_closes_at: string | null;
  valid_until: string | null;
  status: ScholarshipStatus;
  results_published_at: string | null;
  created_at: string;
  updated_at: string;
  exams: {
    id: number; title: string; kind: string; status: string; duration_minutes: number; total_marks: string;
    opens_at: string | null; closes_at: string | null; _count: { exam_questions: number };
  };
  batches: { id: number; code: string; name: string };
  candidates: number;
};

/** GET /scholarship-tests/current (public): the test taking registrations, or null. */
export type CurrentScholarshipTest = {
  test: {
    id: number; title: string; description: string | null; eligible_grades: string[]; slabs: Slab[];
    registration_closes_at: string | null; valid_until: string | null;
    opens_at: string | null; closes_at: string | null; duration_minutes: number;
  } | null;
};

/** GET /student/scholarships item. */
export type MyScholarship = {
  id: number; title: string; description: string | null; status: ScholarshipStatus; slabs: Slab[]; valid_until: string | null;
  exam: { id: number; kind: string; opens_at: string | null; closes_at: string | null; duration_minutes: number; questions: number; window: "UPCOMING" | "OPEN" | "CLOSED" };
  /** The in-progress attempt if any, otherwise the latest. */
  attempt: { id: number; status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "INVALIDATED" } | null;
  can_start: boolean;
  result: { percentage: string | null; rank: number | null; candidates: number; discount_percent: string | number; used: boolean; expired: boolean } | null;
};

export type ScholarshipCandidate = {
  student: { id: number; full_name: string; mobile: string | null; email: string | null; photo_url: string | null };
  grade: string | null;
  school_name: string | null;
  registered_at: string;
  attempt: { id: number; score: string | null; max_score: string; percentage: string | null; submitted_at: string | null } | null;
  rank: number | null;
  suggested_discount: number;
  /** The override if set, otherwise the slab. */
  discount_percent: number;
  is_override: boolean;
  note: string | null;
  used: boolean;
};

export type ScholarshipResults = { test: ScholarshipTest; took_test: number; candidates: ScholarshipCandidate[] };

/** GET /students/:userId/scholarships: published, unused, unexpired awards above 0%. */
export type AvailableAward = {
  id: number; discount_percent: string; rank: number | null; percentage: string | null;
  scholarship_tests: { id: number; title: string; valid_until: string | null };
};

export type CreateScholarshipInput = {
  title: string; description?: string | null; eligibleGrades?: string[]; slabs: Slab[];
  /** ISO date-times. */
  opensAt: string; closesAt: string; durationMinutes: number; omr?: boolean;
  registrationClosesAt?: string | null;
  /** YYYY-MM-DD */
  validUntil?: string | null;
};
export type UpdateScholarshipInput = Partial<Pick<CreateScholarshipInput, "title" | "description" | "eligibleGrades" | "slabs" | "registrationClosesAt" | "validUntil">>;

export const scholarshipsApi = {
  // Website and students
  current: () => request<CurrentScholarshipTest>("/scholarship-tests/current"),
  join: (token: string, id: number, grade: string) =>
    request<{ registered: boolean; already: boolean; test_id: number }>(`/scholarship-tests/${id}/join`, { token, ...json("POST", { grade }) }),
  mine: (token: string) => request<MyScholarship[]>("/student/scholarships", { token }),
  // Admin
  list: (token: string) => request<ScholarshipTest[]>("/scholarship-tests", { token }),
  get: (token: string, id: number) => request<ScholarshipTest>(`/scholarship-tests/${id}`, { token }),
  create: (token: string, input: CreateScholarshipInput) => request<ScholarshipTest>("/scholarship-tests", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateScholarshipInput) => request<ScholarshipTest>(`/scholarship-tests/${id}`, { token, ...json("PATCH", input) }),
  open: (token: string, id: number) => request<ScholarshipTest>(`/scholarship-tests/${id}/open`, { token, method: "POST" }),
  results: (token: string, id: number) => request<ScholarshipResults>(`/scholarship-tests/${id}/results`, { token }),
  /** null discount resets to the slab. */
  override: (token: string, id: number, studentUserId: number, discountPercent: number | null, note?: string) =>
    request<ScholarshipResults>(`/scholarship-tests/${id}/awards/${studentUserId}`, { token, ...json("PUT", { discountPercent, ...(note ? { note } : {}) }) }),
  publish: (token: string, id: number) => request<ScholarshipResults>(`/scholarship-tests/${id}/publish`, { token, method: "POST" }),
  availableAwards: (token: string, studentUserId: number) => request<AvailableAward[]>(`/students/${studentUserId}/scholarships`, { token }),
};

/** "≥ 90% → 50% off, ≥ 75% → 25% off". */
export const slabSentence = (slabs: Slab[]) =>
  [...slabs].sort((a, b) => b.minPercentage - a.minPercentage).map(s => `${s.minPercentage}%+ → ${s.discountPercent}% off`).join(", ");

/** The test taking registrations now (the `test` of GET /scholarship-tests/current). */
export type OpenScholarshipTest = NonNullable<CurrentScholarshipTest["test"]>;

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };

/** "15 Jan 2027, 10:00 am". */
export const istDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { ...IST, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
/** "10:00 am". */
export const istTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { ...IST, hour: "numeric", minute: "2-digit" });
/** "15 Jan 2027" (for date-only values such as valid_until). */
export const istDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** "Online on 15 Jan 2027, 10:00 am – 12:00 pm, 60 minutes" (or a two-day range). */
export function testWindow(opens: string | null, closes: string | null, minutes: number) {
  if (!opens) return `Online, ${minutes} minutes`;
  if (!closes) return `Online from ${istDateTime(opens)}, ${minutes} minutes`;
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", IST);
  return day(opens) === day(closes)
    ? `Online on ${istDateTime(opens)} – ${istTime(closes)}, ${minutes} minutes`
    : `Online from ${istDateTime(opens)} to ${istDateTime(closes)}, ${minutes} minutes`;
}

/** Slabs, highest first: "90% and above → 50% off course fees". */
export const slabRows = (slabs: Slab[]) =>
  [...slabs].sort((a, b) => b.minPercentage - a.minPercentage)
    .map(s => ({ score: `${s.minPercentage}% and above`, award: `${s.discountPercent}% off course fees` }));
