"use client";

import { BookOpen, CalendarCheck, CalendarDays, ClipboardList, FileText, IndianRupee, LayoutDashboard, Megaphone, NotebookPen, Trophy, UserRound } from "lucide-react";
import PortalShell, { type PortalConfig } from "@/components/portal/portal-shell";

/** The student portal: everything for the batches the student is actively enrolled in. */
const config: PortalConfig = {
  base: "/student",
  label: "Student",
  subtitle: "Student portal",
  roles: ["STUDENT"],
  denied: { title: "Students only", text: "The student portal is for enrolled EduPulse students." },
  accountHref: () => "/student/account",
  nav: [
    { group: "General", items: [
      { label: "Home", href: "/student", icon: LayoutDashboard },
      { label: "My courses", href: "/student/courses", icon: BookOpen },
      { label: "Timetable", href: "/student/classes", icon: CalendarDays },
      { label: "Notice board", href: "/student/notices", icon: Megaphone },
    ] },
    { group: "Learning", items: [
      { label: "Study materials", href: "/student/materials", icon: FileText },
      { label: "Assignments", href: "/student/assignments", icon: NotebookPen },
      { label: "Tests", href: "/student/tests", icon: ClipboardList },
    ] },
    { group: "My progress", items: [
      { label: "Results", href: "/student/results", icon: Trophy },
      { label: "Attendance", href: "/student/attendance", icon: CalendarCheck },
      { label: "Fees", href: "/student/fees", icon: IndianRupee },
    ] },
    { group: "Account", items: [
      { label: "My profile", href: "/student/account", icon: UserRound },
    ] },
  ],
};

export default function StudentShell({ children }: { children: React.ReactNode }) {
  return <PortalShell config={config}>{children}</PortalShell>;
}
