import type { Metadata } from "next";
import WebsiteEditor from "@/components/admin/website/website-editor";

export const metadata: Metadata = { title: "Website" };

export default function Page() {
  return <WebsiteEditor />;
}
