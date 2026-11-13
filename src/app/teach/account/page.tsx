import type { Metadata } from "next";
import AccountPage from "@/components/portal/account-page";

export const metadata: Metadata = { title: "My account" };

export default function Page() {
  return <AccountPage />;
}
