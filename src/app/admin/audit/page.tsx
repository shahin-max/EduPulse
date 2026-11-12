import type { Metadata } from "next";
import AuditLogList from "@/components/admin/audit/audit-log";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  return <AuditLogList />;
}
