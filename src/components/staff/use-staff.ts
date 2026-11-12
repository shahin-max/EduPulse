"use client";

import { request } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { query, type Paginated } from "@/lib/admin-api";
import { useAdminData } from "@/components/admin/use-admin-data";

/**
 * Helpers shared by the teaching screens (classes, materials, assignments, exams), which are used in
 * both the admin portal and the faculty portal. The API decides what each person may see and change:
 * admins see every batch, faculty only the batches they are assigned to (batch_faculty).
 */

export const useIsAdmin = () => useAuth().user?.roles.includes("ADMIN") ?? false;

/** A batch as the teaching screens need it (GET /batches). */
export type StaffBatch = {
  id: number;
  code: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  enrolled: number;
  courses: { id: number; code: string; slug: string; title: string };
  branches: { id: number; code: string; name: string } | null;
  faculty: { userId: number; fullName: string; subject: { id: number; code: string; name: string } }[];
};

export const batchLabel = (b: Pick<StaffBatch, "code" | "name">) => `${b.name} (${b.code})`;

/**
 * Batches the signed-in person can teach in: every batch for admins, the assigned ones for faculty
 * (`mine=true`). Completed and cancelled batches are included so old records stay reachable; pickers for
 * new work should prefer `open`.
 */
export function useStaffBatches() {
  const admin = useIsAdmin();
  const result = useAdminData(
    token => request<Paginated<StaffBatch>>(`/batches${query({ mine: admin ? undefined : true, limit: 100 })}`, { token }).then(r => r.data),
    `staff-batches:${admin}`,
  );
  const all = result.data ?? [];
  return { ...result, batches: all, open: all.filter(b => b.status === "PLANNED" || b.status === "ACTIVE") };
}
