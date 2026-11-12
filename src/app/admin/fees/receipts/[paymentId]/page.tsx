import type { Metadata } from "next";
import Receipt from "@/components/admin/fees/receipt";

export const metadata: Metadata = { title: "Receipt" };

export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  return <Receipt paymentId={Number(paymentId)} />;
}
