"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lock, Loader2, Pencil, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { studentApi, type AssignmentDetail, type MySubmission } from "@/lib/student-api";
import type { FileAsset } from "@/lib/staff-learning-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, errorText, Field, formatDate, Optional } from "@/components/admin/ui";
import { FileLink, FileUploadField } from "@/components/staff/materials/files";
import { dueHint, marksText, StatePill, submissionState } from "./assignment-bits";

const MAX_TEXT = 50_000;

function useNow(stepMs = 60_000) {
  return useSyncExternalStore(
    onChange => { const timer = setInterval(onChange, stepMs); return () => clearInterval(timer); },
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => 0,
  );
}

/** GET /assignments/:id/submission answers 404 until something is handed in. */
async function loadSubmission(token: string, id: number): Promise<MySubmission | null> {
  try {
    return await studentApi.mySubmission(token, id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export default function StudentAssignmentDetail({ id }: { id: number }) {
  const assignment = useAdminData(token => studentApi.assignment(token, id), `assignment:${id}`);
  const submission = useAdminData(token => loadSubmission(token, id), `submission:${id}`);
  const now = useNow();

  const back = <Link href="/student/assignments" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Assignments</Link>;
  if (assignment.error) return <>{back}<ErrorAlert title="Assignment not available" message={assignment.error} onRetry={assignment.reload} /></>;
  if (!assignment.data) return <>{back}<div className="grid gap-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-56 rounded-xl" /></div></>;

  const a = assignment.data;
  const sub = submission.data;
  const subReady = !submission.loading || !!sub;
  const state = subReady && !submission.error ? submissionState(sub, a.due_at, now) : null;
  const hint = !sub && a.status === "PUBLISHED" ? dueHint(a.due_at, now) : null;

  return <>
    {back}
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {state && <StatePill state={state} />}
          {a.status === "CLOSED" && <Badge variant="outline">Closed</Badge>}
        </div>
        <CardTitle className="text-2xl tracking-tight">{a.title}</CardTitle>
        <CardDescription>{[a.subjects?.name, a.users && `Set by ${a.users.full_name}`].filter(Boolean).join(" · ") || "Assignment"}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Due</dt><dd className="font-medium">{a.due_at ? formatDate(a.due_at, true) : "No due date"}</dd>
            {hint && <dd className={cn("text-xs font-medium", hint.overdue ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>{hint.text}</dd>}</div>
          <div><dt className="text-xs text-muted-foreground">Marks</dt><dd className="font-medium">{a.max_marks ? `Out of ${Number(a.max_marks)}` : "Not graded"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Posted</dt><dd className="font-medium">{formatDate(a.created_at)}</dd></div>
        </dl>
        <section className="grid gap-2">
          <h2 className="text-sm font-medium">Instructions</h2>
          {a.instructions
            ? <p className="rounded-md border bg-muted/40 p-3 text-sm break-words whitespace-pre-wrap">{a.instructions}</p>
            : <p className="text-sm text-muted-foreground">No written instructions{a.file_assets ? "; see the attached file." : "."}</p>}
        </section>
        {a.file_assets && <section className="grid gap-1">
          <h2 className="text-sm font-medium">Attachment</h2>
          <FileLink file={a.file_assets} />
        </section>}
      </CardContent>
    </Card>

    {submission.error
      ? <ErrorAlert message={submission.error} onRetry={submission.reload} />
      : !subReady ? <Skeleton className="h-48 rounded-xl" />
      : <SubmissionCard assignment={a} submission={sub} now={now} onSaved={submission.setData} />}
  </>;
}

function SubmissionCard({ assignment: a, submission, now, onSaved }: { assignment: AssignmentDetail; submission: MySubmission | null; now: number; onSaved: (s: MySubmission) => void }) {
  const [editing, setEditing] = useState(false);
  const reviewed = !!submission?.reviewed_at;
  const closed = a.status === "CLOSED";

  if (reviewed || closed || (submission && !editing)) {
    return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{reviewed ? <><CheckCircle2 className="size-5 text-emerald-600" /> Reviewed</> : submission ? "Your submission" : "Not submitted"}</CardTitle>
        <CardDescription>
          {reviewed ? "Your teacher has marked this. It can no longer be changed."
            : closed ? "This assignment is closed for submissions."
            : "You can still change your answer until your teacher reviews it."}
        </CardDescription>
        {submission && !reviewed && !closed && <CardAction><Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> Edit</Button></CardAction>}
      </CardHeader>
      <CardContent className="grid gap-4">
        {reviewed && <div className="grid gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-sm text-muted-foreground">Marks</p>
          <p className="text-3xl font-semibold tabular-nums">{marksText(submission!.marks_awarded, a.max_marks) ?? "Not graded"}</p>
          {submission!.feedback && <div className="grid gap-1">
            <p className="text-sm font-medium">Feedback{submission!.users ? ` from ${submission!.users.full_name}` : ""}</p>
            <p className="text-sm break-words whitespace-pre-wrap">{submission!.feedback}</p>
          </div>}
        </div>}
        {submission
          ? <SubmittedAnswer submission={submission} />
          : <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="size-4" /> You did not hand anything in.</p>}
      </CardContent>
    </Card>;
  }

  return <SubmissionForm assignment={a} submission={submission} now={now} onSaved={s => { onSaved(s); setEditing(false); }} onCancel={submission ? () => setEditing(false) : undefined} />;
}

function SubmittedAnswer({ submission: s }: { submission: MySubmission }) {
  return <div className="grid gap-3">
    <p className="text-sm text-muted-foreground">
      Handed in {formatDate(s.submitted_at, true)}
      {s.is_late && <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-700 dark:text-amber-400">Late</Badge>}
    </p>
    {s.response_text && <p className="rounded-md border bg-muted/40 p-3 text-sm break-words whitespace-pre-wrap">{s.response_text}</p>}
    {s.file_assets && <FileLink file={s.file_assets} />}
  </div>;
}

function SubmissionForm({ assignment: a, submission, now, onSaved, onCancel }: {
  assignment: AssignmentDetail;
  submission: MySubmission | null;
  now: number;
  onSaved: (s: MySubmission) => void;
  onCancel?: () => void;
}) {
  const { withToken } = useAuth();
  const [text, setText] = useState(submission?.response_text ?? "");
  // Keep the existing file unless the student removes or replaces it; it is sent again on resubmit.
  const [file, setFile] = useState<FileAsset | null>(submission?.file_assets ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const overdue = !!a.due_at && !!now && new Date(a.due_at).getTime() < now;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !file) return setError("Write an answer or attach a file.");
    setSaving(true);
    setError("");
    try {
      const saved = await withToken(token => studentApi.submit(token, a.id, {
        responseText: text.trim() ? text : undefined,
        assetId: file?.id,
      }));
      onSaved(saved);
      toast.success(saved.is_late ? "Handed in (late)" : "Handed in");
    } catch (e) {
      setError(errorText(e, "Could not hand in your work."));
    } finally {
      setSaving(false);
    }
  }

  return <Card>
    <CardHeader>
      <CardTitle>{submission ? "Change your submission" : "Hand in your work"}</CardTitle>
      <CardDescription>
        {submission ? "Handing in again replaces your previous answer completely, both the text and the file. " : "Type your answer, attach a file (a photo or PDF of your work), or both. "}
        {overdue && "The due date has passed: late work is still accepted but marked late."}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={submit} className="grid gap-5">
        <Field id="sub-text" label={<>Your answer <Optional /></>} hint={`${text.length.toLocaleString("en-IN")} / 50,000 characters`}>
          <Textarea id="sub-text" rows={8} maxLength={MAX_TEXT} value={text} onChange={e => { setText(e.target.value); setError(""); }} className="max-h-[60svh]" />
        </Field>
        <Field id="sub-file" label={<>File <Optional /></>}>
          <FileUploadField id="sub-file" value={file} onChange={f => { setFile(f); setError(""); }} onBusyChange={setUploading} />
        </Field>
        {error && <ErrorAlert title="Not handed in" message={error} />}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || uploading}>{saving ? <Loader2 className="animate-spin" /> : <Send />}{submission ? "Hand in again" : "Hand in"}</Button>
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>}
        </div>
      </form>
    </CardContent>
  </Card>;
}
