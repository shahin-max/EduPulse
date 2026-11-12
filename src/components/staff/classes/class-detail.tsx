"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ban, BookOpen, CalendarClock, CheckCircle2, Loader2, Pencil, PlayCircle, UserRound, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { classesApi } from "@/lib/staff-classes-api";
import { usePortal } from "@/components/portal/portal-shell";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, errorText, Pill } from "@/components/admin/ui";
import AttendanceSheet from "./attendance-sheet";
import { CancelClassDialog, ClassFormDialog } from "./class-dialogs";
import { CLASS_STATUS_HELP, CLASS_TONES, ClassLinks, dayLabel, duration, hasStarted, isLive, timeRange, useTeacherName } from "./class-shared";

export default function ClassDetail({ id }: { id: number }) {
  const { base } = usePortal();
  const { withToken } = useAuth();
  const teacherName = useTeacherName();
  const valid = Number.isInteger(id) && id > 0;
  const { data: session, error, loading, reload, setData } = useAdminData(async token => {
    if (!valid) throw new Error("This class id is not valid.");
    try {
      return await classesApi.get(token, id);
    } catch (e) {
      // Faculty get 403 for classes of batches they do not teach.
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) throw new Error("This class does not exist, or it belongs to a batch you do not teach.");
      throw e;
    }
  }, String(id));
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);

  const back = <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href={`${base}/classes`}><ArrowLeft /> All classes</Link></Button>;

  if (!valid) return <>{back}<ErrorAlert title="Not found" message="This class id is not valid." /></>;
  if (loading && !session) return <>{back}<DetailSkeleton /></>;
  if (error && !session) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!session) return null;

  async function complete() {
    setCompleting(true);
    try {
      setData(await withToken(token => classesApi.update(token, id, { status: "COMPLETED" })));
      toast.success("Class marked as completed");
    } catch (e) {
      toast.error(errorText(e, "Could not update the class."));
    } finally {
      setCompleting(false);
    }
  }

  const started = hasStarted(session);
  const teacher = teacherName(session);

  return <>
    {back}

    <Card>
      <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={session.status === "CANCELLED" ? "min-w-0 text-2xl font-semibold tracking-tight break-words text-muted-foreground line-through" : "min-w-0 text-2xl font-semibold tracking-tight break-words"}>{session.title}</h1>
            {isLive(session) ? <Pill value="LIVE" tones={{ LIVE: "green" }} label="Live now" /> : <Pill value={session.status} tones={CLASS_TONES} />}
          </div>
          <p className="flex items-center gap-2 text-sm font-medium"><CalendarClock className="size-4 text-muted-foreground" />{dayLabel(session.starts_at)}, {timeRange(session)} <span className="font-normal text-muted-foreground">· {duration(session)}</span></p>
          <p className="text-sm text-muted-foreground">{CLASS_STATUS_HELP[session.status]}</p>
          <ClassLinks session={session} size="default" className="pt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
          {session.status === "SCHEDULED" && started && <Button variant="outline" onClick={complete} disabled={completing}>{completing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Mark completed</Button>}
          {session.status !== "CANCELLED" && <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setCancelling(true)}><Ban /> Cancel class</Button>}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Info icon={Users} label="Batch">
        <Link href={`${base}/batches/${session.batches.id}`} className="block truncate text-sm font-medium hover:underline">{session.batches.name}</Link>
        <p className="truncate font-mono text-xs text-muted-foreground">{session.batches.code}</p>
      </Info>
      <Info icon={BookOpen} label="Subject">
        <p className="truncate text-sm font-medium">{session.subjects?.name ?? "No subject"}</p>
        {session.subjects && <p className="truncate font-mono text-xs text-muted-foreground">{session.subjects.code}</p>}
      </Info>
      <Info icon={UserRound} label="Teacher">
        <p className="truncate text-sm font-medium">{teacher ?? "Not assigned"}</p>
      </Info>
      <Info icon={session.recording_url ? PlayCircle : Video} label={session.recording_url ? "Recording" : "Meeting link"}>
        {session.recording_url
          ? <a href={session.recording_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">{session.recording_url}</a>
          : session.meeting_url
            ? <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">{session.meeting_url}</a>
            : <p className="text-sm text-muted-foreground">Not set</p>}
        {!session.recording_url && started && session.status !== "CANCELLED" && <Button variant="link" size="sm" className="h-auto w-fit p-0 text-xs" onClick={() => setEditing(true)}>Add the recording link</Button>}
      </Info>
    </div>

    <AttendanceSheet session={session} />

    <ClassFormDialog open={editing} onOpenChange={setEditing} session={session} onSaved={setData} />
    <CancelClassDialog session={session} open={cancelling} onOpenChange={setCancelling} onCancelled={setData} />
  </>;
}

function Info({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return <Card className="py-4"><CardContent className="grid min-w-0 gap-1 px-4">
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</p>
    {children}
  </CardContent></Card>;
}

function DetailSkeleton() {
  return <div className="grid gap-4">
    <Card><CardContent className="grid gap-3"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-9 w-32" /></CardContent></Card>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => <Card key={i} className="py-4"><CardContent className="grid gap-2 px-4"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>)}
    </div>
    <Card><CardContent className="grid gap-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}</CardContent></Card>
  </div>;
}
