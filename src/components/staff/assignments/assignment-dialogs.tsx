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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { ErrorAlert, errorText, Field, Optional, titleCase } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { batchLabel, type StaffBatch } from "@/components/staff/use-staff";
import { coursesApi } from "@/lib/admin-catalog-api";
import {
  ASSIGNMENT_STATUS_HELP, ASSIGNMENT_STATUSES, assignmentsApi, type Assignment, type AssignmentStatus, type AssignmentUpdate, type FileAsset, type Submission,
} from "@/lib/staff-learning-api";
import { FileUploadField } from "@/components/staff/materials/files";

const NONE = "none";

/** ISO string -> value for <input type="datetime-local"> in the browser's time zone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Create an assignment, or edit one when `assignment` is given (its batch cannot change). */
export function AssignmentFormDialog({ open, onOpenChange, assignment, batches, defaultBatchId, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: Assignment;
  /** Batches that can receive new work (`useStaffBatches().open`); for edits, any list containing the batch. */
  batches: StaffBatch[];
  defaultBatchId?: number;
  onSaved: (assignment: Assignment) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <AssignmentForm assignment={assignment} batches={batches} defaultBatchId={defaultBatchId} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function AssignmentForm({ assignment, batches, defaultBatchId, onSaved, onClose }: {
  assignment?: Assignment;
  batches: StaffBatch[];
  defaultBatchId?: number;
  onSaved: (assignment: Assignment) => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const initialBatch = assignment?.batch_id ?? (batches.some(b => b.id === defaultBatchId) ? defaultBatchId : batches[0]?.id);
  const [batchId, setBatchId] = useState<number | undefined>(initialBatch);
  const [subjectId, setSubjectId] = useState(assignment?.subject_id ? String(assignment.subject_id) : NONE);
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [instructions, setInstructions] = useState(assignment?.instructions ?? "");
  const [file, setFile] = useState<FileAsset | null>(assignment?.file_assets ?? null);
  const [dueAt, setDueAt] = useState(toLocalInput(assignment?.due_at));
  const [maxMarks, setMaxMarks] = useState(assignment?.max_marks ? String(Number(assignment.max_marks)) : "");
  const [status, setStatus] = useState<AssignmentStatus>(assignment?.status ?? "DRAFT");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const batch = batches.find(b => b.id === batchId);
  const courseId = batch?.courses.id;
  const subjects = useAdminData(token => courseId ? coursesApi.get(token, courseId).then(c => c.course_subjects.map(cs => cs.subjects)) : Promise.resolve([]), `course-subjects:${courseId}`);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!batchId) { setError("Choose a batch."); return; }
    const marks = maxMarks.trim() === "" ? null : Number(maxMarks);
    if (marks !== null && (!Number.isFinite(marks) || marks < 0)) { setError("Max marks must be a positive number."); return; }
    const due = dueAt ? new Date(dueAt).toISOString() : null;
    const subject = subjectId === NONE ? null : Number(subjectId);
    setSaving(true);
    try {
      let saved: Assignment;
      if (assignment) {
        const input: AssignmentUpdate = {};
        if (subject !== assignment.subject_id) input.subjectId = subject;
        if (title.trim() !== assignment.title) input.title = title.trim();
        if ((instructions || null) !== (assignment.instructions || null)) input.instructions = instructions || null;
        if ((file?.id ?? null) !== assignment.attachment_asset_id) input.attachmentAssetId = file?.id ?? null;
        if (dueAt !== toLocalInput(assignment.due_at)) input.dueAt = due;
        if (marks !== (assignment.max_marks === null ? null : Number(assignment.max_marks))) input.maxMarks = marks;
        if (status !== assignment.status) input.status = status;
        saved = Object.keys(input).length ? await withToken(token => assignmentsApi.update(token, assignment.id, input)) : assignment;
        toast.success("Assignment saved");
      } else {
        saved = await withToken(token => assignmentsApi.create(token, {
          batchId, title: title.trim(), status,
          ...(subject ? { subjectId: subject } : {}),
          ...(instructions.trim() ? { instructions } : {}),
          ...(file ? { attachmentAssetId: file.id } : {}),
          ...(due ? { dueAt: due } : {}),
          ...(marks !== null ? { maxMarks: marks } : {}),
        }));
        toast.success(status === "PUBLISHED" ? "Assignment published to the batch" : "Assignment saved as a draft");
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorText(err, "Could not save the assignment."));
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <DialogHeader>
      <DialogTitle>{assignment ? "Edit assignment" : "New assignment"}</DialogTitle>
      <DialogDescription>{assignment ? (batch ? batchLabel(batch) : "") : "Homework or a worksheet for one batch."}</DialogDescription>
    </DialogHeader>
    {error && <ErrorAlert title="Could not save" message={error} />}

    {!assignment && <Field id="a-batch" label="Batch">
      <Select value={batchId ? String(batchId) : ""} onValueChange={v => { setBatchId(Number(v)); setSubjectId(NONE); }} disabled={!batches.length}>
        <SelectTrigger id="a-batch" className="w-full"><SelectValue placeholder="No open batches" /></SelectTrigger>
        <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}</SelectItem>)}</SelectContent>
      </Select>
    </Field>}

    <Field id="a-subject" label={<>Subject <Optional /></>}>
      <Select value={subjectId} onValueChange={setSubjectId}>
        <SelectTrigger id="a-subject" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>No subject</SelectItem>
          {(subjects.data ?? []).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>

    <Field id="a-title" label="Title">
      <Input id="a-title" value={title} onChange={e => setTitle(e.target.value)} required minLength={2} maxLength={200} placeholder="Worksheet 3: Kinematics" />
    </Field>

    <Field id="a-instructions" label={<>Instructions <Optional /></>}>
      <Textarea id="a-instructions" value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={20000} rows={4} placeholder="Solve questions 1-15. Show all working." />
    </Field>

    <Field id="a-file" label={<>Attachment <Optional /></>}>
      <FileUploadField id="a-file" value={file} onChange={setFile} onBusyChange={setUploading} />
    </Field>

    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="a-due" label={<>Due <Optional /></>} hint="Later submissions are accepted but marked late.">
        <Input id="a-due" type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
      </Field>
      <Field id="a-marks" label={<>Max marks <Optional /></>} hint="Leave empty for ungraded work.">
        <Input id="a-marks" type="number" inputMode="decimal" min={0} max={999999.99} step={0.01} value={maxMarks} onChange={e => setMaxMarks(e.target.value)} />
      </Field>
    </div>

    <Field id="a-status" label="Status" hint={ASSIGNMENT_STATUS_HELP[status]}>
      <Select value={status} onValueChange={v => setStatus(v as AssignmentStatus)}>
        <SelectTrigger id="a-status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{ASSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
      </Select>
    </Field>

    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving || uploading || !batchId}>{saving && <Loader2 className="animate-spin" />}{assignment ? "Save" : "Create"}</Button>
    </DialogFooter>
  </form>;
}

/** Deletes an assignment without submissions; once students have submitted, offers to close it instead. */
export function DeleteAssignmentDialog({ assignment, open, onOpenChange, onDeleted, onClosed }: {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  onClosed: (assignment: Assignment) => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [hasSubmissions, setHasSubmissions] = useState(false);

  async function confirm(e: React.MouseEvent) {
    e.preventDefault();
    if (!assignment) return;
    setBusy(true);
    try {
      if (hasSubmissions) {
        const saved = await withToken(token => assignmentsApi.update(token, assignment.id, { status: "CLOSED" }));
        toast.success(`${assignment.title} closed`);
        onClosed(saved);
      } else {
        await withToken(token => assignmentsApi.remove(token, assignment.id));
        toast.success(`${assignment.title} deleted`);
        onDeleted();
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setHasSubmissions(true);
      else toast.error(errorText(err, "Could not delete the assignment."));
    } finally {
      setBusy(false);
    }
  }

  return <AlertDialog open={open} onOpenChange={v => { if (!v) setHasSubmissions(false); onOpenChange(v); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{hasSubmissions ? "Students have submitted this" : `Delete ${assignment?.title}?`}</AlertDialogTitle>
        <AlertDialogDescription>
          {hasSubmissions
            ? "An assignment with submissions cannot be deleted. Close it instead: students still see it and their marks, but cannot submit."
            : "This cannot be undone. Assignments that students have already submitted cannot be deleted."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={confirm} disabled={busy} className={hasSubmissions ? undefined : "bg-destructive text-white hover:bg-destructive/90"}>
          {busy && <Loader2 className="animate-spin" />}{hasSubmissions ? "Close assignment" : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

/** Record marks and/or feedback on a submission (PATCH /assignment-submissions/:id/review). */
export function ReviewDialog({ submission, maxMarks, open, onOpenChange, onSaved }: {
  submission: Submission | null;
  maxMarks: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (submission: Submission) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
      {open && submission && <ReviewForm submission={submission} maxMarks={maxMarks} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function ReviewForm({ submission, maxMarks, onSaved, onClose }: { submission: Submission; maxMarks: string | null; onSaved: (s: Submission) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [marks, setMarks] = useState(submission.marks_awarded === null ? "" : String(Number(submission.marks_awarded)));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const max = maxMarks === null ? null : Number(maxMarks);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = marks.trim() === "" ? undefined : Number(marks);
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) { setError("Marks must be a positive number."); return; }
    if (value !== undefined && max !== null && value > max) { setError(`Marks cannot exceed ${max}.`); return; }
    if (value === undefined && !feedback.trim()) { setError("Enter marks, feedback or both."); return; }
    setSaving(true);
    try {
      const saved = await withToken(token => assignmentsApi.review(token, submission.id, {
        ...(value !== undefined ? { marksAwarded: value } : {}),
        // An emptied box clears earlier feedback; otherwise leave it out.
        ...(feedback.trim() ? { feedback } : submission.feedback ? { feedback: "" } : {}),
      }));
      toast.success("Review saved");
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errorText(err, "Could not save the review."));
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4">
    <DialogHeader>
      <DialogTitle>Review submission</DialogTitle>
      <DialogDescription>{submission.enrollments.student_profiles.users.full_name}. Once reviewed, the student can no longer resubmit.</DialogDescription>
    </DialogHeader>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <Field id="r-marks" label={max === null ? <>Marks <Optional /></> : `Marks (out of ${max})`}>
      <Input id="r-marks" type="number" inputMode="decimal" min={0} max={max ?? 999999.99} step={0.01} value={marks} onChange={e => setMarks(e.target.value)} />
    </Field>
    <Field id="r-feedback" label={<>Feedback <Optional /></>}>
      <Textarea id="r-feedback" value={feedback} onChange={e => setFeedback(e.target.value)} maxLength={20000} rows={4} placeholder="Good work on Q3; revise vector addition." />
    </Field>
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save review</Button>
    </DialogFooter>
  </form>;
}
