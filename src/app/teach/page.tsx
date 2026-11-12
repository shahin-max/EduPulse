import type { Metadata } from "next";
import FacultyOverview from "@/components/teach/faculty-overview";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <FacultyOverview />;
}
