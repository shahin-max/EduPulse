"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Award, CalendarClock, CheckCircle2, ClipboardList, Loader2, Play, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { studentApi } from "@/lib/student-api";
import { cn } from "@/lib/utils";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, errorText, PageHeader, Pill } from "@/components/admin/ui";
import { istDate, istDateTime, scholarshipsApi, slabRows, testWindow, type MyScholarship } from "@/lib/scholarships-api";

const attemptHref = (id: number) => `/student/tests/attempt/${id}`;

/** The student's Scholarship Tests: take the online test, then see the rank and the scholarship won. */
export default function StudentScholarships() {
  const { data, error, reload } = useAdminData(scholarshipsApi.mine, "student-scholarships");
  const highlight = Number(useSearchParams().get("test")) || null;

  // Notification links (?test=ID) scroll to that test's card.
  useEffect(() => {
    if (!highlight || !data) return;
    document.getElementById(`scholarship-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight, data]);

  return <>
    <PageHeader title="Scholarship tests" description="Take the online Scholarship Test in its window. Your rank and any scholarship you win appear here once the academy publishes the results." />
    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && !error && <Skeleton className="h-64 rounded-xl" />}
    {data?.length === 0 && <Card><EmptyState icon={Award} title="You are not registered for a Scholarship Test"
      description="When the academy announces a Scholarship Test, register from the “Scholarship Test” button at the top of the website."
      action={<Button asChild variant="outline"><Link href="/">Go to the website</Link></Button>} /></Card>}
    <div className="grid gap-4">
      {data?.map(t => <ScholarshipCard key={t.id} test={t} highlighted={t.id === highlight} />)}
    </div>
  </>;
}

function ScholarshipCard({ test: t, highlighted }: { test: MyScholarship; highlighted: boolean }) {
  const router = useRouter();
  const { withToken } = useAuth();
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    try {
      const attempt = await withToken(token => studentApi.startAttempt(token, t.exam.id));
      router.push(attemptHref(attempt.id));
    } catch (e) {
      // Already started (e.g. in another tab): resume it instead.
      if (e instanceof ApiError && e.status === 409) {
        const mine = await withToken(scholarshipsApi.mine).catch(() => null);
        const again = mine?.find(x => x.id === t.id)?.attempt;
        if (again) return router.push(attemptHref(again.id));
      }
      toast.error(errorText(e, "Could not start the test."));
      setStarting(false);
    }
  }

  const inProgress = t.attempt?.status === "IN_PROGRESS";
  const submitted = t.attempt && !inProgress;

  return <Card id={`scholarship-${t.id}`} className={cn("scroll-mt-24", highlighted && "ring-2 ring-primary/50")}>
    <CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle className="text-lg">{t.title}</CardTitle>
        {t.status === "RESULTS_PUBLISHED" ? <Pill value="R" label="Results published" tones={{ R: "green" }} />
          : t.exam.window === "OPEN" ? <Pill value="O" label="Open now" tones={{ O: "blue" }} />
          : t.exam.window === "UPCOMING" ? <Pill value="U" label="Upcoming" tones={{ U: "amber" }} />
          : <Pill value="C" label="Test closed" tones={{ C: "gray" }} />}
      </div>
      <CardDescription className="flex items-center gap-1.5"><CalendarClock className="size-4 shrink-0" /> {testWindow(t.exam.opens_at, t.exam.closes_at, t.exam.duration_minutes)}</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-5">
      {t.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{t.description}</p>}

      {t.result ? <Result test={t} />
        : inProgress ? <div className="flex flex-wrap items-center gap-3">
          <Button asChild><Link href={attemptHref(t.attempt!.id)}><RotateCcw /> Resume test</Link></Button>
          <span className="text-sm text-muted-foreground">Your timer is running.</span>
        </div>
        : submitted ? <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          {t.attempt!.status === "INVALIDATED" ? "Your attempt was cancelled by the academy. Contact the office if you think this is a mistake." : "Submitted. Results will be published by the academy; you will get a notification."}
        </p>
        : t.can_start ? <div className="grid gap-2 sm:flex sm:items-center sm:gap-3">
          <Button onClick={() => void start()} disabled={starting} size="lg">{starting ? <Loader2 className="animate-spin" /> : <Play />}Start test</Button>
          <span className="text-sm text-muted-foreground">{t.exam.questions} questions · {t.exam.duration_minutes} minutes · one attempt. The timer starts as soon as you begin.</span>
        </div>
        : t.exam.window === "UPCOMING" ? <p className="flex items-center gap-2 text-sm"><CalendarClock className="size-4 text-amber-600" /> Opens on {t.exam.opens_at ? istDateTime(t.exam.opens_at) : "the test date"}. Come back then to start.</p>
        : <p className="text-sm text-muted-foreground">The test window has closed.</p>}

      {t.slabs.length > 0 && <section className="grid gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium"><ClipboardList className="size-4" /> Scholarships you can win</h3>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {slabRows(t.slabs).map(r => <li key={r.score} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <span className="text-muted-foreground">{r.score}</span><span className="font-medium text-primary">{r.award}</span>
          </li>)}
        </ul>
      </section>}
    </CardContent>
  </Card>;
}

function Result({ test: t }: { test: MyScholarship }) {
  const r = t.result!;
  const discount = Number(r.discount_percent);
  return <div className="grid gap-4">
    <dl className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Your rank</dt><dd className="text-2xl font-semibold tabular-nums">{r.rank ? `#${r.rank}` : "—"}<span className="text-sm font-normal text-muted-foreground"> of {r.candidates}</span></dd></div>
      <div className="rounded-lg border p-3"><dt className="text-xs text-muted-foreground">Your score</dt><dd className="text-2xl font-semibold tabular-nums">{r.percentage !== null ? `${Number(r.percentage)}%` : "—"}</dd></div>
    </dl>
    {r.rank === null ? <p className="text-sm text-muted-foreground">You did not take this test, so there is no result.</p>
      : discount > 0
        ? <div className={cn("grid gap-2 rounded-xl border p-4", r.expired || r.used ? "bg-muted/40" : "border-emerald-500/40 bg-emerald-500/10")}>
          <p className="flex items-center gap-2 text-lg font-semibold"><Trophy className="size-5 text-amber-500" /> You won {discount}% off your course fees</p>
          {t.valid_until && <p className="text-sm text-muted-foreground">Valid until {istDate(t.valid_until)}.</p>}
          {r.used ? <Pill value="U" label="Used on your fee invoice" tones={{ U: "gray" }} className="w-fit" />
            : r.expired ? <Pill value="E" label="Expired" tones={{ E: "red" }} className="w-fit" />
            : <p className="text-sm">Show this at admission; the office applies it to your fee invoice.</p>}
        </div>
        : <p className="rounded-lg border bg-muted/40 p-4 text-sm">No scholarship this time. Keep practising: every test makes you faster and more accurate.</p>}
  </div>;
}
