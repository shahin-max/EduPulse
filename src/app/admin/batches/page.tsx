import { Suspense } from "react";
import type { Metadata } from "next";
import BatchesList from "@/components/admin/batches/batches-list";

export const metadata: Metadata = { title: "Batches" };

export default function Page() {
  // BatchesList reads its starting filters from the URL (e.g. ?branchId=1&status=ACTIVE, ?new=1).
  return <Suspense><BatchesList /></Suspense>;
}
