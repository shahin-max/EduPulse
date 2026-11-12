"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import type { AdminUser } from "@/lib/admin-api";
import {
  batchesApi, enrollmentsApi, SEAT_STATUSES,
  type Batch, type BatchFaculty, type RosterEntry, type SubjectRef,
} from "@/lib/admin-batches-api";
import { ErrorAlert, errorText, Field, Optional, titleCase } from "../ui";
import { ENROLLMENT_STATUS_HELP, UserPicker } from "./batch-shared";

/** True when the batch takes no new enrollments (the API answers 400). */
export const closedForEnrollment = (batch: Batch) => batch.status === "COMPLETED" || batch.status === "CANCELLED";
export const isFull = (batch: Batch) => batch.seatsAvailable === 0;

/** Turns the API's capacity 409 ("This batch is full") into an actionable message. */
export function seatError(e: unknown, batch: Batch, fallback: string) {
  if (e instanceof ApiError && e.status === 409 && /full/i.test(e.message))
    return `This batch is full: ${batch.capacity ? `all ${batch.capacity} seats are` : "every seat is"} taken by pending or active students. Raise the batch capacity, or free a seat by marking another enrollment paused, completed or cancelled.`;
  return errorText(e, fallback);
}

// ---- Faculty ----

export function AssignFacultyDialog({ open, onOpenChange, batch, subjects, subjectId, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch;
  subjects: SubjectRef[];
  subjectId?: number;
  onSaved: (batch: Batch) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <AssignFacultyForm batch={batch} subjects={subjects} initialSubjectId={subjectId} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function AssignFacultyForm({ batch, subjects, initialSubjectId, onSaved, onClose }: {
  batch: Batch;
  subjects: SubjectRef[];
  initialSubjectId?: number;
  onSaved: (batch: Batch) => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const [subjectId, setSubjectId] = useState(initialSubjectId ? String(initialSubjectId) : subjects.length === 1 ? String(subjects[0]!.id) : "");
  const [faculty, setFaculty] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const assigned = (userId: number) => batch.faculty.some(f => f.userId === userId && String(f.subject.id) === subjectId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subjectId) return setError("Choose a subject.");
    if (!faculty) return setError("Choose a faculty member.");
    setBusy(true);
    setError("");
    try {
      const updated = await withToken(token => batchesApi.assignFaculty(token, batch.id, faculty.id, Number(subjectId)));
      const subject = subjects.find(s => String(s.id) === subjectId);
      toast.success(`${faculty.full_name} now teaches ${subject?.name ?? "the subject"}`);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not assign the faculty member."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Assign faculty</DialogTitle>
      <DialogDescription>Who teaches a subject in {batch.code}. A subject can have more than one teacher.</DialogDescription>
    </DialogHeader>
    {subjects.length === 0
      ? <ErrorAlert title="No subjects" message="This batch's course has no subjects yet. Add subjects to the course first." />
      : <Field id="subject" label="Subject">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger id="subject" className="w-full"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
          <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
        </Select>
      </Field>}
    <Field id="faculty-search" label="Faculty member" hint="Active faculty accounts only.">
      <UserPicker id="faculty-search" role="FACULTY" status="ACTIVE" value={faculty} onChange={setFaculty}
        isDisabled={u => (subjectId && assigned(u.id) ? "Already teaches this subject here" : undefined)} />
    </Field>
    {error && <ErrorAlert title="Could not assign" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy || subjects.length === 0}>{busy && <Loader2 className="animate-spin" />}Assign</Button>
    </DialogFooter>
  </form>;
}

export function RemoveFacultyDialog({ batch, assignment, onOpenChange, onRemoved }: {
  batch: Batch;
  assignment: BatchFaculty | null;
  onOpenChange: (open: boolean) => void;
  onRemoved: () => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!assignment) return;
    setBusy(true);
    try {
      await withToken(token => batchesApi.unassignFaculty(token, batch.id, assignment.userId, assignment.subject.id));
      toast.success(`${assignment.fullName} removed from ${assignment.subject.name}`);
      onOpenChange(false);
      onRemoved();
    } catch (e) {
      toast.error(errorText(e, "Could not remove the assignment."));
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={!!assignment} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove {assignment?.fullName}?</AlertDialogTitle>
        <AlertDialogDescription>They will no longer teach {assignment?.subject.name} in {batch.code}, and lose access to this batch unless they teach another subject in it. Classes and assignments they already created are kept.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <Button onClick={remove} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Remove</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

// ---- Enrollments ----

export function EnrollStudentDialog({ open, onOpenChange, batch, roster, onEnrolled }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch;
  roster: RosterEntry[];
  onEnrolled: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <EnrollForm batch={batch} roster={roster} onEnrolled={onEnrolled} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function EnrollForm({ batch, roster, onEnrolled, onClose }: { batch: Batch; roster: RosterEntry[]; onEnrolled: () => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [student, setStudent] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<"ACTIVE" | "PENDING">("ACTIVE");
  const [accessStartsAt, setAccessStartsAt] = useState("");
  const [accessEndsAt, setAccessEndsAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const byStudent = new Map(roster.map(r => [r.student_profiles.user_id, r]));
  const previous = student ? byStudent.get(student.id) : undefined;

  function blocked(u: AdminUser) {
    if (u.status === "SUSPENDED" || u.status === "DISABLED") return `Account ${u.status.toLowerCase()}`;
    const existing = byStudent.get(u.id);
    if (existing && SEAT_STATUSES.includes(existing.status)) return `Already enrolled (${titleCase(existing.status)})`;
    return undefined;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student) return setError("Choose a student.");
    if (accessStartsAt && accessEndsAt && accessEndsAt <= accessStartsAt) return setError("Access must end after it starts.");
    setBusy(true);
    setError("");
    try {
      await withToken(token => enrollmentsApi.create(token, {
        studentUserId: student.id, batchId: batch.id, status,
        accessStartsAt: accessStartsAt || undefined, accessEndsAt: accessEndsAt || undefined,
      }));
      toast.success(`${student.full_name} enrolled in ${batch.code}`);
      onEnrolled();
      onClose();
    } catch (e) {
      setError(seatError(e, batch, "Could not enrol the student."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Enrol a student</DialogTitle>
      <DialogDescription>Add a student to {batch.name} ({batch.code}).</DialogDescription>
    </DialogHeader>
    {isFull(batch) && <Alert className="border-amber-500/40 text-amber-800 dark:text-amber-300">
      <TriangleAlert />
      <AlertTitle>This batch is full</AlertTitle>
      <AlertDescription>All {batch.capacity} seats are taken. Raise the capacity (Edit batch) or free a seat first; otherwise the enrollment will be refused.</AlertDescription>
    </Alert>}
    <Field id="student-search" label="Student" hint="Students who are suspended, disabled or already enrolled cannot be picked.">
      <UserPicker id="student-search" role="STUDENT" value={student} onChange={setStudent} isDisabled={blocked} />
    </Field>
    {previous && <p className="text-sm text-muted-foreground">This student was in the batch before ({titleCase(previous.status).toLowerCase()}). Enrolling re-opens that enrollment.</p>}
    <Field id="enroll-status" label="Status" hint={ENROLLMENT_STATUS_HELP[status]}>
      <Select value={status} onValueChange={v => setStatus(v as "ACTIVE" | "PENDING")}>
        <SelectTrigger id="enroll-status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
        </SelectContent>
      </Select>
    </Field>
    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      <Field id="accessStartsAt" label={<>Access from <Optional /></>}>
        <Input id="accessStartsAt" type="date" value={accessStartsAt} onChange={e => setAccessStartsAt(e.target.value)} />
      </Field>
      <Field id="accessEndsAt" label={<>Access until <Optional /></>}>
        <Input id="accessEndsAt" type="date" value={accessEndsAt} min={accessStartsAt || undefined} onChange={e => setAccessEndsAt(e.target.value)} />
      </Field>
    </div>
    <p className="-mt-3 text-xs text-muted-foreground">Leave the access window empty for access for as long as the enrollment is active.</p>
    {error && <ErrorAlert title="Could not enrol" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Enrol student</Button>
    </DialogFooter>
  </form>;
}
