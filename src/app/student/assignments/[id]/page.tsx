import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StudentAssignmentDetail from "@/components/student/assignments/assignment-detail";

export const metadata: Metadata = { title: "Assignment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <StudentAssignmentDetail id={Number(id)} />;
}
