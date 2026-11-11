import { Suspense } from "react";
import type { Metadata } from "next";
import UsersList from "@/components/admin/users-list";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  // UsersList reads its starting filters from the URL (e.g. ?role=STUDENT).
  return <Suspense><UsersList /></Suspense>;
}
