import { Suspense } from "react";
import type { Metadata } from "next";
import FeesPage from "@/components/admin/fees/fees-page";

export const metadata: Metadata = { title: "Fees" };

export default function Page() {
  // FeesPage reads its starting tab from the URL (?tab=plans).
  return <Suspense><FeesPage /></Suspense>;
}
