import { request, type User } from "@/lib/api";
import { json, type FacultyProfile } from "@/lib/admin-api";

/** The signed-in person's own account: password and (for faculty) teaching profile. */

/** Same rule as the API's PASSWORD_REGEX: 8-72 characters with a letter and a number. */
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const PASSWORD_HINT = "8 to 72 characters, with at least one letter and one number.";

/** GET /faculty/me: the profile plus the batches and subjects the person teaches. */
export type MyFacultyProfile = FacultyProfile & {
  user_id: number;
  users: { id: number; full_name: string; email: string | null; mobile: string | null; status: string; photo_url: string | null };
  batch_faculty: { subjects: { id: number; code: string; name: string }; batches: { id: number; code: string; name: string; status: string } }[];
};

/** Fields faculty may change themselves (employee code and joining date are set by admins). */
export type FacultySelfInput = { qualification?: string; specialization?: string; biography?: string };

/** Same limits as the API: JPEG, PNG, WebP or GIF up to 5 MB. */
export const PHOTO_TYPES = "image/jpeg,image/png,image/webp,image/gif";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const photoBody = (file: File) => { const body = new FormData(); body.append("photo", file); return body; };

/** Profile photos (stored on Cloudinary). Each call returns the updated user. */
export const photoApi = {
  setMine: (token: string, file: File) => request<User>("/me/photo", { token, method: "PUT", body: photoBody(file) }),
  removeMine: (token: string) => request<User>("/me/photo", { token, method: "DELETE" }),
  /** Admin only. */
  setFor: (token: string, userId: number, file: File) => request<User>(`/users/${userId}/photo`, { token, method: "PUT", body: photoBody(file) }),
  removeFor: (token: string, userId: number) => request<User>(`/users/${userId}/photo`, { token, method: "DELETE" }),
};

export const accountApi = {
  /** Signs out every other device; this session stays signed in. */
  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    request<void>("/auth/password", { token, ...json("PATCH", { currentPassword, newPassword }) }),
  myFacultyProfile: (token: string) => request<MyFacultyProfile>("/faculty/me", { token }),
  updateMyFacultyProfile: (token: string, input: FacultySelfInput) => request<MyFacultyProfile>("/faculty/me", { token, ...json("PATCH", input) }),
};
