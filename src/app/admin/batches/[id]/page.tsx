import type { Metadata } from "next";
import BatchDetail from "@/components/admin/batches/batch-detail";

export const metadata: Metadata = { title: "Batch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BatchDetail id={Number(id)} />;
}
