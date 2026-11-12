"use client";

import { useAdminData } from "@/components/admin/use-admin-data";
import { Pill, titleCase, type Tone } from "@/components/admin/ui";
import { coursesApi } from "@/lib/admin-catalog-api";
import type { AttemptStatus, Difficulty, ExamKind, ExamStatus, RankingPolicy } from "@/lib/staff-exams-api";
import { cn } from "@/lib/utils";

export const ALL = "all";

export const EXAM_STATUS_TONES: Record<ExamStatus, Tone> = { DRAFT: "amber", PUBLISHED: "green", CLOSED: "gray" };
export const DIFFICULTY_TONES: Record<Difficulty, Tone> = { EASY: "green", MEDIUM: "blue", HARD: "red" };
export const ATTEMPT_TONES: Record<AttemptStatus, Tone> = { IN_PROGRESS: "blue", SUBMITTED: "green", AUTO_SUBMITTED: "violet", INVALIDATED: "red" };

export const KIND_LABEL: Record<ExamKind, string> = {
  DAILY_PRACTICE: "Daily practice",
  CHAPTER_TEST: "Chapter test",
  MOCK_TEST: "Mock test",
  OMR_PRACTICE: "OMR practice",
};

export const POLICY_HELP: Record<RankingPolicy, string> = {
  FIRST: "First attempt counts",
  BEST: "Best score counts",
  LATEST: "Latest attempt counts",
};

export const STATUS_HELP: Record<ExamStatus, string> = {
  DRAFT: "Hidden from students while you build it.",
  PUBLISHED: "Students of the assigned batches can take it inside the open/close window.",
  CLOSED: "No new attempts; results stay available.",
};

export function ExamStatusPill({ status, className }: { status: ExamStatus; className?: string }) {
  return <Pill value={status} tones={EXAM_STATUS_TONES} className={className} />;
}

export function DifficultyPill({ value }: { value: Difficulty }) {
  return <Pill value={value} tones={DIFFICULTY_TONES} />;
}

export function AttemptStatusPill({ status }: { status: AttemptStatus }) {
  return <Pill value={status} tones={ATTEMPT_TONES} label={status === "AUTO_SUBMITTED" ? "Auto-submitted" : titleCase(status)} />;
}

/** A row of buttons that behaves like tabs (copied from the courses screens). */
export function SegmentedTabs<T extends string>({ value, onChange, tabs, label, className }: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return <div role="tablist" aria-label={label} className={cn("inline-flex w-full max-w-full overflow-x-auto rounded-lg bg-muted p-1 sm:w-auto", className)}>
    {tabs.map(tab => <button key={tab.value} type="button" role="tab" aria-selected={value === tab.value} onClick={() => onChange(tab.value)}
      className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none sm:px-4",
        value === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
      {tab.label}
    </button>)}
  </div>;
}

/** "2.50" -> "2.5", "10.00" -> "10". */
export function formatMarks(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Sum of DECIMAL strings, done in hundredths to avoid float drift. */
export const sumMarks = (values: (string | number)[]) => values.reduce<number>((sum, v) => sum + Math.round(Number(v) * 100), 0) / 100;

/** ISO string -> value for <input type="datetime-local"> in the viewer's time zone. */
export function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO string, or null when empty. */
export const fromLocalInput = (value: string) => value ? new Date(value).toISOString() : null;

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "1h 05m 12s" between two timestamps. */
export function formatDuration(from: string, to: string | null) {
  if (!to) return "—";
  const total = Math.max(Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000), 0);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Marks inputs accept up to 2 decimals (the API rejects more). */
export const MARKS_PATTERN = "\\d{1,4}(\\.\\d{1,2})?";

/** Every course with its subjects (GET /courses?includeAll=true); staff only. */
export function useCourses() {
  const result = useAdminData(token => coursesApi.list(token), "staff-exam-courses");
  return { ...result, courses: result.data ?? [] };
}

/** Subjects and chapters of a course, or null while no course is chosen. */
export function useCurriculum(courseId: number | undefined) {
  const result = useAdminData(token => courseId ? coursesApi.curriculum(token, courseId) : Promise.resolve(null), `staff-exam-curriculum:${courseId ?? ""}`);
  return { ...result, subjects: result.data?.subjects ?? [] };
}

/** A small label/value tile for summaries. */
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return <div className="rounded-lg border p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>;
}
