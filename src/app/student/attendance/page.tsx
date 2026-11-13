import type { Metadata } from "next";
import StudentAttendance from "@/components/student/student-attendance";

export const metadata: Metadata = { title: "Attendance" };

export default function Page() {
  return <StudentAttendance />;
}
