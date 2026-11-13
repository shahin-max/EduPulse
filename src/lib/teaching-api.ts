import { request } from "@/lib/api";
import { query, type Paginated } from "@/lib/admin-api";

/** Teaching reports (admins and the batch's faculty) and the signed-in person's notifications. */

type BatchRef = { id: number; code: string; name: string };
type PersonRef = { id: number; full_name: string; photo_url: string | null };

export type AttendanceSummary = {
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Present or late as a share of present + late + absent; null before any marking. */
  percentage: number | null;
};

/** NOT_DUE: no submission, due date still ahead. LATE: submitted after the due date, not reviewed yet. */
export type SubmissionState = "MISSING" | "NOT_DUE" | "SUBMITTED" | "LATE" | "REVIEWED";

// ---------------------------------------------------------------- dashboard

export type TeachingDashboard = {
  to_review: {
    total: number;
    items: { submission_id: number; submitted_at: string; assignment: { id: number; title: string; due_at: string | null }; batch: BatchRef; student: PersonRef }[];
  };
  attendance_pending: { total: number; items: { id: number; title: string; starts_at: string; ends_at: string; batches: BatchRef }[] };
  due_soon: { id: number; title: string; due_at: string; batches: BatchRef; submitted: number; enrolled: number }[];
  upcoming_exams: { id: number; title: string; kind: string; opens_at: string | null; closes_at: string | null; duration_minutes: number; batches: BatchRef[] }[];
  enquiries: { new: number; follow_up: number };
};

// ---------------------------------------------------------------- gradebook

export type GradebookAssignment = { id: number; title: string; due_at: string | null; max_marks: string | null };
export type GradebookExam = { id: number; title: string; kind: string; total_marks: string; opens_at: string | null };

export type GradebookStudent = {
  enrollment_id: number;
  enrollment_status: string;
  user_id: number;
  full_name: string;
  photo_url: string | null;
  admission_number: string | null;
  attendance: AttendanceSummary;
  /** Keyed by assignment id. */
  assignments: Record<string, { state: SubmissionState; marks: string | null }>;
  /** Keyed by exam id; the best graded attempt. */
  exams: Record<string, { attempts: number; score: string | null; max_score: string | null; percentage: string | null }>;
  materials_completed: number;
};

export type Gradebook = {
  batch: BatchRef & { status: string; courses: { id: number; code: string; title: string } };
  sessions_held: number;
  materials_total: number;
  assignments: GradebookAssignment[];
  exams: GradebookExam[];
  students: GradebookStudent[];
};

// ---------------------------------------------------------------- student report

export type ExamAttempt = {
  id: number;
  attempt_number: number;
  status: string;
  started_at: string;
  submitted_at: string | null;
  score: string | null;
  max_score: string;
  percentage: string | null;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
};

export type StudentReport = {
  enrollment: { id: number; status: string; enrolled_at: string; completed_at: string | null };
  batch: BatchRef & { courses: { id: number; code: string; title: string } };
  student: {
    admission_number: string | null;
    grade: string | null;
    school_name: string | null;
    guardian_name: string | null;
    guardian_mobile: string | null;
    users: { id: number; full_name: string; email: string | null; mobile: string | null; photo_url: string | null };
  };
  attendance: AttendanceSummary & {
    sessions: { id: number; title: string; starts_at: string; ends_at: string; status: string; subjects: { id: number; name: string } | null; attendance: string | null }[];
  };
  assignments: {
    id: number;
    title: string;
    due_at: string | null;
    max_marks: string | null;
    status: string;
    subjects: { id: number; name: string } | null;
    state: SubmissionState;
    submission: { id: number; submitted_at: string; marks_awarded: string | null; feedback: string | null; reviewed_at: string | null } | null;
  }[];
  exams: { id: number; title: string; kind: string; total_marks: string; opens_at: string | null; closes_at: string | null; attempts: ExamAttempt[]; best: ExamAttempt | null }[];
  materials: { total: number; completed: number; in_progress: number };
};

export const teachingApi = {
  dashboard: (token: string) => request<TeachingDashboard>("/teaching/dashboard", { token }),
  gradebook: (token: string, batchId: number) => request<Gradebook>(`/batches/${batchId}/gradebook`, { token }),
  studentReport: (token: string, batchId: number, userId: number) => request<StudentReport>(`/batches/${batchId}/students/${userId}/report`, { token }),
};

// ---------------------------------------------------------------- notifications

export type Notification = { id: number; title: string; message: string; link_url: string | null; read_at: string | null; created_at: string };
export type NotificationsPage = Paginated<Notification> & { meta: Paginated<Notification>["meta"] & { unread: number } };

export const notificationsApi = {
  list: (token: string, params: { page?: number; limit?: number; unread?: boolean } = {}) => request<NotificationsPage>(`/notifications${query(params)}`, { token }),
  read: (token: string, id: number) => request<unknown>(`/notifications/${id}/read`, { token, method: "PATCH" }),
  readAll: (token: string) => request<unknown>("/notifications/read-all", { token, method: "POST" }),
};

// ---------------------------------------------------------------- display helpers

export const SUBMISSION_LABEL: Record<SubmissionState, string> = {
  MISSING: "Missing", NOT_DUE: "Not due", SUBMITTED: "Submitted", LATE: "Late", REVIEWED: "Reviewed",
};

/** Below this attendance a student is flagged. */
export const LOW_ATTENDANCE = 75;

/** "16.00" -> "16", "16.50" -> "16.5". */
export const num = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "" : String(Number(value));

/** Spreadsheet-safe CSV (quotes, and a leading ' on values Excel would run as formulas) with a BOM for Excel. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text))) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = "﻿" + rows.map(row => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
