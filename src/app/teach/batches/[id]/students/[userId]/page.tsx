import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentReport } from "@/components/staff/reports/student-report";

export const metadata: Metadata = { title: "Student progress" };

export default async function Page({ params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(userId)) notFound();
  return <StudentReport batchId={Number(id)} userId={Number(userId)} />;
}
