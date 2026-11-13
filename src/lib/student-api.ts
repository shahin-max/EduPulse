import { request } from "@/lib/api";
import { json, query, type Paginated } from "@/lib/admin-api";
import type { SubmissionState } from "@/lib/teaching-api";

/**
 * Endpoints for the student portal. Students only see their current enrollments (ACTIVE and within
 * the access window); the API enforces every rule, these are just typed calls.
 * Field names are the API's (snake_case); money and marks are strings such as "1500.00".
 */

type Ref = { id: number; code: string; name: string };
type CourseRef = { id: number; code: string; title: string };

// ---------------------------------------------------------------- courses & materials

export type StudentCourse = {
  enrollment_id: number;
  enrolled_at: string;
  access_ends_at: string | null;
  batch: Ref & {
    status: string; start_date: string | null; end_date: string | null; course_id: number;
    courses: CourseRef & { slug: string };
    branches: Ref | null;
  };
  teachers: { user_id: number; full_name: string; photo_url: string | null; subject: { id: number; name: string } }[];
  materials: { total: number; completed: number };
};

export type MaterialKind = "PDF_NOTE" | "WORKSHEET" | "PREVIOUS_PAPER" | "VIDEO_LINK" | "OTHER";
export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type StudentMaterial = {
  id: number;
  title: string;
  kind: MaterialKind;
  asset_id: number | null;
  external_url: string | null;
  /** Advisory: the teacher's choice whether students should download the file. */
  is_downloadable: boolean;
  file_assets: { id: number; original_filename: string; mime_type: string; size_bytes: number } | null;
  progress: ProgressStatus;
  last_accessed_at: string | null;
  completed_at: string | null;
};

export type CourseMaterials = {
  course: CourseRef & { slug: string };
  subjects: { id: number; subject: Ref; chapters: { id: number; title: string; description: string | null; materials: StudentMaterial[] }[] }[];
};

// ---------------------------------------------------------------- assignments

export type StudentAssignment = {
  id: number;
  batch_id: number;
  title: string;
  due_at: string | null;
  max_marks: string | null;
  status: "PUBLISHED" | "CLOSED";
  created_at: string;
  subjects: { id: number; name: string } | null;
  batches: Ref;
  state: SubmissionState;
  my_submission: { id: number; submitted_at: string; marks_awarded: string | null; reviewed_at: string | null; asset_id: number | null; is_late: boolean } | null;
};

/** GET /assignments/:id (student view). */
export type AssignmentDetail = {
  id: number; batch_id: number; subject_id: number | null; title: string; instructions: string | null;
  attachment_asset_id: number | null; due_at: string | null; max_marks: string | null; status: "PUBLISHED" | "CLOSED"; created_at: string;
  subjects: { id: number; code: string; name: string } | null;
  file_assets: { id: number; original_filename: string; mime_type: string } | null;
  users: { id: number; full_name: string } | null;
};

/** GET/PUT /assignments/:id/submission. */
export type MySubmission = {
  id: number; assignment_id: number; asset_id: number | null; response_text: string | null; submitted_at: string;
  marks_awarded: string | null; feedback: string | null; reviewed_at: string | null; is_late: boolean;
  file_assets: { id: number; original_filename: string; mime_type: string } | null;
  users: { id: number; full_name: string } | null;
};

// ---------------------------------------------------------------- exams

export type ExamKind = "DAILY_PRACTICE" | "CHAPTER_TEST" | "MOCK_TEST" | "OMR_PRACTICE";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "INVALIDATED";

/** GET /exams/available: published, not closed, for the student's current batches. */
export type AvailableExam = {
  id: number; course_id: number; subject_id: number | null; title: string; kind: ExamKind;
  duration_minutes: number; total_marks: string; negative_marks_per_wrong: string; max_attempts: number;
  opens_at: string | null; closes_at: string | null; results_release_at: string | null; answer_review_release_at: string | null;
  show_result_immediately: boolean;
  courses: CourseRef; subjects: Ref | null; _count: { exam_questions: number };
  window: "UPCOMING" | "OPEN" | "CLOSED";
  attempts_used: number; attempts_remaining: number;
  /** An unexpired attempt to resume, if any. */
  in_progress_attempt_id: number | null;
  /** The student's own batches taking this test; with more than one, starting needs a batchId. */
  my_batches: Ref[];
};

export type AttemptOption = { id: number; option_label: string; option_text: string; is_correct?: boolean };

export type AttemptQuestion = {
  question_id: number; display_order: number; question_text: string; marks: string; negative_marks: string;
  options: AttemptOption[];
  selected_option_id: number | null; is_marked_for_review: boolean; answered_at: string | null;
  /** Only when the answer review is released. */
  is_correct?: boolean; marks_awarded?: string; explanation?: string | null;
};

/** The attempt header (GET /exam-attempts/me items). Score fields appear only once results are visible. */
export type AttemptHeader = {
  id: number; exam: { id: number; title: string; kind: ExamKind }; batch_id: number; enrollment_id: number;
  attempt_number: number; status: AttemptStatus; started_at: string; expires_at: string; submitted_at: string | null; max_score: string;
  score?: string | null; percentage?: string | null; correct_count?: number; wrong_count?: number; unanswered_count?: number; graded_at?: string | null;
};

/** Full attempt (start, GET /exam-attempts/:id, submit). */
export type Attempt = AttemptHeader & {
  results_visible: boolean;
  review_visible: boolean;
  /** 0 unless IN_PROGRESS. */
  seconds_remaining: number;
  questions: AttemptQuestion[];
};

export type Leaderboard = {
  exam: { id: number; title: string; ranking_attempt_policy: string };
  entries: { rank: number; student_user_id: number; full_name: string; batch_id: number; score: string; max_score: string; percentage: string; submitted_at: string }[];
};

// ---------------------------------------------------------------- attendance, classes, fees

export type MyAttendance = {
  batch: Ref;
  summary: { total: number; present: number; absent: number; late: number; excused: number; percentage: number | null };
  records: { session: { id: number; title: string; starts_at: string; subjects: { id: number; name: string } | null }; status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"; marked_at: string }[];
}[];

export type StudentClass = {
  id: number; batch_id: number; title: string; starts_at: string; ends_at: string;
  meeting_url: string | null; recording_url: string | null; status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  batches: Ref; subjects: Ref | null;
  faculty_profiles: { user_id: number; users: { full_name: string } } | null;
};

export type MyPayment = {
  id: number; amount: string; currency: string; method: string; receipt_number: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED"; paid_at: string | null; created_at: string;
  payment_refunds: { id: number; amount: string; status: string; created_at: string }[];
};

export type MyInvoice = {
  id: number; invoice_number: string; description: string | null;
  gross_amount: string; discount_amount: string; amount_due: string; due_date: string | null;
  status: "ISSUED" | "PART_PAID" | "PAID" | "VOID"; issued_at: string | null;
  fee_plans: { id: number; title: string; currency: string } | null;
  enrollments: { id: number; batches: Ref & { courses: CourseRef } };
  payments: MyPayment[];
  amount_paid: string; balance_due: string;
};

export type FeedAnnouncement = {
  id: number; title: string; body: string; audience: string; publish_at: string | null; created_at: string;
  batches: Ref | null; users: { id: number; full_name: string } | null;
};

// ---------------------------------------------------------------- calls

export const studentApi = {
  courses: (token: string) => request<StudentCourse[]>("/student/courses", { token }),
  courseMaterials: (token: string, courseId: number) => request<CourseMaterials>(`/student/courses/${courseId}/materials`, { token }),
  setProgress: (token: string, materialId: number, status: ProgressStatus) =>
    request<unknown>(`/study-materials/${materialId}/progress`, { token, ...json("PUT", { status }) }),

  assignments: (token: string) => request<StudentAssignment[]>("/student/assignments", { token }),
  assignment: (token: string, id: number) => request<AssignmentDetail>(`/assignments/${id}`, { token }),
  /** 404 when nothing has been submitted yet. */
  mySubmission: (token: string, id: number) => request<MySubmission>(`/assignments/${id}/submission`, { token }),
  /** Replaces the whole submission (a field left out becomes empty). */
  submit: (token: string, id: number, input: { responseText?: string; assetId?: number }) =>
    request<MySubmission>(`/assignments/${id}/submission`, { token, ...json("PUT", input) }),

  availableExams: (token: string) => request<AvailableExam[]>("/exams/available", { token }),
  myAttempts: (token: string, examId?: number) => request<AttemptHeader[]>(`/exam-attempts/me${query({ examId })}`, { token }),
  startAttempt: (token: string, examId: number, batchId?: number) =>
    request<Attempt>(`/exams/${examId}/attempts`, { token, ...json("POST", batchId ? { batchId } : {}) }),
  attempt: (token: string, id: number) => request<Attempt>(`/exam-attempts/${id}`, { token }),
  saveAnswer: (token: string, attemptId: number, questionId: number, input: { selectedOptionId?: number | null; isMarkedForReview?: boolean }) =>
    request<{ question_id: number; selected_option_id: number | null; is_marked_for_review: boolean; answered_at: string | null; seconds_remaining: number }>(
      `/exam-attempts/${attemptId}/answers/${questionId}`, { token, ...json("PUT", input) }),
  submitAttempt: (token: string, id: number) => request<Attempt>(`/exam-attempts/${id}/submit`, { token, method: "POST" }),
  leaderboard: (token: string, examId: number) => request<Leaderboard>(`/exams/${examId}/leaderboard${query({ limit: 50 })}`, { token }),

  attendance: (token: string) => request<MyAttendance>("/attendance/me", { token }),
  /** At most 31 days; includes cancelled classes. */
  timetable: (token: string, from: Date, to: Date) =>
    request<StudentClass[]>(`/class-sessions/timetable${query({ from: from.toISOString(), to: to.toISOString() })}`, { token }),
  invoices: (token: string) => request<MyInvoice[]>("/fee-invoices/me", { token }),
  feed: (token: string, limit = 5) => request<Paginated<FeedAnnouncement>>(`/announcements/feed${query({ limit })}`, { token }),
};

// ---------------------------------------------------------------- display helpers

export const KIND_LABEL: Record<ExamKind, string> = {
  DAILY_PRACTICE: "Daily practice", CHAPTER_TEST: "Chapter test", MOCK_TEST: "Mock test", OMR_PRACTICE: "OMR practice",
};

export const MATERIAL_LABEL: Record<MaterialKind, string> = {
  PDF_NOTE: "Notes", WORKSHEET: "Worksheet", PREVIOUS_PAPER: "Previous paper", VIDEO_LINK: "Video", OTHER: "Resource",
};

/** "1500.00" -> "₹1,500". */
export const rupees = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
