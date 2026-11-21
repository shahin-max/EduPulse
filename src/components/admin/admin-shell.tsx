"use client";

import { BookOpen, Building2, CalendarDays, ClipboardList, FileText, Globe, History, IndianRupee, Inbox, LayoutDashboard, Layers, Megaphone, NotebookPen, Trophy, Users } from "lucide-react";
import PortalShell, { type PortalConfig } from "@/components/portal/portal-shell";
import { BranchScopeProvider, BranchSwitcher } from "./branch-scope";

const config: PortalConfig = {
  base: "/admin",
  label: "Admin",
  subtitle: "Admin portal",
  // Head office (ADMIN) and branch admins; head-office-only sections are marked below.
  roles: ["ADMIN", "BRANCH_ADMIN"],
  denied: { title: "Admins only", text: "Your account does not have access to the admin portal." },
  accountHref: () => "/admin/account",
  toolbar: BranchSwitcher,
  nav: [
    { group: "General", items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Enquiries", href: "/admin/enquiries", icon: Inbox },
    ] },
    { group: "Academics", items: [
      { label: "Courses & subjects", href: "/admin/courses", icon: BookOpen, headOfficeOnly: true },
      { label: "Batches", href: "/admin/batches", icon: Layers },
      { label: "Classes & attendance", href: "/admin/classes", icon: CalendarDays },
      { label: "Study materials", href: "/admin/materials", icon: FileText, headOfficeOnly: true },
      { label: "Assignments", href: "/admin/assignments", icon: NotebookPen, headOfficeOnly: true },
      { label: "Exams", href: "/admin/exams", icon: ClipboardList, headOfficeOnly: true },
    ] },
    { group: "Operations", items: [
      { label: "Fees", href: "/admin/fees", icon: IndianRupee },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "Scholarship tests", href: "/admin/scholarships", icon: Trophy, headOfficeOnly: true },
    ] },
    { group: "Settings", items: [
      { label: "Branches", href: "/admin/branches", icon: Building2 },
      { label: "Website content", href: "/admin/website", icon: Globe, headOfficeOnly: true },
      { label: "Audit log", href: "/admin/audit", icon: History, headOfficeOnly: true },
    ] },
  ],
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return <BranchScopeProvider><PortalShell config={config}>{children}</PortalShell></BranchScopeProvider>;
}
