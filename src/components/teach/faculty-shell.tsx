"use client";

import { CalendarDays, ClipboardList, FileText, LayoutDashboard, Layers, NotebookPen } from "lucide-react";
import PortalShell, { type PortalConfig } from "@/components/portal/portal-shell";

/** The faculty portal. Admins may open it too (e.g. an admin who also teaches). */
const config: PortalConfig = {
  base: "/teach",
  label: "Faculty",
  subtitle: "Faculty portal",
  roles: ["FACULTY", "ADMIN"],
  denied: { title: "Faculty only", text: "The faculty portal is for EduPulse teachers. Ask the academy if you should have access." },
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
  ],
};

export default function FacultyShell({ children }: { children: React.ReactNode }) {
  return <PortalShell config={config}>{children}</PortalShell>;
}
