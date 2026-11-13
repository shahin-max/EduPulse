import type { Metadata } from "next";
import { NoticeBoard } from "@/components/teach/faculty-announcements";

export const metadata: Metadata = { title: "Notice board" };

export default function Page() {
  return <NoticeBoard description="Announcements from the academy and your teachers." />;
}
