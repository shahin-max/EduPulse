import type { Metadata } from "next";
import TestsPage from "@/components/student/tests/tests-page";

export const metadata: Metadata = { title: "Tests" };

export default function Page() {
  return <TestsPage />;
}
