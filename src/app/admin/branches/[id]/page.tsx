import type { Metadata } from "next";
import BranchDetail from "@/components/admin/branches/branch-detail";

export const metadata: Metadata = { title: "Branch" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BranchDetail id={Number(id)} />;
}
