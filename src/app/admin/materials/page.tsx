import type { Metadata } from "next";
import MaterialsLibrary from "@/components/staff/materials/materials-library";

export const metadata: Metadata = { title: "Study materials" };

export default function Page() {
  return <MaterialsLibrary />;
}
