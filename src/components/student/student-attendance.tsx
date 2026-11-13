"use client";

import { useState } from "react";
import { CalendarCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { studentApi, type MyAttendance } from "@/lib/student-api";
import { LOW_ATTENDANCE } from "@/lib/teaching-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, PageHeader, Pill, type Tone } from "@/components/admin/ui";
import { ProgressBar } from "./shared";

const TONES: Record<string, Tone> = { PRESENT: "green", LATE: "amber", ABSENT: "red", EXCUSED: "blue" };
const SHOWN = 10;

/** Attendance per batch (current and past), with every marked class. */
export default function StudentAttendance() {
  const { data, error, reload } = useAdminData(studentApi.attendance, "student-attendance");

  return <>
    <PageHeader title="Attendance" description={`Late counts as present; excused classes are left out. Keep it above ${LOW_ATTENDANCE}%.`} />
    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && !error && <Skeleton className="h-64 rounded-xl" />}
    {data?.length === 0 && <Card><EmptyState icon={CalendarCheck} title="No attendance yet" description="Your attendance appears here once your teachers start marking classes." /></Card>}
    {data?.map(batch => <BatchAttendance key={batch.batch.id} entry={batch} />)}
  </>;
}

function BatchAttendance({ entry }: { entry: MyAttendance[number] }) {
  const [all, setAll] = useState(false);
  const { summary, records } = entry;
  const low = summary.percentage !== null && summary.percentage < LOW_ATTENDANCE;
  const shown = all ? records : records.slice(0, SHOWN);

  return <Card className="gap-0 py-0">
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <CardTitle>{entry.batch.name}</CardTitle>
      <CardDescription>{summary.present} present · {summary.late} late · {summary.absent} absent · {summary.excused} excused</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-4 p-4">
      <div className="grid gap-2">
        <p className="flex items-baseline justify-between gap-2">
          <span className={cn("text-3xl font-semibold tabular-nums", low && "text-red-700 dark:text-red-400")}>{summary.percentage === null ? "—" : `${summary.percentage}%`}</span>
          <span className="text-sm text-muted-foreground">{summary.total} classes marked</span>
        </p>
        <ProgressBar value={summary.percentage ?? 0} tone={low ? "red" : "green"} />
        {low && <p className="text-sm text-red-700 dark:text-red-400">Your attendance is below {LOW_ATTENDANCE}%. Try not to miss the next classes, and tell your teacher if something is stopping you.</p>}
      </div>
      {records.length > 0 && <ul className="divide-y rounded-lg border">
        {shown.map(r => <li key={r.session.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{r.session.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{formatDate(r.session.starts_at, true)}{r.session.subjects ? ` · ${r.session.subjects.name}` : ""}</span>
          </span>
          <Pill value={r.status} tones={TONES} />
        </li>)}
      </ul>}
      {records.length > SHOWN && <Button variant="ghost" size="sm" className="w-fit" onClick={() => setAll(a => !a)}>
        <ChevronDown className={cn("transition-transform", all && "rotate-180")} />{all ? "Show fewer" : `Show all ${records.length} classes`}
      </Button>}
    </CardContent>
  </Card>;
}
