"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  CLASS_STATUSES, classesApi, classPickersApi, fromLocalInput, toLocalInput,
  type ClassSession, type ClassStatus, type CreateClassInput, type UpdateClassInput,
} from "@/lib/staff-classes-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, errorText, Field, Optional, titleCase } from "@/components/admin/ui";
import { batchLabel, useIsAdmin, useStaffBatches } from "../use-staff";
import { CLASS_STATUS_HELP, dayLabel, timeRange } from "./class-shared";

const NONE = "none";
const URL_PATTERN = "https?://.+";
const URL_TITLE = "A full link starting with https://";

/** Schedule a class, or edit one when `session` is given. */
export function ClassFormDialog({ open, onOpenChange, session, defaultBatchId, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: ClassSession;
  defaultBatchId?: number;
  onSaved: (session: ClassSession) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
      {/* Mounted only while open, so the form starts fresh each time. */}
      {open && <ClassForm session={session} defaultBatchId={defaultBatchId} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

/** Next full hour from now, as a datetime-local value. */
function nextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toLocalInput(d);
}

function plusMinutes(local: string, minutes: number) {
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return toLocalInput(new Date(d.getTime() + minutes * 60000));
}

function ClassForm({ session, defaultBatchId, onSaved, onClose }: { session?: ClassSession; defaultBatchId?: number; onSaved: (session: ClassSession) => void; onClose: () => void }) {
  const { withToken, user: me } = useAuth();
  const admin = useIsAdmin();
  const staff = useStaffBatches();
  const editing = !!session;

  const firstStart = session ? toLocalInput(session.starts_at) : nextHour();
  const [batchId, setBatchId] = useState(session ? String(session.batch_id) : defaultBatchId ? String(defaultBatchId) : "");
  const [subjectId, setSubjectId] = useState(session?.subject_id ? String(session.subject_id) : NONE);
  // Faculty creating a class teach it themselves unless they pick a colleague.
  const [teacherId, setTeacherId] = useState(session ? (session.faculty_user_id ? String(session.faculty_user_id) : NONE) : !admin && me ? String(me.id) : NONE);
  const [teacherTouched, setTeacherTouched] = useState(editing);
  const [title, setTitle] = useState(session?.title ?? "");
  const [startsAt, setStartsAt] = useState(firstStart);
  const [endsAt, setEndsAt] = useState(session ? toLocalInput(session.ends_at) : plusMinutes(firstStart, 60));
  const [meetingUrl, setMeetingUrl] = useState(session?.meeting_url ?? "");
  const [recordingUrl, setRecordingUrl] = useState(session?.recording_url ?? "");
  const [status, setStatus] = useState<ClassStatus>(session?.status ?? "SCHEDULED");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const batchNum = Number(batchId) || 0;
  const batch = useAdminData(token => batchNum ? classPickersApi.batch(token, batchNum) : Promise.resolve(null), `class-form-batch:${batchNum}`);
  const courseId = batch.data?.courses.id ?? 0;
  const course = useAdminData(token => courseId ? classPickersApi.course(token, courseId) : Promise.resolve(null), `class-form-course:${courseId}`);

  // Subjects of the batch's course; the class's current subject stays listed even if it was removed from the course.
  const subjects = course.data?.course_subjects.map(cs => cs.subjects) ?? [];
  if (session?.subjects && !subjects.some(s => s.id === session.subjects!.id) && batchNum === session.batch_id) subjects.push(session.subjects);

  // One entry per faculty member assigned to the batch, with the subjects they teach in it.
  const faculty = batch.data?.faculty ?? [];
  const teachers = faculty.reduce<{ id: number; name: string; subjects: string[] }[]>((list, f) => {
    const found = list.find(t => t.id === f.userId);
    if (found) found.subjects.push(f.subject.name);
    else list.push({ id: f.userId, name: f.fullName, subjects: [f.subject.name] });
    return list;
  }, []);
  if (session?.faculty_profiles && !teachers.some(t => t.id === session.faculty_profiles!.user_id) && batchNum === session.batch_id)
    teachers.push({ id: session.faculty_profiles.user_id, name: session.faculty_profiles.users.full_name, subjects: [] });

  // Batches for new classes: open ones, plus the preselected one if it is no longer open.
  const batchOptions = [...staff.open];
  const preselected = staff.batches.find(b => b.id === batchNum);
  if (preselected && !batchOptions.includes(preselected)) batchOptions.push(preselected);

  function changeBatch(value: string) {
    setBatchId(value);
    setSubjectId(NONE);
    if (admin) { setTeacherId(NONE); setTeacherTouched(false); }
  }

  function changeSubject(value: string) {
    setSubjectId(value);
    // Suggest the batch's teacher for that subject until a teacher was chosen by hand.
    if (!teacherTouched && value !== NONE) {
      const match = faculty.filter(f => String(f.subject.id) === value);
      if (match.length === 1) setTeacherId(String(match[0]!.userId));
    }
  }

  function changeStart(value: string) {
    // Keep the class length when the start moves.
    const length = new Date(endsAt).getTime() - new Date(startsAt).getTime();
    setStartsAt(value);
    if (value && Number.isFinite(length) && length > 0) setEndsAt(plusMinutes(value, length / 60000));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = fromLocalInput(startsAt);
    const end = fromLocalInput(endsAt);
    if (!batchNum) return setError("Choose a batch.");
    if (!start || !end) return setError("Enter the start and end time.");
    if (new Date(end) <= new Date(start)) return setError("The class must end after it starts.");
    setBusy(true);
    setError("");
    try {
      let saved: ClassSession;
      if (!session) {
        const input: CreateClassInput = { batchId: batchNum, title: title.trim(), startsAt: start, endsAt: end };
        if (subjectId !== NONE) input.subjectId = Number(subjectId);
        if (teacherId !== NONE) input.facultyUserId = Number(teacherId);
        if (meetingUrl.trim()) input.meetingUrl = meetingUrl.trim();
        saved = await withToken(token => classesApi.create(token, input));
        toast.success("Class scheduled");
      } else {
        // Only send what changed.
        const patch: UpdateClassInput = {};
        const subject = subjectId === NONE ? null : Number(subjectId);
        const teacher = teacherId === NONE ? null : Number(teacherId);
        if (subject !== session.subject_id) patch.subjectId = subject;
        if (teacher !== session.faculty_user_id) patch.facultyUserId = teacher;
        if (title.trim() !== session.title) patch.title = title.trim();
        if (new Date(start).getTime() !== new Date(session.starts_at).getTime()) patch.startsAt = start;
        if (new Date(end).getTime() !== new Date(session.ends_at).getTime()) patch.endsAt = end;
        if ((meetingUrl.trim() || null) !== session.meeting_url) patch.meetingUrl = meetingUrl.trim() || null;
        if ((recordingUrl.trim() || null) !== session.recording_url) patch.recordingUrl = recordingUrl.trim() || null;
        if (status !== session.status) patch.status = status;
        if (Object.keys(patch).length === 0) { onClose(); return; }
        saved = await withToken(token => classesApi.update(token, session.id, patch));
        toast.success("Class updated");
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the class."));
    } finally {
      setBusy(false);
    }
  }

  const pickersLoading = (batch.loading && !!batchNum) || (course.loading && !!courseId);

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{editing ? "Edit class" : "Schedule a class"}</DialogTitle>
      <DialogDescription>{editing ? `${dayLabel(session.starts_at)}, ${timeRange(session)}` : "Students of the batch see it in their timetable."}</DialogDescription>
    </DialogHeader>

    {editing
      ? <Field id="class-batch" label="Batch" hint="A class cannot move to another batch.">
        <Input id="class-batch" value={`${session.batches.name} (${session.batches.code})`} disabled />
      </Field>
      : <Field id="class-batch" label="Batch" hint={!staff.loading && batchOptions.length === 0 ? (admin ? "There are no planned or active batches." : "You are not assigned to any planned or active batch.") : undefined}>
        <Select value={batchId} onValueChange={changeBatch} disabled={staff.loading}>
          <SelectTrigger id="class-batch" className="w-full"><SelectValue placeholder={staff.loading ? "Loading batches…" : "Choose a batch"} /></SelectTrigger>
          <SelectContent>{batchOptions.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>}
    {staff.error && !editing && <ErrorAlert title="Could not load your batches" message={staff.error} onRetry={staff.reload} />}
    {batch.error && <ErrorAlert title="Could not load the batch" message={batch.error} onRetry={batch.reload} />}
    {course.error && <ErrorAlert title="Could not load the course subjects" message={course.error} onRetry={course.reload} />}

    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="class-subject" label={<>Subject <Optional /></>}>
        <Select value={subjectId} onValueChange={changeSubject} disabled={!batchNum || pickersLoading}>
          <SelectTrigger id="class-subject" className="w-full"><SelectValue placeholder={pickersLoading ? "Loading…" : "No subject"} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No subject</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id="class-teacher" label="Teacher" hint={batchNum && !pickersLoading && teachers.length === 0 ? "No faculty is assigned to this batch yet." : undefined}>
        <Select value={teacherId} onValueChange={v => { setTeacherId(v); setTeacherTouched(true); }} disabled={!batchNum || batch.loading}>
          <SelectTrigger id="class-teacher" className="w-full"><SelectValue placeholder="Not assigned" /></SelectTrigger>
          <SelectContent>
            {/* Faculty creating a class without a teacher would be assigned anyway, so "Not assigned" is only offered where it sticks. */}
            {(admin || editing) && <SelectItem value={NONE}>Not assigned</SelectItem>}
            {teachers.map(t => <SelectItem key={t.id} value={String(t.id)}>
              {t.id === me?.id ? `${t.name} (you)` : t.name}{t.subjects.length > 0 && <span className="text-muted-foreground"> · {t.subjects.join(", ")}</span>}
            </SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </div>

    <Field id="class-title" label="Title">
      <Input id="class-title" required minLength={2} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kinematics - problem session" autoComplete="off" />
    </Field>

    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="class-start" label="Starts">
        <Input id="class-start" type="datetime-local" required value={startsAt} onChange={e => changeStart(e.target.value)} />
      </Field>
      <Field id="class-end" label="Ends">
        <Input id="class-end" type="datetime-local" required value={endsAt} onChange={e => setEndsAt(e.target.value)} />
      </Field>
    </div>

    <Field id="class-meeting" label={<>Meeting link <Optional /></>} hint="Zoom or Google Meet link students use to join.">
      <Input id="class-meeting" type="url" inputMode="url" maxLength={2048} pattern={URL_PATTERN} title={URL_TITLE} value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" autoComplete="off" />
    </Field>

    {editing && <>
      <Field id="class-recording" label={<>Recording link <Optional /></>} hint="Add it after the class so students can rewatch.">
        <Input id="class-recording" type="url" inputMode="url" maxLength={2048} pattern={URL_PATTERN} title={URL_TITLE} value={recordingUrl} onChange={e => setRecordingUrl(e.target.value)} placeholder="https://…" autoComplete="off" />
      </Field>
      <Field id="class-status" label="Status" hint={CLASS_STATUS_HELP[status]}>
        <Select value={status} onValueChange={v => setStatus(v as ClassStatus)}>
          <SelectTrigger id="class-status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{CLASS_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </>}

    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Close</Button>
      <Button type="submit" disabled={busy || (!editing && !batchNum)}>{busy && <Loader2 className="animate-spin" />}{editing ? "Save changes" : "Schedule class"}</Button>
    </DialogFooter>
  </form>;
}

export function CancelClassDialog({ session, open, onOpenChange, onCancelled }: {
  session: ClassSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: (session: ClassSession) => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function cancel(event: React.MouseEvent) {
    event.preventDefault(); // keep the dialog open until the request finishes
    if (!session) return;
    setBusy(true);
    try {
      const updated = await withToken(token => classesApi.cancel(token, session.id));
      toast.success("Class cancelled");
      onOpenChange(false);
      onCancelled(updated);
    } catch (e) {
      toast.error(errorText(e, "Could not cancel the class."));
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel this class?</AlertDialogTitle>
        <AlertDialogDescription>
          {session && <><strong className="text-foreground">{session.title}</strong> on {dayLabel(session.starts_at)}, {timeRange(session)}. </>}
          Students will see it as cancelled and attendance cannot be marked. You can reschedule it later by editing its status.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Keep class</AlertDialogCancel>
        <AlertDialogAction onClick={cancel} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Cancel class</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
