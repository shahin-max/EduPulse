"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { KIND_LABEL, studentApi, type AttemptHeader } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, PageHeader, Pill } from "@/components/admin/ui";
import { LeaderboardButton } from "./leaderboard";

const n = (value: string | number | null | undefined) => value === null || value === undefined ? "—" : String(Number(value));
const STATUS_TONES = { IN_PROGRESS: "amber", SUBMITTED: "green", AUTO_SUBMITTED: "blue", INVALIDATED: "red" } as const;
const STATUS_LABEL = { IN_PROGRESS: "In progress", SUBMITTED: "Submitted", AUTO_SUBMITTED: "Time ran out", INVALIDATED: "Cancelled" } as const;

/** Score fields are only present once the teacher has released results. */
const hasScore = (a: AttemptHeader) => a.score !== undefined && a.score !== null;

/** Every test attempt (GET /exam-attempts/me), grouped by test, newest first. */
export default function ResultsPage() {
  const { data, error, reload } = useAdminData(token => studentApi.myAttempts(token), "student-attempts");

  // Attempts arrive newest first, so each test's group keeps that order and groups follow their latest attempt.
  const groups = new Map<number, AttemptHeader[]>();
  for (const a of data ?? []) groups.set(a.exam.id, [...(groups.get(a.exam.id) ?? []), a]);

  // Summary: one figure per test, the best graded attempt (cancelled attempts do not count).
  const best = [...groups.values()]
    .map(list => Math.max(...list.filter(a => a.status !== "INVALIDATED" && hasScore(a)).map(a => Number(a.percentage ?? 0))))
    .filter(Number.isFinite);
  const average = best.length ? Math.round((best.reduce((s, p) => s + p, 0) / best.length) * 10) / 10 : null;
  const tiles = [
    { label: "Tests taken", value: data ? String(groups.size) : undefined },
    { label: "Average score", value: data ? average === null ? "—" : `${average}%` : undefined, sub: "best attempt of each test" },
    { label: "Best score", value: data ? best.length ? `${Math.max(...best)}%` : "—" : undefined },
  ];

  return <>
    <PageHeader title="Results" description="Your test attempts and scores. Scores appear once your teacher releases them."
      actions={<Button variant="outline" asChild><Link href="/student/tests"><ClipboardList /> Tests</Link></Button>} />
    {error && <ErrorAlert message={error} onRetry={reload} />}

    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {tiles.map(t => <Card key={t.label} className="gap-1 py-4">
        <CardContent className="grid gap-1 px-3 sm:px-5">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{t.label}</p>
          {t.value === undefined ? <Skeleton className="h-8 w-14" /> : <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{t.value}</p>}
          {t.sub && <p className="hidden text-xs text-muted-foreground sm:block">{t.sub}</p>}
        </CardContent>
      </Card>)}
    </div>

    {!data && !error && <div className="grid gap-4">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>}
    {data && data.length === 0 && <Card><EmptyState icon={Trophy} title="No attempts yet" description="When you take a test, your attempts and scores are listed here."
      action={<Button asChild><Link href="/student/tests">See tests <ArrowRight /></Link></Button>} /></Card>}

    {[...groups.entries()].map(([examId, attempts]) => {
      const exam = attempts[0].exam;
      return <Card key={examId} className="gap-0 py-0">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b py-4 [.border-b]:pb-4">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{exam.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{KIND_LABEL[exam.kind]} · {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}</p>
          </div>
          {attempts.some(hasScore) && <LeaderboardButton examId={examId} title={exam.title} />}
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {attempts.map(a => <li key={a.id}>
              <Link href={`/student/tests/attempt/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/40">
                <span className="w-20 shrink-0 text-sm font-medium">Attempt {a.attempt_number}</span>
                <Pill value={a.status} label={STATUS_LABEL[a.status]} tones={STATUS_TONES} />
                <span className="text-xs text-muted-foreground">{a.submitted_at ? formatDate(a.submitted_at, true) : `Started ${formatDate(a.started_at, true)}`}</span>
                <span className={cn("ml-auto text-sm tabular-nums", !hasScore(a) && "text-muted-foreground")}>
                  {a.status === "IN_PROGRESS" ? "Continue →"
                    : a.status === "INVALIDATED" ? "Does not count"
                    : hasScore(a) ? <><strong>{n(a.score)}</strong> / {n(a.max_score)} <span className="text-muted-foreground">({n(a.percentage)}%)</span></>
                    : "Result pending"}
                </span>
              </Link>
            </li>)}
          </ul>
        </CardContent>
      </Card>;
    })}
  </>;
}
