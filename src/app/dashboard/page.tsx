import { redirect } from "next/navigation";

/** The old account page; students now have the student portal. */
export default function Page() {
  redirect("/student");
}
