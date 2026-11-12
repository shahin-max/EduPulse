import type { Metadata } from "next";
import { FacultyBatches } from "@/components/teach/faculty-batches";

export const metadata: Metadata = { title: "My batches" };

export default function Page() {
  return <FacultyBatches />;
}
