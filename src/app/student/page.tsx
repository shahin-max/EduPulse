import type { Metadata } from "next";
import StudentHome from "@/components/student/student-home";

export const metadata: Metadata = { title: "Home" };

export default function Page() {
  return <StudentHome />;
}
