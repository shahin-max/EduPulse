import { Suspense } from "react";
import type { Metadata } from "next";
import StudentMaterials from "@/components/student/materials/student-materials";

export const metadata: Metadata = { title: "Study materials" };

export default function Page() {
  // The course comes from the URL (?course=12), which needs a Suspense boundary.
  return <Suspense><StudentMaterials /></Suspense>;
}
