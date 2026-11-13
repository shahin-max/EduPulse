import type { Metadata } from "next";
import ResultsPage from "@/components/student/tests/results-page";

export const metadata: Metadata = { title: "Results" };

export default function Page() {
  return <ResultsPage />;
}
