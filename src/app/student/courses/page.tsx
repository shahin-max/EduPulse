import type { Metadata } from "next";
import StudentCourses from "@/components/student/student-courses";

export const metadata: Metadata = { title: "My courses" };

export default function Page() {
  return <StudentCourses />;
}
