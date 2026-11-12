import { request } from "@/lib/api";
import { json, query, type Paginated } from "@/lib/admin-api";
import type { StaffBatch } from "@/components/staff/use-staff";

/**
 * Classes & attendance endpoints (/class-sessions), shared by the admin and faculty portals.
 * Every function takes the access token first (use with `withToken`). The API decides access:
 * admins manage every batch, faculty only the batches they are assigned to.
 */

export type ClassStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export const CLASS_STATUSES: ClassStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED"];

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

type Ref = { id: number; code: string; name: string };

export type ClassSession = {
  id: number;
  batch_id: number;
  subject_id: number | null;
  faculty_user_id: number | null;
  title: string;
  starts_at: string;
  ends_at: string;
  meeting_url: string | null;
  recording_url: string | null;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
  batches: Ref;
  subjects: Ref | null;
  faculty_profiles: { user_id: number; users: { full_name: string } } | null;
};

export type ListClassesQuery = { batchId: number; from?: string; to?: string; status?: ClassStatus; page?: number; limit?: number };

export type CreateClassInput = {
  batchId: number;
  subjectId?: number;
  /** Omitted by faculty: the API then assigns the class to them. */
  facultyUserId?: number;
  title: string;
  startsAt: string;
  endsAt: string;
  meetingUrl?: string;
  recordingUrl?: string;
};

/** Send only what changes; null clears subject, teacher or a link. */
export type UpdateClassInput = {
  subjectId?: number | null;
  facultyUserId?: number | null;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  meetingUrl?: string | null;
  recordingUrl?: string | null;
  status?: ClassStatus;
};

export type AttendanceSummary = { total: number; present: number; absent: number; late: number; excused: number; percentage: number | null };

export type AttendanceRow = {
  enrollment_id: number;
  enrollment_status: string;
  student_user_id: number;
  full_name: string;
  admission_number: string | null;
  status: AttendanceStatus | null;
  marked_at: string | null;
  /** User id of whoever marked it (no name is returned). */
  marked_by: number | null;
};

export type AttendanceSheet = {
  session: { id: number; batch_id: number; title: string; starts_at: string; status: ClassStatus };
  summary: AttendanceSummary;
  students: AttendanceRow[];
};

export type CourseSubjects = {
  id: number;
  code: string;
  title: string;
  course_subjects: { id: number; subject_id: number; sort_order: number; subjects: Ref }[];
};

export const classesApi = {
  list: (token: string, params: ListClassesQuery) => request<Paginated<ClassSession>>(`/class-sessions${query(params)}`, { token }),
  /** Every class across the person's batches (admins: all) in a window of at most 31 days. */
  timetable: (token: string, params: { from?: string; to?: string } = {}) => request<ClassSession[]>(`/class-sessions/timetable${query(params)}`, { token }),
  get: (token: string, id: number) => request<ClassSession>(`/class-sessions/${id}`, { token }),
  create: (token: string, input: CreateClassInput) => request<ClassSession>("/class-sessions", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateClassInput) => request<ClassSession>(`/class-sessions/${id}`, { token, ...json("PATCH", input) }),
  cancel: (token: string, id: number) => request<ClassSession>(`/class-sessions/${id}/cancel`, { token, method: "POST" }),
  attendance: (token: string, id: number) => request<AttendanceSheet>(`/class-sessions/${id}/attendance`, { token }),
  markAttendance: (token: string, id: number, entries: { enrollmentId: number; status: AttendanceStatus }[]) =>
    request<AttendanceSheet>(`/class-sessions/${id}/attendance`, { token, ...json("PUT", { entries }) }),
};

/** Lookups the class form needs: a batch (faculty + course) and the course's subjects. */
export const classPickersApi = {
  batch: (token: string, id: number) => request<StaffBatch>(`/batches/${id}`, { token }),
  course: (token: string, id: number) => request<CourseSubjects>(`/courses/${id}`, { token }),
};

// ---- Local time helpers (the browser's time zone; the academy is in India) ----

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp -> "2026-11-12T09:30" for <input type="datetime-local">. */
export function toLocalInput(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-11-12T09:30" (local) -> ISO string for the API; "" when empty or invalid. */
export function fromLocalInput(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Local midnight `days` days from today. */
export function startOfDay(days = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
