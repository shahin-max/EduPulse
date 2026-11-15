"use client";

import { CalendarDays, ClipboardList, FileText, Inbox, LayoutDashboard, Layers, Megaphone, NotebookPen, UserRound } from "lucide-react";
import PortalShell, { type PortalConfig } from "@/components/portal/portal-shell";

/**
 * The faculty portal, for accounts with the Faculty role only. An admin who also teaches gets the
 * Faculty role added (Admin → Users → Roles); admins already have every teaching screen in /admin.
 */
const config: PortalConfig = {
  base: "/teach",
  label: "Faculty",
  subtitle: "Faculty portal",
  roles: ["FACULTY"],
  denied: { title: "Faculty only", text: "The faculty portal is for accounts with the Faculty role. Admins: add the Faculty role to your account under Users if you also teach." },
  accountHref: () => "/teach/account",
  nav: [
    { group: "General", items: [
      { label: "Overview", href: "/teach", icon: LayoutDashboard },
      { label: "My batches", href: "/teach/batches", icon: Layers },
    ] },
    { group: "Teaching", items: [
      { label: "Classes & attendance", href: "/teach/classes", icon: CalendarDays },
      { label: "Study materials", href: "/teach/materials", icon: FileText },
      { label: "Assignments", href: "/teach/assignments", icon: NotebookPen },
      { label: "Exams", href: "/teach/exams", icon: ClipboardList },
    ] },
    { group: "Communication", items: [
      { label: "Announcements", href: "/teach/announcements", icon: Megaphone },
      { label: "My enquiries", href: "/teach/enquiries", icon: Inbox },
    ] },
    { group: "Account", items: [
      { label: "My profile", href: "/teach/account", icon: UserRound },
    ] },
  ],
};

export default function FacultyShell({ children }: { children: React.ReactNode }) {
  return <PortalShell config={config}>{children}</PortalShell>;
}
