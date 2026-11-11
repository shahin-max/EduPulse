/**
 * Thin client for the EduPulse API (the NestJS app in ../Edupulse-api).
 * Base URL comes from NEXT_PUBLIC_API_URL, e.g. http://localhost:34567/api/v1
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:34567/api/v1").replace(/\/+$/, "");

export type RoleCode = "ADMIN" | "FACULTY" | "STUDENT";

/** Mirrors SafeUser in the API (field names are snake_case, ids are numbers). */
export type User = {
  id: number;
  public_id: string;
  full_name: string;
  email: string | null;
  mobile: string | null;
  status: string;
  email_verified_at: string | null;
  mobile_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  roles: RoleCode[];
};

export type AuthTokens = {
  tokenType: "Bearer";
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: User;
};

export type RegisterInput = {
  fullName: string;
  email?: string;
  mobile?: string;
  password: string;
  grade?: string;
  schoolName?: string;
  guardianName?: string;
  guardianMobile?: string;
};

export type LoginInput = { login: string; password: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Nest errors look like { statusCode, message: string | string[], error }. */
async function toError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  try {
    const body = await response.json();
    if (Array.isArray(body?.message)) message = body.message.join(". ");
    else if (typeof body?.message === "string") message = body.message;
  } catch {}
  if (response.status === 429) message = "Too many attempts. Please wait a minute and try again.";
  return new ApiError(response.status, message);
}

export async function request<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Please check your connection and try again.");
  }
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  register: (input: RegisterInput) => request<AuthTokens>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  login: (input: LoginInput) => request<AuthTokens>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  refresh: (refreshToken: string) => request<AuthTokens>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  me: (token: string) => request<User>("/auth/me", { token }),
  logout: (token: string) => request<void>("/auth/logout", { method: "POST", token }),
  resetPassword: (token: string, newPassword: string) => request<void>("/auth/password/reset", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
};

/** Where a user lands after logging in: admins go to the admin portal, everyone else to their dashboard. */
export const homeFor = (user: Pick<User, "roles"> | null) => user?.roles.includes("ADMIN") ? "/admin" : "/dashboard";
