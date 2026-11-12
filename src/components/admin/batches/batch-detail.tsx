"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Building2, CalendarRange, ChevronDown, GraduationCap, Loader2, Pencil, Plus, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import {
  batchesApi, batchPickersApi, ENROLLMENT_STATUSES, enrollmentsApi, SEAT_STATUSES,
  type Batch, type BatchFaculty, type EnrollmentStatus, type RosterEntry, type SubjectRef,
} from "@/lib/admin-batches-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, Pill, titleCase, UserAvatar } from "../ui";
import { BatchFormDialog, DeleteBatchDialog } from "./batch-dialogs";
import { AssignFacultyDialog, closedForEnrollment, EnrollStudentDialog, isFull, RemoveFacultyDialog, seatError } from "./batch-people-dialogs";
import { BATCH_STATUS_HELP, BATCH_TONES, ENROLLMENT_STATUS_HELP, ENROLLMENT_TONES, formatDay, Seats, useDebounced } from "./batch-shared";

export default function BatchDetail({ id }: { id: number }) {
  const router = useRouter();
  const valid = Number.isInteger(id) && id > 0;
  const { data: batch, error, loading, reload, setData } = useAdminData(token => valid ? batchesApi.get(token, id) : Promise.reject(new Error("This batch id is not valid.")), String(id));
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href="/admin/batches"><ArrowLeft /> All batches</Link></Button>;

  if (!valid) return <>{back}<ErrorAlert title="Not found" message="This batch id is not valid." /></>;
  if (loading && !batch) return <>{back}<DetailSkeleton /></>;
  if (error && !batch) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!batch) return null;

  return <>
    {back}

    <Card>
      <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{batch.name}</h1>
            <Pill value={batch.status} tones={BATCH_TONES} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">{batch.code}</p>
          <p className="text-sm text-muted-foreground">{BATCH_STATUS_HELP[batch.status]}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => setEditing(true)}><Pencil /> Edit</Button>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting(true)}><Trash2 /> Delete</Button>
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={BookOpen} label="Course" value={batch.courses.title} sub={batch.courses.code} />
      <Stat icon={Building2} label="Branch" value={batch.branches.name} sub={`${batch.branches.code} · cannot be changed`} />
      <Stat icon={CalendarRange} label="Dates" value={batch.start_date ? formatDay(batch.start_date) : "Start not set"} sub={batch.end_date ? `until ${formatDay(batch.end_date)}` : "No end date"} />
      <Card className="py-4"><CardContent className="grid gap-2 px-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3.5" /> Seats</p>
        <Seats batch={batch} />
      </CardContent></Card>
    </div>

    <FacultyCard batch={batch} onChange={setData} onReload={reload} />
    <RosterCard batch={batch} onSeatsChanged={reload} />

    <BatchFormDialog open={editing} onOpenChange={setEditing} batch={batch} onSaved={setData} />
    <DeleteBatchDialog batch={batch} open={deleting} onOpenChange={setDeleting} onDeleted={() => router.push("/admin/batches")} onUpdated={setData} />
  </>;
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return <Card className="py-4"><CardContent className="grid gap-1 px-4">
    <p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</p>
    <p className="truncate text-sm font-medium" title={value}>{value}</p>
    {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
  </CardContent></Card>;
}

// ---- Faculty per subject ----

function FacultyCard({ batch, onChange, onReload }: { batch: Batch; onChange: (batch: Batch) => void; onReload: () => void }) {
  const course = useAdminData(token => batchPickersApi.course(token, batch.course_id), String(batch.course_id));
  const [assigning, setAssigning] = useState<{ subjectId?: number } | null>(null);
  const [removing, setRemoving] = useState<BatchFaculty | null>(null);

  const courseSubjects: SubjectRef[] = course.data?.course_subjects.map(cs => cs.subjects) ?? [];
  // Assignments for a subject that was later removed from the course still show, so they can be cleaned up.
  const orphans = batch.faculty.map(f => f.subject).filter((s, i, all) => !courseSubjects.some(c => c.id === s.id) && all.findIndex(o => o.id === s.id) === i);
  const subjects = course.data ? [...courseSubjects, ...orphans] : [];

  return <Card>
    <CardHeader>
      <CardTitle>Faculty</CardTitle>
      <CardDescription>Who teaches each subject of {batch.courses.title} in this batch.</CardDescription>
      <CardAction><Button size="sm" onClick={() => setAssigning({})} disabled={!course.data}><Plus /> Assign</Button></CardAction>
    </CardHeader>
    <CardContent>
      {course.error && <ErrorAlert title="Could not load the course subjects" message={course.error} onRetry={course.reload} />}
      {!course.data && course.loading && <LoadingRows rows={3} />}
      {course.data && subjects.length === 0 && <EmptyState icon={BookOpen} title="This course has no subjects" description="Add subjects to the course before assigning faculty." />}
      {subjects.length > 0 && <ul className="divide-y rounded-md border">
        {subjects.map(subject => {
          const teachers = batch.faculty.filter(f => f.subject.id === subject.id);
          const orphan = orphans.includes(subject);
          return <li key={subject.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 sm:w-48">
              <p className="truncate text-sm font-medium">{subject.name}</p>
              <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{subject.code}</span>{orphan && " · no longer in the course"}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {teachers.length === 0 && <span className="text-sm text-muted-foreground">No one assigned</span>}
              {teachers.map(t => <span key={t.userId} className="inline-flex max-w-full items-center gap-2 rounded-full border bg-muted/40 py-0.5 pr-0.5 pl-0.5">
                <UserAvatar name={t.fullName} className="size-6 text-[10px]" />
                <Link href={`/admin/users/${t.userId}`} className="truncate text-sm hover:underline">{t.fullName}</Link>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 rounded-full text-muted-foreground hover:text-destructive" onClick={() => setRemoving(t)} aria-label={`Remove ${t.fullName} from ${subject.name}`}><X /></Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove from {subject.name}</TooltipContent>
                </Tooltip>
              </span>)}
            </div>
            {!orphan && <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setAssigning({ subjectId: subject.id })}><UserPlus /> Assign</Button>}
          </li>;
        })}
      </ul>}
    </CardContent>

    <AssignFacultyDialog open={!!assigning} onOpenChange={open => { if (!open) setAssigning(null); }} batch={batch} subjects={courseSubjects} subjectId={assigning?.subjectId} onSaved={onChange} />
    <RemoveFacultyDialog batch={batch} assignment={removing} onOpenChange={open => { if (!open) setRemoving(null); }} onRemoved={onReload} />
  </Card>;
}

// ---- Roster ----

const ALL = "all";

function RosterCard({ batch, onSeatsChanged }: { batch: Batch; onSeatsChanged: () => void }) {
  const { withToken } = useAuth();
  const roster = useAdminData(token => batchesApi.roster(token, batch.id), String(batch.id));
  const [enrolling, setEnrolling] = useState(false);
  const [searchText, setSearchText] = useState("");
  const search = useDebounced(searchText.trim().toLowerCase(), 150);
  const [status, setStatus] = useState<EnrollmentStatus | undefined>();
  const [updating, setUpdating] = useState<number | null>(null);

  const all = roster.data ?? [];
  const counts = Object.fromEntries(ENROLLMENT_STATUSES.map(s => [s, all.filter(r => r.status === s).length])) as Record<EnrollmentStatus, number>;
  const rows = all.filter(r => (!status || r.status === status) && (!search || [
    r.student_profiles.users.full_name, r.student_profiles.users.email, r.student_profiles.users.mobile, r.student_profiles.admission_number,
  ].some(v => v?.toLowerCase().includes(search))));

  const closed = closedForEnrollment(batch);
  const enrolBlockReason = closed ? `This batch is ${batch.status.toLowerCase()} and does not take new enrollments.` : undefined;

  const refresh = () => { roster.reload(); onSeatsChanged(); };

  async function changeStatus(entry: RosterEntry, next: EnrollmentStatus) {
    setUpdating(entry.id);
    try {
      await withToken(token => enrollmentsApi.update(token, entry.id, { status: next }));
      roster.setData(all.map(r => r.id === entry.id ? { ...r, status: next } : r));
      toast.success(`${entry.student_profiles.users.full_name}: ${titleCase(next).toLowerCase()}`);
      if (SEAT_STATUSES.includes(next) !== SEAT_STATUSES.includes(entry.status)) refresh();
    } catch (e) {
      toast.error(seatError(e, batch, "Could not change the enrollment."), { duration: 8000 });
    } finally {
      setUpdating(null);
    }
  }

  const enrolButton = <Button size="sm" onClick={() => setEnrolling(true)} disabled={closed || !roster.data}><UserPlus /> Enrol</Button>;

  return <Card>
    <CardHeader>
      <CardTitle>Students</CardTitle>
      <CardDescription>
        {roster.data ? `${counts.ACTIVE} active · ${counts.PENDING} pending${all.length > counts.ACTIVE + counts.PENDING ? ` · ${all.length - counts.ACTIVE - counts.PENDING} other` : ""}` : "Everyone enrolled in this batch."}
        {isFull(batch) && <span className="font-medium text-red-600 dark:text-red-400"> · Batch full</span>}
      </CardDescription>
      <CardAction>
        {enrolBlockReason
          ? <Tooltip><TooltipTrigger asChild><span className="inline-flex">{enrolButton}</span></TooltipTrigger><TooltipContent>{enrolBlockReason}</TooltipContent></Tooltip>
          : enrolButton}
      </CardAction>
    </CardHeader>
    <CardContent className="grid gap-4 px-0">
      {enrolBlockReason && <p className="px-6 text-sm text-muted-foreground">{enrolBlockReason}</p>}
      {all.length > 0 && <div className="grid grid-cols-1 gap-3 px-6 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search name, mobile or admission no." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search students" />
        </div>
        <Select value={status ?? ALL} onValueChange={v => setStatus(v === ALL ? undefined : v as EnrollmentStatus)}>
          <SelectTrigger className="w-full" aria-label="Filter by enrollment status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses ({all.length})</SelectItem>
            {ENROLLMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)} ({counts[s]})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>}

      {roster.error && <div className="px-6"><ErrorAlert message={roster.error} onRetry={roster.reload} /></div>}
      {!roster.data && roster.loading && <LoadingRows rows={4} />}
      {roster.data && all.length === 0 && <EmptyState icon={GraduationCap} title="No students yet" description={closed ? undefined : "Enrol the first student in this batch."}
        action={!closed && <Button onClick={() => setEnrolling(true)}><UserPlus /> Enrol student</Button>} />}
      {roster.data && all.length > 0 && rows.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted-foreground">No students match these filters.</p>}
      {rows.length > 0 && <div className={roster.loading ? "border-t opacity-60 transition-opacity" : "border-t transition-opacity"}>
        <RosterTable rows={rows} updating={updating} onStatus={changeStatus} />
        <RosterCards rows={rows} updating={updating} onStatus={changeStatus} />
      </div>}
    </CardContent>

    <EnrollStudentDialog open={enrolling} onOpenChange={setEnrolling} batch={batch} roster={all} onEnrolled={refresh} />
  </Card>;
}

type StatusChange = (entry: RosterEntry, status: EnrollmentStatus) => void;

function StatusMenu({ entry, updating, onStatus, full = false }: { entry: RosterEntry; updating: number | null; onStatus: StatusChange; full?: boolean }) {
  const busy = updating === entry.id;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" disabled={busy || updating !== null} className={full ? "w-full" : undefined} aria-label={`Change status of ${entry.student_profiles.users.full_name}`}>
        {busy ? <Loader2 className="animate-spin" /> : null}Status <ChevronDown />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72">
      <DropdownMenuLabel>Change to</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {ENROLLMENT_STATUSES.filter(s => s !== entry.status).map(s => <DropdownMenuItem key={s} onSelect={() => onStatus(entry, s)} className="flex-col items-start gap-0.5">
        <span className="font-medium">{titleCase(s)}</span>
        <span className="text-xs text-muted-foreground">{ENROLLMENT_STATUS_HELP[s]}</span>
      </DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

function accessWindow(r: RosterEntry) {
  if (!r.access_starts_at && !r.access_ends_at) return "No limit";
  return `${r.access_starts_at ? formatDay(r.access_starts_at) : "Now"} – ${r.access_ends_at ? formatDay(r.access_ends_at) : "open"}`;
}

function RosterTable({ rows, updating, onStatus }: { rows: RosterEntry[]; updating: number | null; onStatus: StatusChange }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-6">Student</TableHead>
        <TableHead className="hidden lg:table-cell">Contact</TableHead>
        <TableHead className="hidden xl:table-cell">Guardian</TableHead>
        <TableHead className="hidden lg:table-cell">Enrolled</TableHead>
        <TableHead className="hidden xl:table-cell">Access</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="pr-6 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(r => {
        const p = r.student_profiles;
        return <TableRow key={r.id}>
          <TableCell className="pl-6">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={p.users.full_name} />
              <div className="min-w-0">
                <Link href={`/admin/users/${p.user_id}`} className="block max-w-[14rem] truncate font-medium hover:underline">{p.users.full_name}</Link>
                <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{[p.admission_number && `Adm. ${p.admission_number}`, p.grade].filter(Boolean).join(" · ") || "No admission no."}</p>
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden text-muted-foreground lg:table-cell">
            <p className="max-w-[12rem] truncate">{p.users.mobile ?? "—"}</p>
            <p className="max-w-[12rem] truncate text-xs">{p.users.email}</p>
          </TableCell>
          <TableCell className="hidden text-muted-foreground xl:table-cell">
            <p className="max-w-[10rem] truncate">{p.guardian_name ?? "—"}</p>
            <p className="text-xs">{p.guardian_mobile}</p>
          </TableCell>
          <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(r.enrolled_at)}</TableCell>
          <TableCell className="hidden text-muted-foreground xl:table-cell">{accessWindow(r)}</TableCell>
          <TableCell><Pill value={r.status} tones={ENROLLMENT_TONES} /></TableCell>
          <TableCell className="pr-6 text-right"><StatusMenu entry={r} updating={updating} onStatus={onStatus} /></TableCell>
        </TableRow>;
      })}
    </TableBody>
  </Table>;
}

function RosterCards({ rows, updating, onStatus }: { rows: RosterEntry[]; updating: number | null; onStatus: StatusChange }) {
  return <ul className="divide-y md:hidden">
    {rows.map(r => {
      const p = r.student_profiles;
      return <li key={r.id} className="grid gap-3 px-4 py-4">
        <div className="flex items-start gap-3">
          <UserAvatar name={p.users.full_name} />
          <div className="min-w-0 flex-1">
            <Link href={`/admin/users/${p.user_id}`} className="block truncate font-medium hover:underline">{p.users.full_name}</Link>
            <p className="truncate text-xs text-muted-foreground">{[p.admission_number && `Adm. ${p.admission_number}`, p.users.mobile].filter(Boolean).join(" · ") || p.users.email}</p>
            {p.guardian_name && <p className="truncate text-xs text-muted-foreground">Guardian: {p.guardian_name}{p.guardian_mobile && ` · ${p.guardian_mobile}`}</p>}
          </div>
          <Pill value={r.status} tones={ENROLLMENT_TONES} className="shrink-0" />
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Enrolled {formatDate(r.enrolled_at)}</span>
          <span className="truncate text-right">Access: {accessWindow(r)}</span>
        </div>
        <StatusMenu entry={r} updating={updating} onStatus={onStatus} full />
      </li>;
    })}
  </ul>;
}

function DetailSkeleton() {
  return <div className="grid gap-6">
    <Skeleton className="h-28 w-full rounded-xl" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
    <Skeleton className="h-48 rounded-xl" />
    <Skeleton className="h-64 rounded-xl" />
  </div>;
}
