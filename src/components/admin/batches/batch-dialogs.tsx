"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Loader2, Lock } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  BATCH_STATUSES, batchesApi, batchPickersApi, toDateInput,
  type Batch, type BatchStatus, type BranchOption, type CourseOption, type UpdateBatchInput,
} from "@/lib/admin-batches-api";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, errorText, Field, Optional, titleCase } from "../ui";
import { BATCH_STATUS_HELP } from "./batch-shared";

/** Branches and courses for the pickers. */
export function useBatchPickers() {
  return useAdminData(
    async token => {
      const [branches, courses] = await Promise.all([batchPickersApi.branches(token), batchPickersApi.courses(token)]);
      return { branches, courses };
    },
    "batch-pickers",
  );
}

export const courseLabel = (c: Pick<CourseOption, "code" | "title">) => `${c.title} (${c.code})`;

/** Create a batch, or edit one when `batch` is given. */
export function BatchFormDialog({ open, onOpenChange, batch, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch;
  onSaved: (batch: Batch) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {/* Mounted only while open, so the form starts fresh each time. */}
      {open && <BatchForm batch={batch} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function BatchForm({ batch, onSaved, onClose }: { batch?: Batch; onSaved: (batch: Batch) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const pickers = useBatchPickers();
  const [branchId, setBranchId] = useState(batch ? String(batch.branch_id) : "");
  const [courseId, setCourseId] = useState(batch ? String(batch.course_id) : "");
  const [code, setCode] = useState(batch?.code ?? "");
  const [name, setName] = useState(batch?.name ?? "");
  const [startDate, setStartDate] = useState(toDateInput(batch?.start_date));
  const [endDate, setEndDate] = useState(toDateInput(batch?.end_date));
  const [capacity, setCapacity] = useState(batch?.capacity ? String(batch.capacity) : "");
  const [status, setStatus] = useState<BatchStatus>(batch?.status ?? "PLANNED");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // New batches need an active branch and a course that is not archived; keep the current values selectable when editing.
  const branches: BranchOption[] = (pickers.data?.branches ?? []).filter(b => b.is_active || String(b.id) === branchId);
  const courses: CourseOption[] = (pickers.data?.courses ?? []).filter(c => c.status !== "ARCHIVED" || (batch && c.id === batch.course_id));
  const courseLocked = !!batch && batch.faculty.length > 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!batch && !branchId) return setError("Choose the branch that runs this batch.");
    if (!courseId) return setError("Choose a course.");
    if (startDate && endDate && endDate < startDate) return setError("The end date must be on or after the start date.");
    const cap = capacity.trim() ? Number(capacity) : null;
    if (cap !== null && (!Number.isInteger(cap) || cap < 1)) return setError("Capacity must be a whole number of at least 1, or empty for no limit.");
    setBusy(true);
    setError("");
    try {
      const fields = {
        courseId: Number(courseId),
        code: code.trim().toUpperCase(),
        name: name.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        capacity: cap,
        status,
      };
      let saved: Batch;
      if (!batch) {
        saved = await withToken(token => batchesApi.create(token, {
          ...fields, branchId: Number(branchId), startDate: fields.startDate ?? undefined, endDate: fields.endDate ?? undefined, capacity: cap ?? undefined,
        }));
        toast.success(`Batch ${saved.code} created`);
      } else {
        // Only send what changed.
        const patch: UpdateBatchInput = {};
        if (fields.courseId !== batch.course_id) patch.courseId = fields.courseId;
        if (fields.code !== batch.code) patch.code = fields.code;
        if (fields.name !== batch.name) patch.name = fields.name;
        if (fields.startDate !== (toDateInput(batch.start_date) || null)) patch.startDate = fields.startDate;
        if (fields.endDate !== (toDateInput(batch.end_date) || null)) patch.endDate = fields.endDate;
        if (cap !== batch.capacity) patch.capacity = cap;
        if (status !== batch.status) patch.status = status;
        if (Object.keys(patch).length === 0) return onClose();
        saved = await withToken(token => batchesApi.update(token, batch.id, patch));
        toast.success("Changes saved");
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      // A 409 here is the API's generic unique-constraint message; the batch code is the only unique field.
      setError(e instanceof ApiError && e.status === 409 ? "Another batch already uses this code." : errorText(e, "Could not save the batch."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{batch ? "Edit batch" : "New batch"}</DialogTitle>
      <DialogDescription>{batch ? `${batch.code} · ${batch.branches.name}` : "A batch is one running of a course at a branch, with its own dates, seats and faculty."}</DialogDescription>
    </DialogHeader>

    {pickers.error && <ErrorAlert title="Could not load branches and courses" message={pickers.error} onRetry={pickers.reload} />}

    {batch
      ? <Field id="branch" label="Branch" hint="The branch cannot be changed after a batch is created: its enrollments, invoices and payments belong to that branch.">
        <div id="branch" className="flex h-9 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm"><Lock className="size-3.5 text-muted-foreground" />{batch.branches.name} ({batch.branches.code})</div>
      </Field>
      : <Field id="branch" label="Branch" hint="Cannot be changed later: enrollments, invoices and payments are tied to the branch.">
        {pickers.loading && !pickers.data ? <Skeleton className="h-9 w-full" /> : <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger id="branch" className="w-full"><SelectValue placeholder="Choose a branch" /></SelectTrigger>
          <SelectContent>{branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.code})</SelectItem>)}</SelectContent>
        </Select>}
      </Field>}

    <Field id="course" label="Course" hint={courseLocked ? "Remove the faculty assignments before moving the batch to another course." : "Draft courses can have batches; archived ones cannot."}>
      {pickers.loading && !pickers.data ? <Skeleton className="h-9 w-full" /> : <Select value={courseId} onValueChange={setCourseId} disabled={courseLocked}>
        <SelectTrigger id="course" className="w-full [&>span]:truncate"><SelectValue placeholder="Choose a course" /></SelectTrigger>
        <SelectContent>{courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{courseLabel(c)}{c.status !== "PUBLISHED" && ` · ${titleCase(c.status)}`}</SelectItem>)}</SelectContent>
      </Select>}
    </Field>

    <div className="grid gap-5 sm:grid-cols-[2fr_3fr]">
      <Field id="code" label="Code" hint="A–Z, 0–9, - and _">
        <Input id="code" required maxLength={50} value={code} onChange={e => setCode(e.target.value.toUpperCase())} pattern="[A-Za-z0-9][A-Za-z0-9_\-]*" title="Letters, digits, - and _ only" placeholder="JEE-27-M1" autoComplete="off" className="font-mono uppercase" />
      </Field>
      <Field id="name" label="Name">
        <Input id="name" required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder="JEE 2027 Morning" autoComplete="off" />
      </Field>
    </div>

    <div className="grid grid-cols-2 gap-3 sm:gap-5">
      <Field id="startDate" label={<>Start <Optional /></>}>
        <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
      </Field>
      <Field id="endDate" label={<>End <Optional /></>}>
        <Input id="endDate" type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
      </Field>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="capacity" label={<>Capacity <Optional /></>} hint={batch ? `Empty for no limit. Cannot go below the ${batch.enrolled} enrolled.` : "Seats for pending + active students. Empty for no limit."}>
        <Input id="capacity" type="number" inputMode="numeric" min={Math.max(batch?.enrolled ?? 1, 1)} max={100000} step={1} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="No limit" />
      </Field>
      <Field id="status" label="Status" hint={BATCH_STATUS_HELP[status]}>
        <Select value={status} onValueChange={v => setStatus(v as BatchStatus)}>
          <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{BATCH_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </div>

    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy || (!batch && !pickers.data)}>{busy && <Loader2 className="animate-spin" />}{batch ? "Save changes" : "Create batch"}</Button>
    </DialogFooter>
  </form>;
}

/**
 * Deletes an unused batch. A batch with enrollments or content gets a 409 from the API;
 * the dialog then shows that message and offers to cancel or complete the batch instead.
 */
export function DeleteBatchDialog({ batch, open, onOpenChange, onDeleted, onUpdated }: {
  batch: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (batch: Batch) => void;
  onUpdated: (batch: Batch) => void;
}) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      {open && batch && <DeleteBatch batch={batch} onClose={() => onOpenChange(false)} onDeleted={onDeleted} onUpdated={onUpdated} />}
    </AlertDialogContent>
  </AlertDialog>;
}

function DeleteBatch({ batch, onClose, onDeleted, onUpdated }: { batch: Batch; onClose: () => void; onDeleted: (batch: Batch) => void; onUpdated: (batch: Batch) => void }) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState<"delete" | BatchStatus | null>(null);
  const [conflict, setConflict] = useState("");

  async function remove() {
    setBusy("delete");
    try {
      await withToken(token => batchesApi.remove(token, batch.id));
      toast.success(`Batch ${batch.code} deleted`);
      onClose();
      onDeleted(batch);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setConflict(e.message);
      else toast.error(errorText(e, "Could not delete the batch."));
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: BatchStatus) {
    setBusy(status);
    try {
      const updated = await withToken(token => batchesApi.update(token, batch.id, { status }));
      toast.success(`Batch ${batch.code} marked ${titleCase(status).toLowerCase()}`);
      onClose();
      onUpdated(updated);
    } catch (e) {
      toast.error(errorText(e, "Could not update the batch."));
    } finally {
      setBusy(null);
    }
  }

  return <>
    <AlertDialogHeader>
      <AlertDialogTitle>{conflict ? `${batch.code} cannot be deleted` : `Delete ${batch.code}?`}</AlertDialogTitle>
      <AlertDialogDescription>
        {conflict
          ? "This batch is in use (students, classes, assignments or other records), so its history must be kept. Cancel or complete it instead: it stops taking enrollments and disappears from the website."
          : `“${batch.name}” and its faculty assignments will be removed permanently. Only a batch with no enrollments or content can be deleted.`}
      </AlertDialogDescription>
    </AlertDialogHeader>
    {conflict && <ErrorAlert title="The server said" message={conflict} />}
    <AlertDialogFooter>
      <AlertDialogCancel disabled={!!busy}>{conflict ? "Close" : "Cancel"}</AlertDialogCancel>
      {conflict ? <>
        {batch.status !== "COMPLETED" && <Button variant="outline" disabled={!!busy} onClick={() => setStatus("COMPLETED")}>{busy === "COMPLETED" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}Mark completed</Button>}
        {batch.status !== "CANCELLED" && <Button disabled={!!busy} onClick={() => setStatus("CANCELLED")}>{busy === "CANCELLED" ? <Loader2 className="animate-spin" /> : <Ban />}Mark cancelled</Button>}
      </> : <Button disabled={!!busy} onClick={remove} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete batch</Button>}
    </AlertDialogFooter>
  </>;
}
