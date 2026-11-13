"use client";

import type { SubmissionState } from "@/lib/teaching-api";
import { SUBMISSION_LABEL } from "@/lib/teaching-api";
import { Pill, type Tone } from "@/components/admin/ui";

export const STATE_TONES: Record<SubmissionState, Tone> = {
  REVIEWED: "green", SUBMITTED: "blue", LATE: "amber", MISSING: "red", NOT_DUE: "gray",
};

export function StatePill({ state }: { state: SubmissionState }) {
  return <Pill value={state} label={SUBMISSION_LABEL[state]} tones={STATE_TONES} />;
}

const DAY = 24 * 60 * 60 * 1000;

/** "due in 2 days", "due today", "overdue by 1 day"; null without a due date. `now` keeps render pure. */
export function dueHint(dueAt: string | null, now: number): { text: string; overdue: boolean } | null {
  if (!dueAt || !now) return null;
  const diff = new Date(dueAt).getTime() - now;
  const days = Math.round(Math.abs(diff) / DAY);
  const plural = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
  if (diff >= 0) {
    if (diff < DAY) {
      const hours = Math.max(1, Math.round(diff / (60 * 60 * 1000)));
      return { text: `due in ${hours} ${hours === 1 ? "hour" : "hours"}`, overdue: false };
    }
    return { text: `due in ${plural(days)}`, overdue: false };
  }
  return { text: days < 1 ? "overdue by a few hours" : `overdue by ${plural(days)}`, overdue: true };
}

/** "8 / 10", "8" without max marks. */
export const marksText = (marks: string | null | undefined, max: string | null | undefined) =>
  marks === null || marks === undefined ? null : `${Number(marks)}${max ? ` / ${Number(max)}` : ""}`;

/** Same rule as the API's gradebook: where the student stands on one assignment. */
export function submissionState(sub: { submitted_at: string; reviewed_at: string | null; is_late: boolean } | null, dueAt: string | null, now: number): SubmissionState {
  if (!sub) return dueAt && now && new Date(dueAt).getTime() > now ? "NOT_DUE" : "MISSING";
  if (sub.reviewed_at) return "REVIEWED";
  return sub.is_late ? "LATE" : "SUBMITTED";
}
