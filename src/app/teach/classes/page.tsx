import { Suspense } from "react";
import type { Metadata } from "next";
import ClassesList from "@/components/staff/classes/classes-list";

export const metadata: Metadata = { title: "Classes" };

export default function Page() {
  // ClassesList reads its starting filters from the URL (e.g. ?batch=12, ?new=1).
  return <Suspense><ClassesList /></Suspense>;
}
