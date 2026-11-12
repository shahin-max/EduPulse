"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Inbox, Pencil, Phone, Trash2, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, PageHeader, Pill, UserAvatar } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { usePortal } from "@/components/portal/portal-shell";
import { batchLabel, useStaffBatches } from "@/components/staff/use-staff";
import { assignmentsApi, type Assignment, type RosterEntry, type Submission } from "@/lib/staff-learning-api";
import { FileLink } from "@/components/staff/materials/files";
import { AssignmentFormDialog, DeleteAssignmentDialog, ReviewDialog } from "./assignment-dialogs";
import { ASSIGNMENT_TONES, isOverdue } from "./assignments-list";

/** One assignment with its submissions and the students who have not submitted. Admin and faculty portals. */
export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assignmentId = Number(id);
  const { base } = usePortal();
  const router = useRouter();
  const staff = useStaffBatches();
  const { data: assignment, error, loading, reload, setData } = useAdminData(token => assignmentsApi.get(token, assignmentId), `assignment:${assignmentId}`);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const back = <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit"><Link href={`${base}/assignments${assignment ? `?batch=${assignment.batch_id}` : ""}`}><ArrowLeft /> Assignments</Link></Button>;

  if (!Number.isInteger(assignmentId) || assignmentId < 1) return <>{back}<ErrorAlert title="Not found" message="This assignment link is not valid." /></>;
  if (error && !assignment) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!assignment) return <>{back}<Card className="py-0">{loading && <LoadingRows rows={4} />}</Card></>;

  const batch = staff.batches.find(b => b.id === assignment.batch_id);
  const merge = (saved: Assignment) => setData(prev => prev ? { ...prev, ...saved } : saved);

  return <>
    {back}
    <PageHeader title={assignment.title}
      description={[batch ? batchLabel(batch) : `Batch #${assignment.batch_id}`, assignment.subjects?.name].filter(Boolean).join(" · ")}
      actions={<>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
        <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 /> Delete</Button>
      </>} />

    <Card>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><Pill value={assignment.status} tones={ASSIGNMENT_TONES} /></dd></div>
          <div><dt className="text-muted-foreground">Due</dt><dd className={isOverdue(assignment) ? "mt-1 text-amber-700 dark:text-amber-300" : "mt-1"}>{assignment.due_at ? formatDate(assignment.due_at, true) : "No due date"}</dd></div>
          <div><dt className="text-muted-foreground">Max marks</dt><dd className="mt-1 tabular-nums">{assignment.max_marks === null ? "Ungraded" : Number(assignment.max_marks)}</dd></div>
          <div><dt className="text-muted-foreground">Created by</dt><dd className="mt-1 truncate">{assignment.users?.full_name ?? "—"}</dd></div>
        </dl>
        {assignment.instructions && <div>
          <p className="text-sm text-muted-foreground">Instructions</p>
          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{assignment.instructions}</p>
        </div>}
        {assignment.file_assets && <div>
          <p className="text-sm text-muted-foreground">Attachment</p>
          <FileLink file={assignment.file_assets} className="mt-1" />
        </div>}
      </CardContent>
    </Card>

    <Submissions assignment={assignment} />

    <AssignmentFormDialog open={editOpen} onOpenChange={setEditOpen} assignment={assignment} batches={staff.batches} onSaved={merge} />
    <DeleteAssignmentDialog assignment={assignment} open={deleteOpen} onOpenChange={setDeleteOpen}
      onDeleted={() => router.push(`${base}/assignments?batch=${assignment.batch_id}`)} onClosed={merge} />
  </>;
}

function Submissions({ assignment }: { assignment: Assignment }) {
  const subs = useAdminData(token => assignmentsApi.submissions(token, assignment.id), `submissions:${assignment.id}`);
  const roster = useAdminData(token => assignmentsApi.roster(token, assignment.batch_id), `roster:${assignment.batch_id}`);
  const [reviewing, setReviewing] = useState<Submission | null>(null);

  const submissions = subs.data ?? [];
  const submitted = new Set(submissions.map(s => s.enrollment_id));
  const missing = (roster.data ?? []).filter(e => e.status === "ACTIVE" && !submitted.has(e.id));
  const reviewed = submissions.filter(s => s.reviewed_at).length;
  const late = submissions.filter(s => s.is_late).length;

  return <>
    <Card className="gap-0 py-0">
      <CardHeader className="border-b p-4 [.border-b]:pb-4">
        <CardTitle>Submissions</CardTitle>
        <CardDescription>
          {subs.data ? `${submissions.length} submitted · ${reviewed} reviewed${late ? ` · ${late} late` : ""}` : "Loading…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {subs.error && <div className="p-4"><ErrorAlert message={subs.error} onRetry={subs.reload} /></div>}
        {!subs.data && subs.loading && <LoadingRows rows={3} />}
        {subs.data && submissions.length === 0 && <EmptyState icon={Inbox} title="No submissions yet"
          description={assignment.status === "DRAFT" ? "This assignment is a draft, so students cannot see it. Publish it from Edit." : "Submissions appear here as students send them."} />}
        {submissions.length > 0 && <ul className="divide-y">
          {submissions.map(s => <SubmissionItem key={s.id} s={s} maxMarks={assignment.max_marks} onReview={() => setReviewing(s)} />)}
        </ul>}
      </CardContent>
    </Card>

    <Card className="gap-0 py-0">
      <CardHeader className="border-b p-4 [.border-b]:pb-4">
        <CardTitle>Not submitted</CardTitle>
        <CardDescription>{roster.data ? `${missing.length} of ${roster.data.filter(e => e.status === "ACTIVE").length} active students` : "Loading…"}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {roster.error && <div className="p-4"><ErrorAlert message={roster.error} onRetry={roster.reload} /></div>}
        {!roster.data && roster.loading && <LoadingRows rows={3} />}
        {roster.data && subs.data && missing.length === 0 && <EmptyState icon={CheckCircle2} title="Everyone has submitted" />}
        {subs.data && missing.length > 0 && <ul className="divide-y">{missing.map(e => <MissingItem key={e.id} e={e} />)}</ul>}
      </CardContent>
    </Card>

    <ReviewDialog submission={reviewing} maxMarks={assignment.max_marks} open={!!reviewing} onOpenChange={open => { if (!open) setReviewing(null); }}
      onSaved={saved => subs.setData(list => list?.map(x => x.id === saved.id ? saved : x) ?? null)} />
  </>;
}

function SubmissionItem({ s, maxMarks, onReview }: { s: Submission; maxMarks: string | null; onReview: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const name = s.enrollments.student_profiles.users.full_name;
  const text = s.response_text ?? "";
  const long = text.length > 280 || text.split("\n").length > 4;
  return <li className="grid gap-3 p-4">
    <div className="flex items-start gap-3">
      <UserAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {s.enrollments.student_profiles.admission_number && <span className="font-mono">{s.enrollments.student_profiles.admission_number} · </span>}
          Submitted {formatDate(s.submitted_at, true)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {s.is_late && <Pill value="LATE" tones={{ LATE: "amber" }} />}
        {s.reviewed_at
          ? <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300">{s.marks_awarded !== null ? `${Number(s.marks_awarded)}${maxMarks !== null ? ` / ${Number(maxMarks)}` : ""}` : "Reviewed"}</Badge>
          : <Pill value="PENDING" tones={{ PENDING: "gray" }} label="To review" />}
      </div>
    </div>

    {text && <div className="rounded-md bg-muted/50 p-3 text-sm">
      <p className={long && !expanded ? "line-clamp-4 break-words whitespace-pre-wrap" : "break-words whitespace-pre-wrap"}>{text}</p>
      {long && <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setExpanded(v => !v)}>{expanded ? "Show less" : "Show all"}</Button>}
    </div>}
    {s.file_assets && <FileLink file={s.file_assets} className="text-sm" />}

    {s.reviewed_at && s.feedback && <div className="text-sm">
      <p className="text-xs text-muted-foreground">Feedback{s.users ? ` from ${s.users.full_name}` : ""}, {formatDate(s.reviewed_at)}</p>
      <p className="mt-0.5 break-words whitespace-pre-wrap">{s.feedback}</p>
    </div>}

    <div><Button size="sm" variant={s.reviewed_at ? "outline" : "default"} onClick={onReview}>{s.reviewed_at ? "Edit review" : "Review"}</Button></div>
  </li>;
}

function MissingItem({ e }: { e: RosterEntry }) {
  const p = e.student_profiles;
  const mobile = p.users.mobile ?? p.guardian_mobile;
  return <li className="flex items-center gap-3 p-4">
    <UserAvatar name={p.users.full_name} />
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium">{p.users.full_name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {[p.admission_number, p.guardian_name && `Guardian: ${p.guardian_name}`].filter(Boolean).join(" · ") || "—"}
      </p>
    </div>
    {mobile
      ? <Button asChild size="sm" variant="outline"><a href={`tel:${mobile}`} aria-label={`Call ${p.users.full_name}`}><Phone /><span className="hidden sm:inline">{mobile}</span></a></Button>
      : <UserX className="size-4 text-muted-foreground" aria-label="No phone number" />}
  </li>;
}

