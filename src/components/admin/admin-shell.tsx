"use client";

import { BookOpen, Building2, CalendarDays, ClipboardList, FileText, Globe, History, IndianRupee, Inbox, LayoutDashboard, Layers, Megaphone, NotebookPen, Users } from "lucide-react";
import PortalShell, { type PortalConfig } from "@/components/portal/portal-shell";

const config: PortalConfig = {
  base: "/admin",
  label: "Admin",
  subtitle: "Admin portal",
  roles: ["ADMIN"],
  denied: { title: "Admins only", text: "Your account does not have access to the admin portal." },
  accountHref: user => `/admin/users/${user.id}`,
  nav: [
    { group: "General", items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Enquiries", href: "/admin/enquiries", icon: Inbox },
    ] },
    { group: "Academics", items: [
      { label: "Courses & subjects", href: "/admin/courses", icon: BookOpen },
      { label: "Batches", href: "/admin/batches", icon: Layers },
      { label: "Classes & attendance", href: "/admin/classes", icon: CalendarDays },
      { label: "Study materials", href: "/admin/materials", icon: FileText },
      { label: "Assignments", href: "/admin/assignments", icon: NotebookPen },
      { label: "Exams", href: "/admin/exams", icon: ClipboardList },
    ] },
    { group: "Operations", items: [
      { label: "Fees", href: "/admin/fees", icon: IndianRupee },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    ] },
    { group: "Settings", items: [
      { label: "Branches", href: "/admin/branches", icon: Building2 },
      { label: "Website content", href: "/admin/website", icon: Globe },
      { label: "Audit log", href: "/admin/audit", icon: History },
    ] },
  ],
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return <PortalShell config={config}>{children}</PortalShell>;
}
