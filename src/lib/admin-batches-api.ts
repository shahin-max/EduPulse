import { request } from "@/lib/api";
import { json, query, type Paginated } from "@/lib/admin-api";

/** Admin endpoints for batches, faculty assignment and enrollments. Every function takes the access token first. */

export type BatchStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export const BATCH_STATUSES: BatchStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];

/** PENDING and ACTIVE hold a seat; the others free it. */
export type EnrollmentStatus = "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["ACTIVE", "PENDING", "PAUSED", "COMPLETED", "CANCELLED"];
export const SEAT_STATUSES: EnrollmentStatus[] = ["PENDING", "ACTIVE"];

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type SubjectRef = { id: number; code: string; name: string };

export type BatchFaculty = { userId: number; fullName: string; subject: SubjectRef };

export type Batch = {
  id: number;
  branch_id: number;
  course_id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  /** null means unlimited. */
  capacity: number | null;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
  branches: { id: number; code: string; name: string };
  courses: { id: number; code: string; slug: string; title: string; status?: CourseStatus };
  faculty: BatchFaculty[];
  /** PENDING + ACTIVE enrollments. */
  enrolled: number;
  /** null when capacity is unlimited. */
  seatsAvailable: number | null;
};

export type ListBatchesQuery = { page?: number; limit?: number; branchId?: number; courseId?: number; status?: BatchStatus; search?: string };

export type CreateBatchInput = {
  branchId: number;
  courseId: number;
  code: string;
  name: string;
  /** YYYY-MM-DD */
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  status?: BatchStatus;
};
/** The branch cannot be changed after creation. */
export type UpdateBatchInput = Partial<Omit<CreateBatchInput, "branchId">>;

export type RosterEntry = {
  id: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  access_starts_at: string | null;
  access_ends_at: string | null;
  student_profiles: {
    user_id: number;
    admission_number: string | null;
    grade: string | null;
    guardian_name: string | null;
    guardian_mobile: string | null;
    users: { full_name: string; email: string | null; mobile: string | null };
  };
};

export type Enrollment = {
  id: number;
  student_user_id: number;
  batch_id: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  access_starts_at: string | null;
  access_ends_at: string | null;
};

export type CreateEnrollmentInput = {
  studentUserId: number;
  batchId: number;
  status?: "PENDING" | "ACTIVE";
  /** YYYY-MM-DD */
  accessStartsAt?: string;
  accessEndsAt?: string;
};
export type UpdateEnrollmentInput = { status?: EnrollmentStatus; accessStartsAt?: string | null; accessEndsAt?: string | null };

/** Minimal branch and course shapes for the pickers (the catalog screens own the full types). */
export type BranchOption = { id: number; code: string; name: string; city: string | null; is_active: boolean };
export type CourseOption = {
  id: number;
  code: string;
  title: string;
  status: CourseStatus;
  course_subjects: { id: number; subject_id: number; sort_order: number; subjects: SubjectRef }[];
};

export const batchesApi = {
  list: (token: string, params: ListBatchesQuery = {}) => request<Paginated<Batch>>(`/batches${query(params)}`, { token }),
  get: (token: string, id: number) => request<Batch>(`/batches/${id}`, { token }),
  create: (token: string, input: CreateBatchInput) => request<Batch>("/batches", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateBatchInput) => request<Batch>(`/batches/${id}`, { token, ...json("PATCH", input) }),
  remove: (token: string, id: number) => request<void>(`/batches/${id}`, { token, method: "DELETE" }),
  assignFaculty: (token: string, id: number, facultyUserId: number, subjectId: number) =>
    request<Batch>(`/batches/${id}/faculty`, { token, ...json("POST", { facultyUserId, subjectId }) }),
  unassignFaculty: (token: string, id: number, facultyUserId: number, subjectId: number) =>
    request<void>(`/batches/${id}/faculty/${facultyUserId}/subjects/${subjectId}`, { token, method: "DELETE" }),
  roster: (token: string, id: number) => request<RosterEntry[]>(`/batches/${id}/students`, { token }),
};

export const enrollmentsApi = {
  create: (token: string, input: CreateEnrollmentInput) => request<Enrollment>("/enrollments", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateEnrollmentInput) => request<Enrollment>(`/enrollments/${id}`, { token, ...json("PATCH", input) }),
};

export const batchPickersApi = {
  /** All branches, inactive included (old batches may belong to one). New batches need an active branch. */
  branches: (token: string) => request<BranchOption[]>(`/branches${query({ includeInactive: true })}`, { token }),
  /** Every course, draft and archived included (staff only). */
  courses: (token: string) => request<CourseOption[]>(`/courses${query({ includeAll: true })}`, { token }),
  course: (token: string, id: number) => request<CourseOption>(`/courses/${id}`, { token }),
};

/** "2027-04-01T00:00:00.000Z" -> "2027-04-01" for a date input (DATE columns come back as UTC midnight). */
export const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");
