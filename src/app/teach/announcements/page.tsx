import type { Metadata } from "next";
import FacultyAnnouncements from "@/components/teach/faculty-announcements";

export const metadata: Metadata = { title: "Announcements" };

export default function Page() {
  return <FacultyAnnouncements />;
}
