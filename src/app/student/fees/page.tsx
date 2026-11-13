import type { Metadata } from "next";
import StudentFees from "@/components/student/student-fees";

export const metadata: Metadata = { title: "Fees" };

export default function Page() {
  return <StudentFees />;
}
