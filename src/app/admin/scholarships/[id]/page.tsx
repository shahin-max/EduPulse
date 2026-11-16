import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ScholarshipDetail from "@/components/admin/scholarships/scholarship-detail";

export const metadata: Metadata = { title: "Scholarship test" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ScholarshipDetail id={Number(id)} />;
}
