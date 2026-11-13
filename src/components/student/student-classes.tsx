"use client";

import { useState } from "react";
import { CalendarDays, PlayCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { studentApi, type StudentClass } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, LoadingRows, PageHeader, Pill } from "@/components/admin/ui";
import { dayOf, isJoinable, timeOf, useNow } from "./shared";

type View = "week" | "next" | "past";
const VIEWS: { value: View; label: string }[] = [
  { value: "week", label: "Next 7 days" },
  { value: "next", label: "The week after" },
  { value: "past", label: "Past 2 weeks" },
];

/** The window of each view, from today's midnight in the browser's time zone (the API allows 31 days). */
function range(view: View): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = (n: number) => new Date(start.getTime() + n * 24 * 60 * 60 * 1000);
  return view === "week" ? [day(0), day(7)] : view === "next" ? [day(7), day(14)] : [day(-14), day(0)];
}

/** The student's timetable across all current batches, grouped by day, with class links and recordings. */
export default function StudentClasses() {
  const [view, setView] = useState<View>("week");
  const now = useNow();
  const { data, error, loading, reload } = useAdminData(token => studentApi.timetable(token, ...range(view)), `timetable:${view}`);

  // Newest first for the past view, soonest first otherwise.
  const sessions = view === "past" ? [...(data ?? [])].reverse() : data ?? [];
  const days = new Map<string, StudentClass[]>();
  for (const s of sessions) {
    const key = new Date(s.starts_at).toDateString();
    days.set(key, [...(days.get(key) ?? []), s]);
  }

  return <>
    <PageHeader title="Timetable" description="Your classes across all your batches. Online class links open 15 minutes before the start." />
    <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1 sm:w-fit" role="tablist" aria-label="Choose a week">
      {VIEWS.map(v => <Button key={v.value} role="tab" aria-selected={view === v.value} size="sm" variant={view === v.value ? "secondary" : "ghost"}
        className={cn("shrink-0", view === v.value && "bg-background shadow-xs")} onClick={() => setView(v.value)}>{v.label}</Button>)}
    </div>

    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && loading && <Card><LoadingRows rows={4} /></Card>}
    {data && sessions.length === 0 && <Card><EmptyState icon={CalendarDays} title={view === "past" ? "No classes in the last two weeks" : "No classes scheduled"} description={view === "past" ? undefined : "New classes appear here as soon as your teachers schedule them."} /></Card>}
    <div className={cn("grid gap-4", loading && "opacity-60")}>
      {[...days].map(([key, list]) => <section key={key} className="grid gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{dayOf(list[0].starts_at)}</h2>
        <Card className="gap-0 py-0">
          <CardContent className="p-0">
            <ul className="divide-y">
              {list.map(c => {
                const live = isJoinable(c, now);
                const cancelled = c.status === "CANCELLED";
                const over = new Date(c.ends_at).getTime() < now;
                return <li key={c.id} className="grid gap-3 p-4 sm:flex sm:items-center">
                  <div className="w-28 shrink-0 text-sm tabular-nums text-muted-foreground">{timeOf(c.starts_at)}–{timeOf(c.ends_at)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("truncate font-medium", cancelled && "line-through opacity-70")}>{c.title}</p>
                      {cancelled ? <Pill value="CANCELLED" label="Cancelled" tones={{ CANCELLED: "red" }} />
                        : live ? <Pill value="LIVE" label="Live now" tones={{ LIVE: "green" }} /> : null}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{[c.subjects?.name, c.faculty_profiles?.users.full_name, c.batches.name].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!cancelled && !over && c.meeting_url && <Button asChild size="sm" variant={live ? "default" : "outline"}>
                      <a href={c.meeting_url} target="_blank" rel="noopener noreferrer"><Video /> {live ? "Join now" : "Class link"}</a>
                    </Button>}
                    {c.recording_url && <Button asChild size="sm" variant="outline"><a href={c.recording_url} target="_blank" rel="noopener noreferrer"><PlayCircle /> Recording</a></Button>}
                  </div>
                </li>;
              })}
            </ul>
          </CardContent>
        </Card>
      </section>)}
    </div>
  </>;
}
