"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { classesApi, type ClassSession, type ClassStatus } from "@/lib/staff-classes-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, LoadingRows } from "@/components/admin/ui";
import { isLive, timeOf, useTeacherName } from "./class-shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 (browser time) of the week `offset` weeks from this one. */
function weekStart(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const dayKey = (d: Date) => d.toDateString();

/**
 * The timetable as a Monday–Sunday grid (stacked days on phones). Without a batch it shows every
 * batch the person teaches (admins: all); with one, that batch only. Clicking a class opens it.
 */
export function WeekGrid({ batchId, status, base }: { batchId?: number; status?: ClassStatus; base: string }) {
  const [offset, setOffset] = useState(0);
  const start = weekStart(offset);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const range = { from: start.toISOString(), to: end.toISOString() };
  const { data, error, loading, reload } = useAdminData<ClassSession[]>(token => batchId
    ? classesApi.list(token, { batchId, ...range, limit: 100 }).then(r => r.data)
    : classesApi.timetable(token, range), `week:${batchId ?? "all"}:${range.from}`);

  const sessions = (data ?? []).filter(s => !status || s.status === status).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
  const byDay = new Map<string, ClassSession[]>();
  for (const s of sessions) {
    const key = dayKey(new Date(s.starts_at));
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }
  const today = new Date();
  const label = `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${new Date(end.getTime() - DAY_MS).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

  return <div className="grid gap-0">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" onClick={() => setOffset(o => o - 1)} aria-label="Previous week"><ChevronLeft /></Button>
        <Button variant="outline" size="icon" onClick={() => setOffset(o => o + 1)} aria-label="Next week"><ChevronRight /></Button>
        <Button variant="ghost" size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>This week</Button>
      </div>
      <p className="text-sm font-medium" aria-live="polite">{label}</p>
    </div>

    {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
    {!data && loading && <LoadingRows />}
    {data && sessions.length === 0 && <EmptyState icon={CalendarDays} title="No classes this week" description="Use the arrows to look at other weeks." />}
    {data && sessions.length > 0 && <div className={cn("transition-opacity", loading && "opacity-60")}>
      {/* sm and up: seven columns. */}
      <div className="hidden grid-cols-7 divide-x sm:grid">
        {days.map(d => <DayColumn key={dayKey(d)} day={d} today={sameDay(d, today)} sessions={byDay.get(dayKey(d)) ?? []} base={base} />)}
      </div>
      {/* Phones: one block per day that has classes. */}
      <div className="divide-y sm:hidden">
        {days.filter(d => byDay.has(dayKey(d))).map(d => <section key={dayKey(d)} className="grid gap-2 p-4">
          <h3 className={cn("text-sm font-semibold", sameDay(d, today) && "text-primary")}>
            {d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}{sameDay(d, today) && " · Today"}
          </h3>
          {byDay.get(dayKey(d))!.map(s => <ClassBlock key={s.id} session={s} base={base} />)}
        </section>)}
      </div>
    </div>}
  </div>;
}

function DayColumn({ day, today, sessions, base }: { day: Date; today: boolean; sessions: ClassSession[]; base: string }) {
  return <div className={cn("flex min-h-48 min-w-0 flex-col", today && "bg-primary/5")}>
    <div className={cn("border-b px-2 py-2 text-center", today && "text-primary")}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{day.toLocaleDateString("en-IN", { weekday: "short" })}</p>
      <p className={cn("text-lg font-semibold tabular-nums", today && "mx-auto flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground")}>{day.getDate()}</p>
    </div>
    <div className="grid content-start gap-1.5 p-1.5">
      {sessions.map(s => <ClassBlock key={s.id} session={s} base={base} compact />)}
    </div>
  </div>;
}

function ClassBlock({ session: s, base, compact = false }: { session: ClassSession; base: string; compact?: boolean }) {
  const teacherName = useTeacherName();
  const cancelled = s.status === "CANCELLED";
  const live = isLive(s);
  return <Link href={`${base}/classes/${s.id}`}
    title={`${s.title} · ${s.batches.name}${s.subjects ? ` · ${s.subjects.name}` : ""}`}
    className={cn("block min-w-0 rounded-md border-l-4 bg-card p-2 text-left text-xs shadow-xs ring-1 ring-border transition-colors hover:bg-muted/60",
      cancelled ? "border-l-red-400 opacity-70" : live ? "border-l-emerald-500" : s.status === "COMPLETED" ? "border-l-muted-foreground/40" : "border-l-primary")}>
    <span className="block font-medium tabular-nums text-muted-foreground">{timeOf(s.starts_at)}{!compact && ` – ${timeOf(s.ends_at)}`}{live && <span className="ml-1 text-emerald-700 dark:text-emerald-400">· Live</span>}</span>
    <span className={cn("block font-medium break-words", compact && "line-clamp-2", cancelled && "line-through")}>{s.title}</span>
    <span className="block truncate text-muted-foreground">{s.batches.name}</span>
    {!compact && <span className="block truncate text-muted-foreground">{[s.subjects?.name, teacherName(s)].filter(Boolean).join(" · ")}{cancelled && " · Cancelled"}</span>}
  </Link>;
}
