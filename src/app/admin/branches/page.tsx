import type { Metadata } from "next";
import BranchesList from "@/components/admin/branches/branches-list";

export const metadata: Metadata = { title: "Branches" };

export default function Page() {
  return <BranchesList />;
}
