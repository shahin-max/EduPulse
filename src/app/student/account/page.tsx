import type { Metadata } from "next";
import AccountPage from "@/components/portal/account-page";

export const metadata: Metadata = { title: "My profile" };

export default function Page() {
  return <AccountPage />;
}
