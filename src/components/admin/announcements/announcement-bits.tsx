"use client";

import type { Announcement, AnnouncementAudience } from "@/lib/admin-ops-api";
import { Pill, type Tone } from "../ui";

export const AUDIENCE_HELP: Record<AnnouncementAudience, string> = {
  ALL: "Everyone who logs in: students, faculty and admins.",
  STUDENTS: "All students.",
  FACULTY: "All faculty members.",
  ADMINS: "Admins only.",
  BATCH: "Students enrolled in one batch and its faculty.",
  BRANCH: "Not available yet.",
};

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  ALL: "Everyone", STUDENTS: "Students", FACULTY: "Faculty", ADMINS: "Admins", BATCH: "One batch", BRANCH: "Branch",
};

export function audienceLabel(a: Pick<Announcement, "audience" | "batches">) {
  if (a.audience === "BATCH" && a.batches) return `Batch: ${a.batches.name}`;
  return AUDIENCE_LABEL[a.audience];
}

/** Published with a future publish_at: not visible yet. */
export const isScheduled = (a: Announcement) => a.status === "PUBLISHED" && !!a.publish_at && new Date(a.publish_at) > new Date();

const TONES: Record<string, Tone> = { DRAFT: "amber", PUBLISHED: "green", ARCHIVED: "gray", SCHEDULED: "blue" };

export function StatusPill({ announcement }: { announcement: Announcement }) {
  return isScheduled(announcement)
    ? <Pill value="SCHEDULED" tones={TONES} />
    : <Pill value={announcement.status} tones={TONES} />;
}
