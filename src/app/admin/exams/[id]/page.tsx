import type { Metadata } from "next";
import ExamDetail from "@/components/staff/exams/exam-detail";

export const metadata: Metadata = { title: "Exam" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExamDetail id={Number(id)} />;
}
