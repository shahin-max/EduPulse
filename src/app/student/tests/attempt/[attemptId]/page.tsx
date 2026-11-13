import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AttemptPage from "@/components/student/tests/attempt-page";

export const metadata: Metadata = { title: "Test" };

export default async function Page({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  if (!/^\d+$/.test(attemptId)) notFound();
  return <AttemptPage attemptId={Number(attemptId)} />;
}
