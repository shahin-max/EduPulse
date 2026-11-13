import type { Metadata } from "next";
import StudentAssignments from "@/components/student/assignments/assignments-list";

export const metadata: Metadata = { title: "Assignments" };

export default function Page() {
  return <StudentAssignments />;
}
