"use client";

import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usersApi, type AdminUser } from "@/lib/admin-api";
import { waDigits, type EnquiryStatus } from "@/lib/admin-ops-api";
import { Pill, titleCase, type Tone } from "../ui";

export const STATUS_TONES: Record<EnquiryStatus, Tone> = {
  NEW: "blue",
  CONTACTED: "amber",
  FOLLOW_UP: "orange",
  CONVERTED: "green",
  CLOSED: "gray",
};

export const STATUS_HELP: Record<EnquiryStatus, string> = {
  NEW: "Not contacted yet",
  CONTACTED: "Spoken to once",
  FOLLOW_UP: "Needs another call",
  CONVERTED: "Joined as a student",
  CLOSED: "Not interested / no response",
};

const SOURCE_LABEL: Record<string, string> = { WEBSITE: "Callback form", WEBSITE_ADMISSION: "Admission form" };
const SOURCE_TONES: Record<string, Tone> = { WEBSITE: "blue", WEBSITE_ADMISSION: "violet" };

export function StatusPill({ status }: { status: EnquiryStatus }) {
  return <Pill value={status} tones={STATUS_TONES} />;
}

export function SourcePill({ source }: { source: string | null }) {
  if (!source) return null;
  return <Pill value={source} tones={SOURCE_TONES} label={SOURCE_LABEL[source] ?? titleCase(source)} />;
}

/** Click-to-call and WhatsApp buttons for a mobile number. */
export function ContactButtons({ mobile, name, labels = false }: { mobile: string; name: string; labels?: boolean }) {
  const size = labels ? "sm" : "icon";
  return <>
    <Button asChild variant="outline" size={size}>
      <a href={`tel:${mobile.replace(/[^\d+]/g, "")}`} aria-label={`Call ${name}`}><Phone />{labels && "Call"}</a>
    </Button>
    <Button asChild variant="outline" size={size} className="text-emerald-700 dark:text-emerald-400">
      <a href={`https://wa.me/${waDigits(mobile)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${name}`}><MessageCircle />{labels && "WhatsApp"}</a>
    </Button>
  </>;
}

/** Active admins and faculty who can be assigned enquiries, sorted by name. */
export async function loadStaff(token: string): Promise<AdminUser[]> {
  const [faculty, admins] = await Promise.all([
    usersApi.list(token, { role: "FACULTY", status: "ACTIVE", limit: 100 }),
    usersApi.list(token, { role: "ADMIN", status: "ACTIVE", limit: 100 }),
  ]);
  const byId = new Map<number, AdminUser>();
  for (const u of [...admins.data, ...faculty.data]) byId.set(u.id, u);
  return [...byId.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
}
