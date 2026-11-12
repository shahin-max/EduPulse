import { Suspense } from "react";
import type { Metadata } from "next";
import ExamsPage from "@/components/staff/exams/exams-page";

export const metadata: Metadata = { title: "Exams" };

export default function Page() {
  // ExamsPage reads its tab from the URL (?tab=questions).
  return <Suspense><ExamsPage /></Suspense>;
}
