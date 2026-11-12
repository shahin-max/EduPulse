import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FacultyBatchDetail } from "@/components/teach/faculty-batches";

export const metadata: Metadata = { title: "Batch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <FacultyBatchDetail id={Number(id)} />;
}
