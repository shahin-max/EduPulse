import type { Metadata } from "next";
import StudentClasses from "@/components/student/student-classes";

export const metadata: Metadata = { title: "Timetable" };

export default function Page() {
  return <StudentClasses />;
}
