import type { Metadata } from "next";
import WebsiteContent from "@/components/admin/website/website-content";

export const metadata: Metadata = { title: "Website" };

export default function Page() {
  return <WebsiteContent />;
}
