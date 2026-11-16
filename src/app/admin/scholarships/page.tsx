import type { Metadata } from "next";
import ScholarshipsList from "@/components/admin/scholarships/scholarships-list";

export const metadata: Metadata = { title: "Scholarship tests" };

export default function Page() {
  return <ScholarshipsList />;
}
