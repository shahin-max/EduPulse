import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClassDetail from "@/components/staff/classes/class-detail";

export const metadata: Metadata = { title: "Class" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ClassDetail id={Number(id)} />;
}
