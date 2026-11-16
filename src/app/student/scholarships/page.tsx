import { Suspense } from "react";
import type { Metadata } from "next";
import StudentScholarships from "@/components/student/scholarships/student-scholarships";

export const metadata: Metadata = { title: "Scholarship tests" };

export default function Page() {
  // useSearchParams (the ?test= highlight from notifications) needs a Suspense boundary.
  return <Suspense><StudentScholarships /></Suspense>;
}
