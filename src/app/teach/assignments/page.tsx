import { Suspense } from "react";
import type { Metadata } from "next";
import AssignmentsList from "@/components/staff/assignments/assignments-list";

export const metadata: Metadata = { title: "Assignments" };

export default function Page() {
  // AssignmentsList reads its starting batch from the URL (?batch=12).
  return <Suspense><AssignmentsList /></Suspense>;
}
