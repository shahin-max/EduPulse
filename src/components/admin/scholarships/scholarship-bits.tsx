"use client";

import { SCHOLARSHIP_STATUS_LABEL, type ScholarshipStatus, type ScholarshipTest } from "@/lib/scholarships-api";
import { formatDate, Pill, type Tone } from "../ui";

const TONES: Record<ScholarshipStatus, Tone> = { DRAFT: "amber", OPEN: "green", RESULTS_PUBLISHED: "blue" };

export function ScholarshipStatusPill({ status }: { status: ScholarshipStatus }) {
  return <Pill value={status} tones={TONES} label={SCHOLARSHIP_STATUS_LABEL[status]} />;
}

/** "12 Jan 2027, 10:00 am – 12 Jan 2027, 12:00 pm · 60 min". */
export function testWindow(t: Pick<ScholarshipTest, "exams">) {
  const { opens_at, closes_at, duration_minutes } = t.exams;
  const range = opens_at || closes_at ? `${formatDate(opens_at, true)} – ${formatDate(closes_at, true)}` : "No window set";
  return `${range} · ${duration_minutes} min`;
}

export const questionCount = (t: Pick<ScholarshipTest, "exams">) => t.exams._count.exam_questions;
