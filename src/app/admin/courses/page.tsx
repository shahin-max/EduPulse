import { Suspense } from "react";
import type { Metadata } from "next";
import CoursesAdmin from "@/components/admin/courses/courses-admin";

export const metadata: Metadata = { title: "Courses & subjects" };

export default function Page() {
  // CoursesAdmin reads its starting tab from the URL (?tab=subjects).
  return <Suspense><CoursesAdmin /></Suspense>;
}
