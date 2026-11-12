"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ClipboardList, Eye, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, PageHeader, Pill, titleCase } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { usePortal } from "@/components/portal/portal-shell";
import { batchLabel, useStaffBatches, type StaffBatch } from "@/components/staff/use-staff";
import { ASSIGNMENT_STATUSES, assignmentsApi, type Assignment, type AssignmentStatus } from "@/lib/staff-learning-api";
import { AssignmentFormDialog, DeleteAssignmentDialog } from "./assignment-dialogs";

const ALL = "all";
export const ASSIGNMENT_TONES = { DRAFT: "gray", PUBLISHED: "green", CLOSED: "blue" } as const;

/** True when a published assignment's due time has passed. */
export const isOverdue = (a: Pick<Assignment, "status" | "due_at">) => a.status === "PUBLISHED" && !!a.due_at && new Date(a.due_at) < new Date();

/** Assignments of one batch (the API lists per batch). Used in the admin and faculty portals. */
export default function AssignmentsList() {
  const params = useSearchParams();
  const staff = useStaffBatches();
  const [pickedBatch, setPickedBatch] = useState<number | null>(() => Number(params.get("batch")) || null);
  const [status, setStatus] = useState<AssignmentStatus | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | undefined>();
  const [deleting, setDeleting] = useState<Assignment | null>(null);

  const batch = staff.batches.find(b => b.id === pickedBatch) ?? staff.open[0] ?? staff.batches[0];
  const batchId = batch?.id;
  const { data, error, loading, reload, setData } = useAdminData(
    token => batchId ? assignmentsApi.list(token, batchId) : Promise.resolve([] as Assignment[]),
    `assignments:${batchId}`,
  );
  const rows = (data ?? []).filter(a => !status || a.status === status);

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const actions: RowActions = {
    edit: a => { setEditing(a); setFormOpen(true); },
    remove: a => setDeleting(a),
  };
  // Edits keep the batch, so the edit form needs it even when the batch is no longer open.
  const formBatches = editing ? staff.batches : staff.open;

  return <>
    <PageHeader title="Assignments" description="Homework and worksheets for your batches, with submissions and marks."
      actions={<Button onClick={openCreate} disabled={!staff.open.length}><Plus /> New assignment</Button>} />

    <Card className="gap-0 py-0">
      <div className="grid gap-3 border-b p-4 sm:flex sm:items-center">
        <Select value={batchId ? String(batchId) : ""} onValueChange={v => setPickedBatch(Number(v))} disabled={!staff.batches.length}>
          <SelectTrigger className="w-full sm:w-80" aria-label="Batch"><SelectValue placeholder={staff.loading ? "Loading batches…" : "No batches"} /></SelectTrigger>
          <SelectContent>{staff.batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}{b.status === "ACTIVE" || b.status === "PLANNED" ? "" : ` · ${titleCase(b.status)}`}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status ?? ALL} onValueChange={v => setStatus(v === ALL ? undefined : v as AssignmentStatus)}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ASSIGNMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <CardContent className="p-0">
        {(staff.error || error) && <div className="p-4"><ErrorAlert message={staff.error || error} onRetry={staff.error ? staff.reload : reload} /></div>}
        {(staff.loading && !staff.data) || (batchId && !data && loading) ? <LoadingRows /> : null}
        {!staff.loading && !staff.error && !batch && <EmptyState icon={ClipboardList} title="No batches yet" description="Assignments belong to a batch. You will see batches here once you are assigned to one." />}
        {batch && data && rows.length === 0 && <EmptyState icon={ClipboardList}
          title={status ? `No ${titleCase(status).toLowerCase()} assignments` : "No assignments for this batch yet"}
          description={status ? "Try another status." : "Create one and publish it when it is ready for students."}
          action={!status && staff.open.some(b => b.id === batch.id) ? <Button onClick={openCreate}><Plus /> New assignment</Button> : undefined} />}
        {batch && rows.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <AssignmentsTable rows={rows} batch={batch} actions={actions} />
          <AssignmentsCards rows={rows} batch={batch} actions={actions} />
        </div>}
      </CardContent>
    </Card>

    <AssignmentFormDialog open={formOpen} onOpenChange={setFormOpen} assignment={editing} batches={formBatches} defaultBatchId={batchId}
      onSaved={saved => { if (saved.batch_id !== batchId) setPickedBatch(saved.batch_id); reload(); }} />
    <DeleteAssignmentDialog assignment={deleting} open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}
      onDeleted={reload} onClosed={saved => setData(list => list?.map(a => a.id === saved.id ? { ...a, ...saved } : a) ?? null)} />
  </>;
}

type RowActions = { edit: (a: Assignment) => void; remove: (a: Assignment) => void };

function DueText({ a }: { a: Assignment }) {
  if (!a.due_at) return <span className="text-muted-foreground">No due date</span>;
  return <span className={isOverdue(a) ? "text-amber-700 dark:text-amber-300" : undefined}>{formatDate(a.due_at, true)}</span>;
}

function submissionsText(a: Assignment, batch: StaffBatch) {
  const n = a._count?.assignment_submissions;
  return n === undefined ? "—" : `${n} / ${batch.enrolled}`;
}

function Actions({ a, actions, labels = false }: { a: Assignment; actions: RowActions; labels?: boolean }) {
  const { base } = usePortal();
  const items = [
    { label: "View", icon: Eye, href: `${base}/assignments/${a.id}` },
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(a) },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(a), destructive: true },
  ];
  return <div className={labels ? "grid grid-cols-3 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, href, onClick, destructive }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = href
        ? <Button asChild variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"}><Link href={href} aria-label={`${label} ${a.title}`}><Icon />{labels && label}</Link></Button>
        : <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} aria-label={`${label} ${a.title}`}><Icon />{labels && label}</Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      return <Tooltip key={label}><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
    })}
  </div>;
}

function AssignmentsTable({ rows, batch, actions }: { rows: Assignment[]; batch: StaffBatch; actions: RowActions }) {
  const { base } = usePortal();
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Assignment</TableHead>
        <TableHead className="hidden lg:table-cell">Subject</TableHead>
        <TableHead>Due</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden lg:table-cell">Max marks</TableHead>
        <TableHead>Submitted</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(a => <TableRow key={a.id}>
        <TableCell className="pl-4">
          <Link href={`${base}/assignments/${a.id}`} className="flex max-w-[20rem] items-center gap-1.5 font-medium hover:underline">
            <span className="truncate">{a.title}</span>{a.file_assets && <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-label="Has attachment" />}
          </Link>
          <p className="text-xs text-muted-foreground lg:hidden">{a.subjects?.name ?? "No subject"}</p>
        </TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{a.subjects?.name ?? "—"}</TableCell>
        <TableCell className="whitespace-nowrap"><DueText a={a} /></TableCell>
        <TableCell><Pill value={a.status} tones={ASSIGNMENT_TONES} /></TableCell>
        <TableCell className="hidden tabular-nums lg:table-cell">{a.max_marks === null ? "—" : Number(a.max_marks)}</TableCell>
        <TableCell className="tabular-nums">{submissionsText(a, batch)}</TableCell>
        <TableCell className="pr-4"><Actions a={a} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function AssignmentsCards({ rows, batch, actions }: { rows: Assignment[]; batch: StaffBatch; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {rows.map(a => <li key={a.id} className="grid gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium break-words">{a.title}</p>
          <p className="text-xs text-muted-foreground">{a.subjects?.name ?? "No subject"}{a.max_marks !== null && ` · ${Number(a.max_marks)} marks`}</p>
        </div>
        <Pill value={a.status} tones={ASSIGNMENT_TONES} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <span>Due <DueText a={a} /></span>
        <span className="text-muted-foreground">{submissionsText(a, batch)} submitted</span>
      </div>
      <Actions a={a} actions={actions} labels />
    </li>)}
  </ul>;
}
