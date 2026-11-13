"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ChevronRight, NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { studentApi, type StudentAssignment } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, PageHeader } from "@/components/admin/ui";
import { dueHint, marksText, StatePill } from "./assignment-bits";

type Tab = "todo" | "submitted" | "reviewed" | "all";

/** To do: nothing handed in yet and the assignment still accepts work. */
const FILTERS: Record<Tab, (a: StudentAssignment) => boolean> = {
  todo: a => !a.my_submission && a.status === "PUBLISHED",
  submitted: a => a.state === "SUBMITTED" || a.state === "LATE",
  reviewed: a => a.state === "REVIEWED",
  all: () => true,
};
const TABS: [Tab, string][] = [["todo", "To do"], ["submitted", "Submitted"], ["reviewed", "Reviewed"], ["all", "All"]];

/** The current time, refreshed every minute (render stays pure). */
function useNow(stepMs = 60_000) {
  return useSyncExternalStore(
    onChange => { const timer = setInterval(onChange, stepMs); return () => clearInterval(timer); },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => 0,
  );
}

export default function StudentAssignments() {
  const { data, error, loading, reload } = useAdminData(studentApi.assignments, "student-assignments");
  const [tab, setTab] = useState<Tab>("todo");
  const now = useNow();
  const all = data ?? [];
  // To do: soonest first; everything else: most recent first.
  const filtered = all.filter(FILTERS[tab]);
  const rows = tab === "todo" ? filtered : [...filtered].reverse();

  return <>
    <PageHeader title="Assignments" description="Homework and worksheets from your teachers. Hand them in before the due date." />

    <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1 sm:w-fit" role="tablist" aria-label="Filter assignments">
      {TABS.map(([value, label]) => {
        const count = all.filter(FILTERS[value]).length;
        return <Button key={value} role="tab" aria-selected={tab === value} size="sm" variant={tab === value ? "secondary" : "ghost"}
          className={cn("shrink-0", tab === value && "bg-background shadow-xs")} onClick={() => setTab(value)}>
          {label}
          {data && <Badge variant={value === "todo" && count ? "default" : "secondary"} className="h-5 min-w-5 rounded-full px-1.5 tabular-nums">{count}</Badge>}
        </Button>;
      })}
    </div>

    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows rows={5} />}
        {data && rows.length === 0 && <EmptyState icon={NotebookPen}
          title={tab === "todo" ? "Nothing to do right now" : all.length ? "Nothing here" : "No assignments yet"}
          description={tab === "todo" ? (all.length ? "You have handed in everything that is open." : "When your teachers post assignments, they appear here.") : "Try another tab."} />}
        {rows.length > 0 && <ul className="divide-y">
          {rows.map(a => {
            const hint = !a.my_submission && a.status === "PUBLISHED" ? dueHint(a.due_at, now) : null;
            const marks = a.state === "REVIEWED" ? marksText(a.my_submission?.marks_awarded, a.max_marks) : null;
            return <li key={a.id}>
              <Link href={`/student/assignments/${a.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{a.title}</span>
                    {a.status === "CLOSED" && <Badge variant="outline">Closed</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{[a.batches.name, a.subjects?.name].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.due_at ? `Due ${formatDate(a.due_at, true)}` : "No due date"}
                    {hint && <span className={cn("ml-1.5 font-medium", hint.overdue ? "text-red-700 dark:text-red-400" : "text-foreground")}>({hint.text})</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatePill state={a.state} />
                  {marks && <span className="text-sm font-semibold tabular-nums">{marks}</span>}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>;
          })}
        </ul>}
      </CardContent>
    </Card>
  </>;
}
