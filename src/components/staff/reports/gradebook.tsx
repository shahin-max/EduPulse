"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Search, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  downloadCsv, LOW_ATTENDANCE, num, SUBMISSION_LABEL, teachingApi,
  type Gradebook, type GradebookStudent, type SubmissionState,
} from "@/lib/teaching-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, UserAvatar } from "@/components/admin/ui";
import { usePortal } from "@/components/portal/portal-shell";

const STATE_STYLE: Record<SubmissionState, string> = {
  REVIEWED: "text-emerald-700 dark:text-emerald-400",
  SUBMITTED: "text-sky-700 dark:text-sky-400",
  LATE: "text-amber-700 dark:text-amber-400",
  MISSING: "text-red-700 dark:text-red-400",
  NOT_DUE: "text-muted-foreground",
};

/** Short label for a header cell, with the full title in a tooltip. */
function HeaderCell({ title, sub }: { title: string; sub: string }) {
  return <th scope="col" className="min-w-24 max-w-36 px-3 py-2 text-left align-bottom font-medium">
    <Tooltip>
      <TooltipTrigger asChild><span className="line-clamp-2 cursor-default text-xs">{title}</span></TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
    <span className="block text-[11px] font-normal text-muted-foreground">{sub}</span>
  </th>;
}

const pct = (value: number | string | null) => value === null || value === "" ? "—" : `${num(value)}%`;

/**
 * Every student of a batch against attendance, assignments, tests and study materials, with a CSV
 * export. Rows open the student's progress report.
 */
export function GradebookCard({ batchId }: { batchId: number }) {
  const { base } = usePortal();
  const { data, error, loading, reload } = useAdminData(token => teachingApi.gradebook(token, batchId), `gradebook:${batchId}`);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.students ?? []).filter(s => !term || s.full_name.toLowerCase().includes(term) || (s.admission_number ?? "").toLowerCase().includes(term));
  }, [data, search]);

  return <Card className="min-w-0 gap-0 py-0">
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <CardTitle>Gradebook</CardTitle>
      <CardDescription>{data
        ? `${data.students.length} students · ${data.sessions_held} classes held · ${data.assignments.length} assignments · ${data.exams.length} tests`
        : "Attendance, assignments, tests and study materials for every student."}</CardDescription>
      <CardAction>
        <Button variant="outline" size="sm" disabled={!data?.students.length} onClick={() => data && exportCsv(data)}><Download /> CSV</Button>
      </CardAction>
    </CardHeader>
    {data && data.students.length > 0 && <div className="border-b p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Search by name or admission no." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search the gradebook" />
      </div>
    </div>}
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows rows={5} />}
      {data && data.students.length === 0 && <EmptyState icon={TableProperties} title="No students yet" description="The gradebook fills in once students are enrolled in this batch." />}
      {data && data.students.length > 0 && rows.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">No students match “{search}”.</p>}
      {rows.length > 0 && data && <div className={cn("overflow-x-auto", loading && "opacity-60")}>
        <table className="w-full border-collapse text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-48 bg-muted px-4 py-2 text-left align-bottom font-medium">Student</th>
              <HeaderCell title="Attendance" sub={`${data.sessions_held} classes`} />
              {data.assignments.map(a => <HeaderCell key={`a${a.id}`} title={a.title} sub={a.max_marks ? `/ ${num(a.max_marks)} · ${a.due_at ? formatDate(a.due_at) : "no due date"}` : a.due_at ? `due ${formatDate(a.due_at)}` : "assignment"} />)}
              {data.exams.map(e => <HeaderCell key={`e${e.id}`} title={e.title} sub={`test · / ${num(e.total_marks)}`} />)}
              <HeaderCell title="Materials" sub={`of ${data.materials_total}`} />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(s => <GradebookRow key={s.enrollment_id} student={s} data={data} href={`${base}/batches/${batchId}/students/${s.user_id}`} />)}
          </tbody>
        </table>
      </div>}
      {data && data.students.length > 0 && <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Attendance counts late as present and leaves excused classes out; below {LOW_ATTENDANCE}% is highlighted. Tests show each student&apos;s best graded attempt.
      </p>}
    </CardContent>
  </Card>;
}

function GradebookRow({ student: s, data, href }: { student: GradebookStudent; data: Gradebook; href: string }) {
  const low = s.attendance.percentage !== null && s.attendance.percentage < LOW_ATTENDANCE;
  return <tr className="group hover:bg-muted/30">
    <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-2 text-left font-normal group-hover:bg-muted">
      <Link href={href} className="flex items-center gap-2 hover:underline">
        <UserAvatar name={s.full_name} src={s.photo_url} className="size-7" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{s.full_name}</span>
          <span className="block truncate text-xs text-muted-foreground">{[s.admission_number, s.enrollment_status !== "ACTIVE" && s.enrollment_status.toLowerCase()].filter(Boolean).join(" · ") || "—"}</span>
        </span>
      </Link>
    </th>
    <td className={cn("px-3 py-2 tabular-nums", low && "font-semibold text-red-700 dark:text-red-400")}>{pct(s.attendance.percentage)}</td>
    {data.assignments.map(a => {
      const cell = s.assignments[a.id];
      return <td key={a.id} className={cn("px-3 py-2 text-xs", STATE_STYLE[cell.state])}>
        {cell.state === "REVIEWED" && cell.marks !== null ? <span className="text-sm font-medium tabular-nums">{num(cell.marks)}</span> : SUBMISSION_LABEL[cell.state]}
      </td>;
    })}
    {data.exams.map(e => {
      const cell = s.exams[e.id];
      return <td key={e.id} className="px-3 py-2 tabular-nums">
        {cell.attempts ? <>{num(cell.score)}<span className="text-xs text-muted-foreground"> ({pct(cell.percentage)})</span></> : <span className="text-xs text-muted-foreground">Not taken</span>}
      </td>;
    })}
    <td className="px-3 py-2 tabular-nums text-muted-foreground">{s.materials_completed}/{data.materials_total}</td>
  </tr>;
}

function exportCsv(data: Gradebook) {
  const header = [
    "Student", "Admission no.", "Enrollment", "Attendance %", "Present", "Late", "Absent", "Excused",
    ...data.assignments.flatMap(a => [`${a.title} (status)`, `${a.title} (marks${a.max_marks ? ` / ${num(a.max_marks)}` : ""})`]),
    ...data.exams.flatMap(e => [`${e.title} (score / ${num(e.total_marks)})`, `${e.title} (%)`, `${e.title} (attempts)`]),
    `Materials completed (of ${data.materials_total})`,
  ];
  const rows = data.students.map(s => [
    s.full_name, s.admission_number, s.enrollment_status, s.attendance.percentage, s.attendance.present, s.attendance.late, s.attendance.absent, s.attendance.excused,
    ...data.assignments.flatMap(a => [SUBMISSION_LABEL[s.assignments[a.id].state], num(s.assignments[a.id].marks)]),
    ...data.exams.flatMap(e => [num(s.exams[e.id].score), num(s.exams[e.id].percentage), s.exams[e.id].attempts]),
    s.materials_completed,
  ]);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(`gradebook-${data.batch.code}-${date}.csv`, [header, ...rows]);
}
