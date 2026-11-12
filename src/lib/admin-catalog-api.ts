import { request } from "@/lib/api";
import { json, query } from "@/lib/admin-api";

/** Admin endpoints for courses, subjects, chapters and branches. Every function takes the access token first (use with `withToken`). */

// ---- Shapes (snake_case, as the API returns them) ----

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export const COURSE_STATUSES: CourseStatus[] = ["PUBLISHED", "DRAFT", "ARCHIVED"];

export type Subject = { id: number; code: string; name: string; created_at: string };

/** A subject attached to a course (row of course_subjects). */
export type CourseSubject = { id: number; course_id: number; subject_id: number; sort_order: number; subjects: Subject };

export type Course = {
  id: number;
  code: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail_asset_id: number | null;
  status: CourseStatus;
  sort_order: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

/** GET /courses and GET /courses/:id include the attached subjects; create/update responses do not. */
export type CourseWithSubjects = Course & { course_subjects: CourseSubject[] };

export type Chapter = {
  id: number;
  course_subject_id: number;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Curriculum = {
  course: Pick<Course, "id" | "code" | "slug" | "title">;
  subjects: (CourseSubject & { chapters: Chapter[] })[];
};

export type Branch = {
  id: number;
  code: string;
  name: string;
  invoice_prefix: string;
  receipt_prefix: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count: { batches: number; branch_staff: number };
};

// ---- Request bodies (camelCase; only DTO fields, unknown fields are rejected) ----

export type SubjectInput = { code: string; name: string };

export type CourseInput = {
  code: string;
  slug: string;
  title: string;
  /** null clears it. */
  description?: string | null;
  status?: CourseStatus;
  sortOrder?: number;
};

export type ChapterInput = { courseId: number; subjectId: number; title: string; description?: string; sortOrder?: number; isPublished?: boolean };
export type ChapterUpdate = { title?: string; description?: string | null; sortOrder?: number; isPublished?: boolean };

/** Optional fields take null to clear them on update. */
export type BranchInput = {
  code: string;
  name: string;
  invoicePrefix: string;
  receiptPrefix: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  isActive?: boolean;
};

// ---- Validation rules mirrored from the API DTOs ----

/** Course and subject codes: CODE_REGEX in the API (A-Z, 0-9, - and _; first character a letter or digit). */
export const CODE_PATTERN = "[A-Za-z0-9][A-Za-z0-9_\\-]*";
/** Lowercase letters, digits and single hyphens, e.g. "jee-main-2027". */
export const SLUG_PATTERN = "[a-z0-9]+(-[a-z0-9]+)*";
export const BRANCH_CODE_PATTERN = "[A-Za-z0-9]{2,20}";
export const PREFIX_PATTERN = "[A-Za-z0-9]{1,10}";
export const PINCODE_PATTERN = "[0-9]{6}";
export const GSTIN_PATTERN = "[0-9]{2}[A-Za-z0-9]{13}";
/** Browsers compile `pattern` with the v flag, so "-" inside a class must be escaped. */
export const PHONE_PATTERN = "\\+?[0-9 \\-]{10,20}";

/** "JEE Main & Advanced 2027" -> "jee-main-advanced-2027". */
export const slugify = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);

// ---- Endpoints ----

export const subjectsApi = {
  list: (token: string) => request<Subject[]>("/subjects", { token }),
  create: (token: string, input: SubjectInput) => request<Subject>("/subjects", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: Partial<SubjectInput>) => request<Subject>(`/subjects/${id}`, { token, ...json("PATCH", input) }),
  remove: (token: string, id: number) => request<void>(`/subjects/${id}`, { token, method: "DELETE" }),
};

export const coursesApi = {
  /** Staff see DRAFT and ARCHIVED courses too. */
  list: (token: string) => request<CourseWithSubjects[]>(`/courses${query({ includeAll: true })}`, { token }),
  get: (token: string, id: number) => request<CourseWithSubjects>(`/courses/${id}`, { token }),
  curriculum: (token: string, id: number) => request<Curriculum>(`/courses/${id}/curriculum`, { token }),
  create: (token: string, input: CourseInput) => request<Course>("/courses", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: Partial<CourseInput>) => request<Course>(`/courses/${id}`, { token, ...json("PATCH", input) }),
  /** 409 while chapters exist; archive instead. */
  remove: (token: string, id: number) => request<void>(`/courses/${id}`, { token, method: "DELETE" }),
  /** Adds the subject, or changes its position when already attached. */
  attachSubject: (token: string, id: number, subjectId: number, sortOrder?: number) =>
    request<CourseSubject>(`/courses/${id}/subjects/${subjectId}`, { token, ...json("PUT", sortOrder === undefined ? {} : { sortOrder }) }),
  /** 409 while chapters or questions belong to the course subject. */
  detachSubject: (token: string, id: number, subjectId: number) => request<void>(`/courses/${id}/subjects/${subjectId}`, { token, method: "DELETE" }),
};

export const chaptersApi = {
  get: (token: string, id: number) => request<Chapter>(`/chapters/${id}`, { token }),
  create: (token: string, input: ChapterInput) => request<Chapter>("/chapters", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: ChapterUpdate) => request<Chapter>(`/chapters/${id}`, { token, ...json("PATCH", input) }),
  /** 409 while study materials or questions belong to the chapter. */
  remove: (token: string, id: number) => request<void>(`/chapters/${id}`, { token, method: "DELETE" }),
};

export const branchesApi = {
  list: (token: string, includeInactive = true) => request<Branch[]>(`/branches${query({ includeInactive })}`, { token }),
  get: (token: string, id: number) => request<Branch>(`/branches/${id}`, { token }),
  create: (token: string, input: BranchInput) => request<Branch>("/branches", { token, ...json("POST", input) }),
  /** Branches are never deleted; set isActive to false instead. */
  update: (token: string, id: number, input: Partial<BranchInput>) => request<Branch>(`/branches/${id}`, { token, ...json("PATCH", input) }),
};
