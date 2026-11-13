"use client";

import { useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { studentApi } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, LoadingRows } from "@/components/admin/ui";

const n = (value: string | number) => String(Number(value));

/** "Leaderboard" button opening the test's ranking; the API decides whether results are out yet. */
export function LeaderboardButton({ examId, title }: { examId: number; title: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}><Trophy /> Leaderboard</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Leaderboard</DialogTitle>
          <DialogDescription>{title}: top 50, one attempt per student.</DialogDescription>
        </DialogHeader>
        {open && <Ranking examId={examId} />}
      </DialogContent>
    </Dialog>
  </>;
}

function Ranking({ examId }: { examId: number }) {
  const { user } = useAuth();
  const { data, error, reload } = useAdminData(token => studentApi.leaderboard(token, examId).catch((e: unknown) => {
    // 403 is expected before results are released, or after the student's enrollment ended.
    if (e instanceof ApiError && e.status === 403) return { notAvailable: e.message } as const;
    throw e;
  }), `leaderboard:${examId}`);

  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  if (!data) return <LoadingRows rows={5} />;
  if ("notAvailable" in data) return <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">{data.notAvailable}. The leaderboard appears once results are out.</p>;
  if (!data.entries.length) return <p className="text-sm text-muted-foreground">No one has finished this test yet.</p>;

  const mine = data.entries.find(e => e.student_user_id === user?.id);
  return <div className="grid gap-3">
    {mine && <p className="rounded-lg bg-primary/10 p-3 text-sm">You are <strong>#{mine.rank}</strong> of {data.entries.length} with {n(mine.score)} / {n(mine.max_score)} ({n(mine.percentage)}%).</p>}
    <ol className="divide-y rounded-lg border">
      {data.entries.map(e => {
        const me = e.student_user_id === user?.id;
        return <li key={`${e.student_user_id}-${e.rank}`} className={cn("flex items-center gap-3 px-3 py-2 text-sm", me && "bg-primary/10 font-medium")}>
          <span className="flex w-8 shrink-0 items-center justify-center tabular-nums">
            {e.rank <= 3 ? <Medal className={cn("size-5", e.rank === 1 ? "text-amber-500" : e.rank === 2 ? "text-slate-400" : "text-orange-700")} aria-label={`Rank ${e.rank}`} /> : e.rank}
          </span>
          <span className="min-w-0 flex-1 truncate">{e.full_name}{me && " (you)"}</span>
          <span className="shrink-0 tabular-nums">{n(e.score)}<span className="text-xs text-muted-foreground"> · {n(e.percentage)}%</span></span>
        </li>;
      })}
    </ol>
  </div>;
}
