import type { Metadata } from "next";
import AnnouncementsList from "@/components/admin/announcements/announcements-list";

export const metadata: Metadata = { title: "Announcements" };

export default function Page() {
  return <AnnouncementsList />;
}
