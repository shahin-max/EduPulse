import { API_URL, ApiError, request } from "@/lib/api";
import { json, query, type Paginated } from "@/lib/admin-api";

/**
 * Study materials, assignments and files for the teaching screens (admin and faculty portals).
 * Every function takes the access token first (use with `withToken`). The API decides who may do what:
 * faculty manage only their own batches' assignments; admins and faculty both author study materials.
 */

// ---- Files ----

/** POST /files rejects anything above this (MAX_UPLOAD_BYTES in the API). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "25 MB";

export type FileAsset = {
  id: number;
  original_filename: string;
  mime_type: string;
  size_bytes?: number;
  visibility?: "PUBLIC" | "PRIVATE";
};

export function formatBytes(bytes: number | null | undefined) {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Nest errors look like { statusCode, message: string | string[] }; mirrors `request()` in lib/api. */
function errorFrom(status: number, text: string): ApiError {
  let message = `Request failed (${status})`;
  try {
    const body = JSON.parse(text);
    if (Array.isArray(body?.message)) message = body.message.join(". ");
    else if (typeof body?.message === "string") message = body.message;
  } catch {}
  if (status === 413) message = `Files may be at most ${MAX_UPLOAD_LABEL}.`;
  if (status === 429) message = "Too many attempts. Please wait a minute and try again.";
  return new ApiError(status, message);
}

/**
 * Uploads one file as multipart (field `file`) with progress (0-100). `request()` cannot be used because it
 * forces a JSON Content-Type; the browser sets the multipart boundary itself here.
 * Staff uploads are PRIVATE: students reach them only through a published material or their batch's assignment.
 */
export function uploadFile(token: string, file: File, onProgress?: (percent: number) => void, visibility: "PUBLIC" | "PRIVATE" = "PRIVATE"): Promise<FileAsset> {
  if (file.size > MAX_UPLOAD_BYTES) return Promise.reject(new ApiError(400, `Files may be at most ${MAX_UPLOAD_LABEL}.`));
  if (file.size === 0) return Promise.reject(new ApiError(400, "The file is empty."));
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("visibility", visibility);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/files`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as FileAsset); } catch { reject(new ApiError(xhr.status, "Unexpected response from the server.")); }
      } else reject(errorFrom(xhr.status, xhr.responseText));
    };
    xhr.onerror = () => reject(new ApiError(0, "Cannot reach the server. Please check your connection and try again."));
    xhr.send(body);
  });
}

/** GET /files/:id/content needs the Authorization header, so it is fetched as a blob. */
export async function fetchFileBlob(token: string, id: number): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/files/${id}/content`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Please check your connection and try again.");
  }
  if (!response.ok) throw errorFrom(response.status, await response.text().catch(() => ""));
  return response.blob();
}

// ---- Study materials ----

export type MaterialKind = "PDF_NOTE" | "WORKSHEET" | "PREVIOUS_PAPER" | "VIDEO_LINK" | "OTHER";
export const MATERIAL_KINDS: MaterialKind[] = ["PDF_NOTE", "WORKSHEET", "PREVIOUS_PAPER", "VIDEO_LINK", "OTHER"];
export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  PDF_NOTE: "PDF notes",
  WORKSHEET: "Worksheet",
  PREVIOUS_PAPER: "Previous paper",
  VIDEO_LINK: "Video",
  OTHER: "Other",
};

export type StudyMaterial = {
  id: number;
  chapter_id: number;
  title: string;
  kind: MaterialKind;
  asset_id: number | null;
  external_url: string | null;
  is_downloadable: boolean;
  is_published: boolean;
  sort_order: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  file_assets: FileAsset | null;
};

export type MaterialInput = {
  chapterId: number;
  title: string;
  kind: MaterialKind;
  assetId?: number;
  externalUrl?: string;
  isDownloadable?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
};

/** null clears assetId or externalUrl (one of them must stay set). */
export type MaterialUpdate = {
  title?: string;
  kind?: MaterialKind;
  assetId?: number | null;
  externalUrl?: string | null;
  isDownloadable?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
};

export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

/** A row of GET /study-materials/progress (one student x one material they have opened). */
export type MaterialProgress = {
  id: number;
  enrollment_id: number;
  material_id: number;
  status: ProgressStatus;
  last_accessed_at: string | null;
  completed_at: string | null;
  study_materials: { id: number; title: string; chapter_id: number };
  enrollments: { id: number; student_user_id: number; student_profiles: { users: { full_name: string } } };
};

export const materialsApi = {
  list: (token: string, chapterId: number) => request<StudyMaterial[]>(`/study-materials${query({ chapterId })}`, { token }),
  create: (token: string, input: MaterialInput) => request<StudyMaterial>("/study-materials", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: MaterialUpdate) => request<StudyMaterial>(`/study-materials/${id}`, { token, ...json("PATCH", input) }),
  /** Deletes the material and students' progress on it; the uploaded file is kept. */
  remove: (token: string, id: number) => request<void>(`/study-materials/${id}`, { token, method: "DELETE" }),
  progress: (token: string, batchId: number, page = 1, limit = 100) =>
    request<Paginated<MaterialProgress>>(`/study-materials/progress${query({ batchId, page, limit })}`, { token }),
};

// ---- Assignments ----

export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ["DRAFT", "PUBLISHED", "CLOSED"];
export const ASSIGNMENT_STATUS_HELP: Record<AssignmentStatus, string> = {
  DRAFT: "Hidden from students.",
  PUBLISHED: "Students can see and submit it. Late work is accepted and flagged.",
  CLOSED: "Visible, but no more submissions.",
};

export type Assignment = {
  id: number;
  batch_id: number;
  subject_id: number | null;
  title: string;
  instructions: string | null;
  attachment_asset_id: number | null;
  due_at: string | null;
  /** DECIMAL as a string, e.g. "20.00". */
  max_marks: string | null;
  status: AssignmentStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  subjects: { id: number; code: string; name: string } | null;
  file_assets: FileAsset | null;
  users: { id: number; full_name: string } | null;
  /** Only on GET /assignments for staff. */
  _count?: { assignment_submissions: number };
};

export type AssignmentInput = {
  batchId: number;
  subjectId?: number;
  title: string;
  instructions?: string;
  attachmentAssetId?: number;
  dueAt?: string;
  maxMarks?: number;
  status?: AssignmentStatus;
};

export type AssignmentUpdate = {
  subjectId?: number | null;
  title?: string;
  instructions?: string | null;
  attachmentAssetId?: number | null;
  dueAt?: string | null;
  maxMarks?: number | null;
  status?: AssignmentStatus;
};

export type Submission = {
  id: number;
  assignment_id: number;
  enrollment_id: number;
  batch_id: number;
  response_text: string | null;
  asset_id: number | null;
  submitted_at: string;
  marks_awarded: string | null;
  feedback: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  is_late: boolean;
  file_assets: FileAsset | null;
  enrollments: {
    id: number;
    student_user_id: number;
    student_profiles: { admission_number: string | null; users: { full_name: string } };
  };
  /** The reviewer. */
  users: { id: number; full_name: string } | null;
};

export type ReviewInput = { marksAwarded?: number; feedback?: string };

/** A row of GET /batches/:id/students. */
export type RosterEntry = {
  id: number;
  status: string;
  enrolled_at: string;
  student_profiles: {
    user_id: number;
    admission_number: string | null;
    grade: string | null;
    guardian_name: string | null;
    guardian_mobile: string | null;
    users: { full_name: string; email: string | null; mobile: string | null };
  };
};

export const assignmentsApi = {
  list: (token: string, batchId: number) => request<Assignment[]>(`/assignments${query({ batchId })}`, { token }),
  get: (token: string, id: number) => request<Assignment>(`/assignments/${id}`, { token }),
  create: (token: string, input: AssignmentInput) => request<Assignment>("/assignments", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: AssignmentUpdate) => request<Assignment>(`/assignments/${id}`, { token, ...json("PATCH", input) }),
  /** 409 once students have submitted; close it instead. */
  remove: (token: string, id: number) => request<void>(`/assignments/${id}`, { token, method: "DELETE" }),
  submissions: (token: string, id: number) => request<Submission[]>(`/assignments/${id}/submissions`, { token }),
  review: (token: string, submissionId: number, input: ReviewInput) =>
    request<Submission>(`/assignment-submissions/${submissionId}/review`, { token, ...json("PATCH", input) }),
  roster: (token: string, batchId: number) => request<RosterEntry[]>(`/batches/${batchId}/students`, { token }),
};
