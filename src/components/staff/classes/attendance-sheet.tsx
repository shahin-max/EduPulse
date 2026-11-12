"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCheck, ClipboardCheck, Clock, Info, Loader2, Search, Undo2, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_STATUSES, classesApi, classPickersApi,
  type AttendanceRow, type AttendanceSheet as Sheet, type AttendanceStatus, type ClassSession,
} from "@/lib/staff-classes-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, errorText, formatDate, LoadingRows, Pill, titleCase } from "@/components/admin/ui";
import { ATTENDANCE_META, dayLabel, hasStarted, timeOf } from "./class-shared";

type Changes = Record<number, AttendanceStatus | null>;

/**
 * Attendance for one class, built for a phone in the classroom: mark everyone present, tap the
 * exceptions, then save from the sticky bar. Only changed marks are sent (PUT overwrites them).
 */
export default function AttendanceSheet({ session }: { session: ClassSession }) {
  const { withToken, user: me } = useAuth();
  const sheet = useAdminData(token => classesApi.attendance(token, session.id), `attendance:${session.id}`);
  // Faculty of the batch, to put a name to "marked by" (the API only returns a user id).
  const batch = useAdminData(token => classPickersApi.batch(token, session.batch_id).catch(() => null), `attendance-batch:${session.batch_id}`);
  const [changes, setChanges] = useState<Changes>({});
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const cancelled = session.status === "CANCELLED";
  const started = hasStarted(session);
  const editable = !cancelled && started;
  const dirty = Object.keys(changes).length > 0;

  useUnsavedChangesWarning(dirty);

  // Opened from a "Mark attendance" link: scroll here once the sheet is on screen.
  const loaded = !!sheet.data;
  useEffect(() => {
    if (loaded && window.location.hash === "#attendance") document.getElementById("attendance")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loaded]);

  const rows = sheet.data?.students ?? [];
  const markOf = (row: AttendanceRow) => row.enrollment_id in changes ? changes[row.enrollment_id]! : row.status;

  function setMark(row: AttendanceRow, status: AttendanceStatus) {
    setChanges(current => {
      const next = { ...current };
      const now = row.enrollment_id in current ? current[row.enrollment_id] : row.status;
      // Tapping the active mark again clears a new, unsaved mark (saved marks cannot be removed).
      const target = now === status && row.status === null ? null : status;
      if (target === row.status) delete next[row.enrollment_id];
      else next[row.enrollment_id] = target;
      return next;
    });
  }

  function markPresent(onlyUnmarked: boolean) {
    setChanges(current => {
      const next = { ...current };
      for (const row of rows) {
        const now = row.enrollment_id in current ? current[row.enrollment_id] : row.status;
        if (onlyUnmarked && now !== null) continue;
        if (row.status === "PRESENT") delete next[row.enrollment_id];
        else next[row.enrollment_id] = "PRESENT";
      }
      return next;
    });
  }

  async function save() {
    const entries = rows
      .filter(row => row.enrollment_id in changes && changes[row.enrollment_id])
      .map(row => ({ enrollmentId: row.enrollment_id, status: changes[row.enrollment_id]! }));
    if (entries.length === 0) { setChanges({}); return; }
    setBusy(true);
    try {
      const updated: Sheet = await withToken(token => classesApi.markAttendance(token, session.id, entries));
      sheet.setData(updated);
      setChanges({});
      toast.success(`Attendance saved for ${entries.length} student${entries.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(errorText(e, "Could not save the attendance."));
    } finally {
      setBusy(false);
    }
  }

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, unmarked: 0 };
  for (const row of rows) {
    const mark = markOf(row);
    if (mark) counts[mark]++;
    else counts.unmarked++;
  }

  // Who saved last: the newest marked_at among the saved marks.
  const last = rows.reduce<AttendanceRow | null>((latest, row) => row.marked_at && (!latest || row.marked_at > latest.marked_at!) ? row : latest, null);
  const markerName = (id: number | null) => {
    if (id === null) return null;
    if (id === me?.id) return "you";
    if (session.faculty_profiles?.user_id === id) return session.faculty_profiles.users.full_name;
    return batch.data?.faculty.find(f => f.userId === id)?.fullName ?? "another staff member";
  };

  const term = search.trim().toLowerCase();
  const visible = term ? rows.filter(r => r.full_name.toLowerCase().includes(term) || (r.admission_number ?? "").toLowerCase().includes(term)) : rows;

  return <Card id="attendance" className="scroll-mt-4 gap-0 pb-0">
    <CardHeader className="border-b pb-4 [.border-b]:pb-4">
      <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-5 text-muted-foreground" /> Attendance</CardTitle>
      <CardDescription>
        {last ? <>Last marked {formatDate(last.marked_at, true)} by {markerName(last.marked_by)}.</> : editable ? "Not marked yet." : null}
        {sheet.data?.summary.percentage != null && <> Saved attendance: <strong className="text-foreground">{sheet.data.summary.percentage}%</strong>.</>}
      </CardDescription>
    </CardHeader>

    <CardContent className="grid gap-4 px-0 pt-4">
      {cancelled && <div className="px-4 sm:px-6"><Alert><Info /><AlertTitle>This class was cancelled</AlertTitle><AlertDescription>Attendance cannot be marked for a cancelled class.</AlertDescription></Alert></div>}
      {!cancelled && !started && <div className="px-4 sm:px-6"><Alert><Clock /><AlertTitle>Attendance opens when the class starts</AlertTitle><AlertDescription>You can mark it from {dayLabel(session.starts_at)}, {timeOf(session.starts_at)}.</AlertDescription></Alert></div>}
      {sheet.error && <div className="px-4 sm:px-6"><ErrorAlert title="Could not load the attendance" message={sheet.error} onRetry={sheet.reload} /></div>}
      {!sheet.data && sheet.loading && <LoadingRows rows={5} />}
      {sheet.data && rows.length === 0 && <EmptyState icon={Users} title="No students in this batch" description="Students with an active enrollment appear here." />}

      {rows.length > 0 && <>
        <div className="flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:px-6">
          {editable && <Button size="lg" className="h-11 sm:w-auto" onClick={() => markPresent(counts.unmarked > 0)}>
            <CheckCheck />{counts.unmarked > 0 && counts.unmarked < rows.length ? `Mark remaining ${counts.unmarked} present` : "Mark all present"}
          </Button>}
          {rows.length > 10 && <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" placeholder="Find a student" value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-9" aria-label="Find a student" />
          </div>}
        </div>

        <ul className="divide-y border-t">
          {visible.map(row => <StudentRow key={row.enrollment_id} row={row} mark={markOf(row)} changed={row.enrollment_id in changes} editable={editable} onMark={status => setMark(row, status)} />)}
          {visible.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No student matches “{search}”.</li>}
        </ul>

        {/* Sticky save bar: stays at the bottom of the screen while the list scrolls. */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-b-xl border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" aria-live="polite">
            {ATTENDANCE_STATUSES.filter(s => s !== "EXCUSED" || counts.EXCUSED > 0).map(s => <span key={s} className={cn("font-medium tabular-nums", ATTENDANCE_META[s].text)}>{counts[s]} {ATTENDANCE_META[s].label.toLowerCase()}</span>)}
            {counts.unmarked > 0 && <span className="tabular-nums text-muted-foreground">{counts.unmarked} unmarked</span>}
          </div>
          {editable && <div className="flex gap-2 sm:ml-auto">
            {dirty && <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => setChanges({})} disabled={busy}><Undo2 /> Discard</Button>}
            <Button className="h-11 flex-[2] sm:flex-none" onClick={save} disabled={!dirty || busy}>
              {busy && <Loader2 className="animate-spin" />}{dirty ? `Save ${Object.values(changes).filter(Boolean).length} change${Object.values(changes).filter(Boolean).length === 1 ? "" : "s"}` : "Saved"}
            </Button>
          </div>}
        </div>
      </>}
    </CardContent>
  </Card>;
}

function StudentRow({ row, mark, changed, editable, onMark }: { row: AttendanceRow; mark: AttendanceStatus | null; changed: boolean; editable: boolean; onMark: (status: AttendanceStatus) => void }) {
  return <li className={cn("flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6", changed && "bg-amber-500/5")}>
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-2 font-medium">
        <span className="truncate">{row.full_name}</span>
        {changed && <span className="size-2 shrink-0 rounded-full bg-amber-500" title="Not saved yet" aria-label="Not saved yet" />}
      </p>
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        {row.admission_number && <span className="font-mono">{row.admission_number}</span>}
        {row.enrollment_status !== "ACTIVE" && <Pill value={row.enrollment_status} tones={{}} label={titleCase(row.enrollment_status)} className="h-5 text-[11px]" />}
        {!editable && !mark && <span>Not marked</span>}
      </p>
    </div>
    <div role="radiogroup" aria-label={`Attendance for ${row.full_name}`} className="grid grid-cols-4 gap-1.5 sm:flex sm:shrink-0">
      {ATTENDANCE_STATUSES.map(status => {
        const meta = ATTENDANCE_META[status];
        const active = mark === status;
        return <Button key={status} type="button" role="radio" aria-checked={active} variant="outline" disabled={!editable}
          onClick={() => onMark(status)}
          className={cn("h-11 px-2 text-sm sm:w-[5.5rem]", active ? meta.active : "text-muted-foreground", !editable && active && "disabled:opacity-100")}>
          {meta.label}
        </Button>;
      })}
    </div>
  </li>;
}

/** Warns before leaving with unsaved marks: closing or reloading the tab, and in-app links. */
function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const message = "You have unsaved attendance. Leave without saving?";
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    // Captured on the document, before Next's <Link> handles the click.
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", click, true); };
  }, [dirty]);
}
