import { request } from "@/lib/api";
import { json, query, type Paginated } from "@/lib/admin-api";

/**
 * Admin endpoints for operations screens: admission enquiries, announcements, website content and
 * the audit log. Every function takes the access token first (use with `withToken`).
 * Request bodies only carry fields the API's DTOs accept (unknown fields are rejected with 400).
 */

type Ref = { id: number; full_name: string };

/** Minimal course and batch shapes, enough for pickers and labels. */
export type CourseOption = { id: number; code: string; title: string; status?: string };
export type BatchOption = { id: number; code: string; name: string; status?: string };

// ---------------------------------------------------------------------------
// Admission enquiries
// ---------------------------------------------------------------------------

export type EnquiryStatus = "NEW" | "CONTACTED" | "FOLLOW_UP" | "CONVERTED" | "CLOSED";
export const ENQUIRY_STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "CLOSED"];

export type Enquiry = {
  id: number;
  student_name: string;
  email: string | null;
  mobile: string;
  interested_course_id: number | null;
  branch_id: number | null;
  message: string | null;
  /** WEBSITE (callback form), WEBSITE_ADMISSION (admission form), or a label such as WALK_IN. */
  source: string | null;
  status: EnquiryStatus;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  courses: { id: number; code: string; title: string } | null;
  users: Ref | null;
};

export type ListEnquiriesQuery = { page?: number; limit?: number; status?: EnquiryStatus; courseId?: number; assignedTo?: number; search?: string };
export type UpdateEnquiryInput = { status?: EnquiryStatus; assignedTo?: number | null };

export const enquiriesApi = {
  list: (token: string, params: ListEnquiriesQuery = {}) => request<Paginated<Enquiry>>(`/admission-enquiries${query(params)}`, { token }),
  get: (token: string, id: number) => request<Enquiry>(`/admission-enquiries/${id}`, { token }),
  update: (token: string, id: number, input: UpdateEnquiryInput) => request<Enquiry>(`/admission-enquiries/${id}`, { token, ...json("PATCH", input) }),
};

/** Courses for the enquiry filter (staff see drafts and archived ones too with includeAll). */
export const listCourses = (token: string) => request<CourseOption[]>(`/courses${query({ includeAll: true })}`, { token });

/** Batches for the announcement picker (the API caps limit at 100). */
export const listBatches = (token: string) => request<Paginated<BatchOption>>(`/batches${query({ limit: 100 })}`, { token });

/** `+91 98765 43210` -> `919876543210` for https://wa.me/ links. */
export const waDigits = (mobile: string) => mobile.replace(/\D/g, "");

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export const ANNOUNCEMENT_STATUSES: AnnouncementStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

/** BRANCH exists in the schema but the API refuses it until branch membership exists, so it is not offered. */
export type AnnouncementAudience = "ALL" | "ADMINS" | "FACULTY" | "STUDENTS" | "BATCH" | "BRANCH";
export const AUDIENCES: Exclude<AnnouncementAudience, "BRANCH">[] = ["ALL", "STUDENTS", "FACULTY", "ADMINS", "BATCH"];

export type Announcement = {
  id: number;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  batch_id: number | null;
  branch_id: number | null;
  status: AnnouncementStatus;
  publish_at: string | null;
  created_by: number | null;
  created_at: string;
  batches: BatchOption | null;
  users: Ref | null;
};

export type ListAnnouncementsQuery = { page?: number; limit?: number; status?: AnnouncementStatus; audience?: AnnouncementAudience; batchId?: number };

export type CreateAnnouncementInput = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  /** Required when audience is BATCH, and only then. */
  batchId?: number;
  /** ISO date-time; schedules visibility and notifications. */
  publishAt?: string;
  publish?: boolean;
};

export type UpdateAnnouncementInput = {
  title?: string;
  body?: string;
  audience?: AnnouncementAudience;
  batchId?: number | null;
  publishAt?: string | null;
};

export const announcementsApi = {
  list: (token: string, params: ListAnnouncementsQuery = {}) => request<Paginated<Announcement>>(`/announcements${query(params)}`, { token }),
  get: (token: string, id: number) => request<Announcement>(`/announcements/${id}`, { token }),
  create: (token: string, input: CreateAnnouncementInput) => request<Announcement>("/announcements", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateAnnouncementInput) => request<Announcement>(`/announcements/${id}`, { token, ...json("PATCH", input) }),
  publish: (token: string, id: number) => request<Announcement>(`/announcements/${id}/publish`, { token, method: "POST" }),
  archive: (token: string, id: number) => request<Announcement>(`/announcements/${id}/archive`, { token, method: "POST" }),
  remove: (token: string, id: number) => request<void>(`/announcements/${id}`, { token, method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Website content
// ---------------------------------------------------------------------------

export type ContentBlock = {
  id: number;
  content_key: string;
  title: string | null;
  body: string | null;
  image_asset_id: number | null;
  is_published: boolean;
  sort_order: number;
  updated_by: number | null;
  updated_at: string;
};

export type UpsertContentInput = { title?: string | null; body?: string | null; isPublished?: boolean; sortOrder?: number };

/** Same rule as the API: lowercase letters, digits, ".", "_" or "-", max 100, e.g. home.hero. */
export const CONTENT_KEY = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export const websiteContentApi = {
  list: (token: string, prefix?: string) => request<ContentBlock[]>(`/website-content${query({ includeUnpublished: true, prefix })}`, { token }),
  upsert: (token: string, key: string, input: UpsertContentInput) => request<ContentBlock>(`/website-content/${encodeURIComponent(key)}`, { token, ...json("PUT", input) }),
  remove: (token: string, key: string) => request<void>(`/website-content/${encodeURIComponent(key)}`, { token, method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type AuditLog = {
  id: number;
  actor_user_id: number | null;
  branch_id: number | null;
  /** "<Controller>.<handler>", e.g. "Users.update". */
  action: string;
  /** Controller name, e.g. "Users", "Batches". */
  entity_type: string;
  entity_id: string | null;
  /** Written by the API's audit interceptor; older rows may differ. */
  metadata: { method?: string; path?: string; params?: Record<string, string>; fields?: string[] } | null;
  ip_address: string | null;
  created_at: string;
  users: Ref | null;
};

/** `from`/`to` are ISO date-times. */
export type ListAuditLogsQuery = { page?: number; limit?: number; actorUserId?: number; entityType?: string; entityId?: string; from?: string; to?: string };

export const auditApi = {
  list: (token: string, params: ListAuditLogsQuery = {}) => request<Paginated<AuditLog>>(`/audit-logs${query(params)}`, { token }),
};
