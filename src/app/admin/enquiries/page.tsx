import type { Metadata } from "next";
import EnquiriesList from "@/components/admin/enquiries/enquiries-list";

export const metadata: Metadata = { title: "Enquiries" };

export default function Page() {
  return <EnquiriesList />;
}
