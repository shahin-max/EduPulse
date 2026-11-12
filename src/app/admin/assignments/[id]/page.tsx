import type { Metadata } from "next";
import AssignmentDetail from "@/components/staff/assignments/assignment-detail";

export const metadata: Metadata = { title: "Assignment" };

export default function Page() {
  return <AssignmentDetail />;
}
