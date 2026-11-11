import { request, type RoleCode, type User } from "@/lib/api";

/** Admin endpoints of the EduPulse API. Every function takes the access token first (use with `withToken`). */

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "DISABLED";
export const USER_STATUSES: UserStatus[] = ["ACTIVE", "PENDING", "SUSPENDED", "DISABLED"];
export const ROLES: RoleCode[] = ["ADMIN", "FACULTY", "STUDENT"];

export type Paginated<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } };

export type AdminUser = User & { status: UserStatus; updated_at: string; deleted_at: string | null };

export type StudentProfile = {
  admission_number: string | null;
  date_of_birth: string | null;
  grade: string | null;
  school_name: string | null;
  guardian_name: string | null;
  guardian_mobile: string | null;
  address: string | null;
  joined_on: string | null;
};

export type FacultyProfile = {
  employee_code: string | null;
  qualification: string | null;
  specialization: string | null;
  biography: string | null;
  joined_on: string | null;
};

export type AdminUserDetail = AdminUser & { student_profiles: StudentProfile | null; faculty_profiles: FacultyProfile | null };

export type ListUsersQuery = { page?: number; limit?: number; role?: RoleCode; status?: UserStatus; search?: string; includeDeleted?: boolean };

export type CreateUserInput = { fullName: string; email?: string; mobile?: string; password?: string; roles: RoleCode[] };
export type UpdateUserInput = { fullName?: string; email?: string; mobile?: string; status?: UserStatus };

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : "";
}

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const usersApi = {
  list: (token: string, params: ListUsersQuery = {}) => request<Paginated<AdminUser>>(`/users${query(params)}`, { token }),
  get: (token: string, id: number) => request<AdminUserDetail>(`/users/${id}`, { token }),
  create: (token: string, input: CreateUserInput) => request<AdminUser & { setupToken?: string }>("/users", { token, ...json("POST", input) }),
  update: (token: string, id: number, input: UpdateUserInput) => request<AdminUser>(`/users/${id}`, { token, ...json("PATCH", input) }),
  setRoles: (token: string, id: number, roles: RoleCode[]) => request<AdminUser>(`/users/${id}/roles`, { token, ...json("PUT", { roles }) }),
  remove: (token: string, id: number) => request<void>(`/users/${id}`, { token, method: "DELETE" }),
  passwordToken: (token: string, id: number) => request<{ token: string; expiresInMinutes: number }>(`/users/${id}/password-token`, { token, method: "POST" }),
};

export const healthApi = {
  check: () => request<{ status: string; database: string; uptimeSeconds: number }>("/health"),
};

/** Link a user opens to set their password from a setup or reset token. */
export const passwordLink = (token: string) => `${typeof window === "undefined" ? "" : window.location.origin}/set-password?token=${token}`;
