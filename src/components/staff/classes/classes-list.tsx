"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Ban, CalendarDays, CalendarPlus, ClipboardCheck, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Paginated } from "@/lib/admin-api";
import { CLASS_STATUSES, classesApi, startOfDay, type ClassSession, type ClassStatus } from "@/lib/staff-classes-api";
import { usePortal } from "@/components/portal/portal-shell";
import { ActionsHead, RowActions as ActionMenu } from "@/components/portal/row-actions";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, LoadingRows, PageHeader, Pager, Pill, titleCase } from "@/components/admin/ui";
import { batchLabel, useIsAdmin, useStaffBatches } from "../use-staff";
import { CancelClassDialog, ClassFormDialog } from "./class-dialogs";
import { WeekGrid } from "./week-grid";
import { CLASS_TONES, ClassLinks, dayLabel, hasStarted, isLive, timeRange, useTeacherName } from "./class-shared";

const ALL = "all";
const PAGE_SIZE = 50;

type View = "today" | "week" | "calendar" | "past" | "all";
const VIEWS: { value: View; label: string; batchOnly?: boolean }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "calendar", label: "Week grid" },
  { value: "past", label: "Past 30 days" },
  { value: "all", label: "All", batchOnly: true },
];

/** The time window of a view, in the browser's local time (the timetable allows at most 31 days). */
function windowOf(view: View): { from?: string; to?: string } {
  switch (view) {
    case "today": return { from: startOfDay(0).toISOString(), to: startOfDay(1).toISOString() };
    case "week": case "calendar": return { from: startOfDay(0).toISOString(), to: startOfDay(7).toISOString() };
    case "past": return { from: startOfDay(-30).toISOString(), to: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString() };
    case "all": return {};
  }
}

export default function ClassesList() {
  const params = useSearchParams();
  const { base } = usePortal();
  const admin = useIsAdmin();
  const staff = useStaffBatches();
  const initialBatch = Number(params.get("batch")) || undefined;
  const [batchId, setBatchId] = useState<number | undefined>(initialBatch);
  const [view, setView] = useState<View>("week");
  const [status, setStatus] = useState<ClassStatus | undefined>();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<ClassSession | undefined>();
  const [cancelling, setCancelling] = useState<ClassSession | null>(null);

  // Without a batch the timetable covers every batch the person teaches (admins: all) for one window;
  // with a batch the paginated list also offers "All" dates and filters by status on the server.
  const range = windowOf(view);
  const key = JSON.stringify({ batchId, view, status, page });
  // The week grid loads its own week; the list is not fetched meanwhile.
  const { data, error, loading, reload } = useAdminData<Paginated<ClassSession> | ClassSession[]>(token => view === "calendar"
    ? Promise.resolve([])
    : batchId
    ? classesApi.list(token, { batchId, ...range, status, page, limit: PAGE_SIZE })
    : classesApi.timetable(token, range), key);

  const rows = !data ? null : Array.isArray(data)
    ? data.filter(s => !status || s.status === status).sort((a, b) => view === "past" ? b.starts_at.localeCompare(a.starts_at) : 0)
    : data.data;
  const meta = data && !Array.isArray(data) ? data.meta : null;

  const pickView = (v: View) => { setView(v); setPage(1); };
  const pickBatch = (value: string) => {
    const id = value === ALL ? undefined : Number(value);
    setBatchId(id);
    setPage(1);
    if (!id && view === "all") setView("week");
  };

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const actions: RowActions = {
    base,
    edit: s => { setEditing(s); setFormOpen(true); },
    cancel: s => setCancelling(s),
  };

  const noBatches = !staff.loading && staff.open.length === 0;
  const createButton = <Button onClick={openCreate} disabled={noBatches}><CalendarPlus /> Schedule class</Button>;
  const filtered = !!(status || batchId);

  return <>
    <PageHeader title="Classes" description={admin ? "Live classes across all batches, and their attendance." : "Your live classes and their attendance."}
      actions={noBatches
        ? <Tooltip><TooltipTrigger asChild><span className="inline-flex">{createButton}</span></TooltipTrigger><TooltipContent>{admin ? "No planned or active batches" : "You are not assigned to an open batch"}</TooltipContent></Tooltip>
        : createButton} />

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div role="group" aria-label="When" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex sm:w-fit">
          {VIEWS.filter(v => !v.batchOnly || batchId).map(v => <Button key={v.value} size="sm" variant="ghost" aria-pressed={view === v.value}
            className={cn("h-8", view === v.value ? "bg-background shadow-sm hover:bg-background" : "text-muted-foreground")} onClick={() => pickView(v.value)}>{v.label}</Button>)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <Select value={batchId ? String(batchId) : ALL} onValueChange={pickBatch}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Filter by batch"><SelectValue placeholder="All batches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{admin ? "All batches" : "All my batches"}</SelectItem>
              {staff.batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}</SelectItem>)}
              {batchId && !staff.batches.some(b => b.id === batchId) && <SelectItem value={String(batchId)}>Batch #{batchId}</SelectItem>}
            </SelectContent>
          </Select>
          <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as ClassStatus); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {CLASS_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0">
        {staff.error && <div className="p-4 pb-0"><ErrorAlert title="Could not load your batches" message={staff.error} onRetry={staff.reload} /></div>}
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {view === "calendar" && <WeekGrid batchId={batchId} status={status} base={base} />}
        {view !== "calendar" && <>
        {!rows && loading && <LoadingRows />}
        {rows && rows.length === 0 && <EmptyState icon={CalendarDays}
          title={view === "today" ? "No classes today" : view === "week" ? "No classes this week" : view === "past" ? "No classes in the past 30 days" : "No classes yet"}
          description={filtered ? "Try another batch or status." : "Scheduled classes appear here."}
          action={!noBatches && view !== "past" ? <Button variant="outline" onClick={openCreate}><CalendarPlus /> Schedule class</Button> : undefined} />}
        {rows && rows.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ClassesTable sessions={rows} actions={actions} />
          <ClassesCards sessions={rows} actions={actions} />
        </div>}
        </>}
      </CardContent>

      {view !== "calendar" && meta && meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={meta} onPage={setPage} /></div></CardFooter>}
    </Card>

    <ClassFormDialog open={formOpen} onOpenChange={setFormOpen} session={editing} defaultBatchId={batchId} onSaved={reload} />
    <CancelClassDialog session={cancelling} open={!!cancelling} onOpenChange={open => { if (!open) setCancelling(null); }} onCancelled={reload} />
  </>;
}

type RowActions = { base: string; edit: (s: ClassSession) => void; cancel: (s: ClassSession) => void };

function RowMenu({ session, actions }: { session: ClassSession; actions: RowActions }) {
  const attendanceOpen = session.status !== "CANCELLED" && hasStarted(session);
  return <ActionMenu label={session.title} items={[
    { label: "View class", icon: Eye, href: `${actions.base}/classes/${session.id}` },
    attendanceOpen && { label: "Mark attendance", icon: ClipboardCheck, href: `${actions.base}/classes/${session.id}#attendance` },
    { label: "Edit", icon: Pencil, onSelect: () => actions.edit(session) },
    session.status !== "CANCELLED" && { label: "Cancel class", icon: Ban, onSelect: () => actions.cancel(session), destructive: true },
  ]} />;
}

function When({ session }: { session: ClassSession }) {
  return <div className="min-w-0">
    <p className="font-medium whitespace-nowrap">{dayLabel(session.starts_at)}</p>
    <p className="text-xs whitespace-nowrap text-muted-foreground">{timeRange(session)}</p>
  </div>;
}

function StatusCell({ session }: { session: ClassSession }) {
  return isLive(session)
    ? <Pill value="LIVE" tones={{ LIVE: "green" }} label="Live now" />
    : <Pill value={session.status} tones={CLASS_TONES} />;
}

/** md and up: a table. Lower-priority columns appear as the screen widens. */
function ClassesTable({ sessions, actions }: { sessions: ClassSession[]; actions: RowActions }) {
  const teacherName = useTeacherName();
  return <Table className="hidden @2xl/main:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">When</TableHead>
        <TableHead>Class</TableHead>
        <TableHead className="hidden @3xl/main:table-cell">Subject</TableHead>
        <TableHead className="hidden @4xl/main:table-cell">Teacher</TableHead>
        <TableHead>Status</TableHead>
        <ActionsHead className="w-auto" />
      </TableRow>
    </TableHeader>
    <TableBody>
      {sessions.map(s => <TableRow key={s.id} className={s.status === "CANCELLED" ? "text-muted-foreground" : undefined}>
        <TableCell className="pl-4"><When session={s} /></TableCell>
        <TableCell>
          <Link href={`${actions.base}/classes/${s.id}`} className={cn("block max-w-[18rem] truncate font-medium hover:underline", s.status === "CANCELLED" && "line-through")}>{s.title}</Link>
          <p className="max-w-[18rem] truncate text-xs text-muted-foreground">{s.batches.name} <span className="font-mono">({s.batches.code})</span></p>
        </TableCell>
        <TableCell className="hidden text-muted-foreground @3xl/main:table-cell">{s.subjects?.name ?? "—"}</TableCell>
        <TableCell className="hidden text-muted-foreground @4xl/main:table-cell">{teacherName(s) ?? "Not assigned"}</TableCell>
        <TableCell><StatusCell session={s} /></TableCell>
        <TableCell className="pr-4">
          <div className="flex items-center justify-end gap-1">
            <ClassLinks session={s} compact className="justify-end" />
            <RowMenu session={s} actions={actions} />
          </div>
        </TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

/** Below md: one card per class. */
function ClassesCards({ sessions, actions }: { sessions: ClassSession[]; actions: RowActions }) {
  const teacherName = useTeacherName();
  return <ul className="divide-y @2xl/main:hidden">
    {sessions.map(s => <li key={s.id} className="grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{dayLabel(s.starts_at)} · {timeRange(s)}</p>
          <Link href={`${actions.base}/classes/${s.id}`} className={cn("mt-0.5 block font-medium hover:underline", s.status === "CANCELLED" && "text-muted-foreground line-through")}>{s.title}</Link>
          <p className="truncate text-xs text-muted-foreground">{s.batches.name}{s.subjects && ` · ${s.subjects.name}`}</p>
          <p className="truncate text-xs text-muted-foreground">{teacherName(s) ?? "No teacher assigned"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusCell session={s} />
          <RowMenu session={s} actions={actions} />
        </div>
      </div>
      <ClassLinks session={s} />
    </li>)}
  </ul>;
}
