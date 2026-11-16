"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, ClipboardList, Copy, Download, ExternalLink, Loader2, Pencil, RotateCcw, Send, Trophy, Users,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ActionsHead, RowActions } from "@/components/portal/row-actions";
import { useAuth } from "@/lib/auth";
import { cn, plural } from "@/lib/utils";
import { downloadCsv, num } from "@/lib/teaching-api";
import { scholarshipsApi, type ScholarshipCandidate, type ScholarshipResults, type ScholarshipTest } from "@/lib/scholarships-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, Field, formatDate, Optional, UserAvatar } from "../ui";
import { ScholarshipDialog } from "./scholarship-dialog";
import { questionCount, ScholarshipStatusPill, testWindow } from "./scholarship-bits";

type Confirm = "open" | "publish" | null;

/** One Scholarship Test: setup steps, its candidates ranked by score, awards and publishing. */
export default function ScholarshipDetail({ id }: { id: number }) {
  const { withToken } = useAuth();
  const results = useAdminData(token => scholarshipsApi.results(token, id), `scholarship-results:${id}`);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [awarding, setAwarding] = useState<ScholarshipCandidate | null>(null);

  const back = <Link href="/admin/scholarships" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Scholarship tests</Link>;
  if (results.error && !results.data) return <>{back}<ErrorAlert title="Test not available" message={results.error} onRetry={results.reload} /></>;
  if (!results.data) return <>{back}<div className="grid gap-4"><Skeleton className="h-28 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div></>;

  const { test, candidates, took_test } = results.data;
  const questions = questionCount(test);
  const setTest = (t: ScholarshipTest) => results.setData(cur => cur ? { ...cur, test: { ...cur.test, ...t } } : cur);

  async function run(kind: Exclude<Confirm, null>) {
    setBusy(true);
    try {
      if (kind === "open") {
        setTest(await withToken(token => scholarshipsApi.open(token, id)));
        toast.success("Registration is open. The website's Scholarship Test button now takes registrations.");
      } else {
        results.setData(await withToken(token => scholarshipsApi.publish(token, id)));
        toast.success("Results published. Candidates have been notified.");
      }
      setConfirm(null);
    } catch (e) {
      toast.error(errorText(e, kind === "open" ? "Could not open registration." : "Could not publish the results."));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`);
      toast.success("Website link copied. Students register from its Scholarship Test button.");
    } catch {
      toast.error("Could not copy the link.");
    }
  }

  const primary = test.status === "DRAFT"
    ? questions === 0
      ? <Button asChild><Link href={`/admin/exams/${test.exam_id}`}><ClipboardList /> Build the paper</Link></Button>
      : <Button onClick={() => setConfirm("open")}><Send /> Open registration</Button>
    : test.status === "OPEN"
      ? <Button onClick={() => setConfirm("publish")}><Trophy /> Publish results</Button>
      : null;

  const ranked = candidates.filter(c => c.attempt);

  return <>
    {back}
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{test.title}</h1>
            <ScholarshipStatusPill status={test.status} />
          </div>
          {test.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{test.description}</p>}
          <p className="text-sm text-muted-foreground">{test.eligible_grades.length ? `For ${test.eligible_grades.join(", ")}` : "Open to any class"}
            {test.registration_closes_at ? ` · registration closes ${formatDate(test.registration_closes_at, true)}` : ""}
            {test.valid_until ? ` · awards valid until ${formatDate(test.valid_until)}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {primary}
          <RowActions label={test.title} className="border" items={[
            { label: "Edit details and slabs", icon: Pencil, onSelect: () => setEditOpen(true) },
            { label: "Open the test paper", icon: ExternalLink, href: `/admin/exams/${test.exam_id}` },
            { label: "Copy website link", icon: Copy, onSelect: () => void copyLink() },
          ]} />
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {[
        { label: "Test window", value: testWindow(test), small: true },
        { label: "Registered", value: String(test.candidates) },
        { label: "Took the test", value: String(took_test) },
        { label: "Questions", value: `${questions} · ${num(test.exams.total_marks)} marks` },
      ].map(s => <Card key={s.label} className="gap-1 py-4"><CardContent className="grid gap-1 px-4">
        <p className="text-xs text-muted-foreground">{s.label}</p>
        <p className={cn("font-semibold tabular-nums", s.small ? "text-sm" : "text-2xl")}>{s.value}</p>
      </CardContent></Card>)}
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="min-w-0">
        <CardHeader><CardTitle>Scholarship slabs</CardTitle><CardDescription>% off course fees by score.</CardDescription></CardHeader>
        <CardContent>
          <ul className="grid gap-2">
            {test.slabs.map(s => <li key={s.minPercentage} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>Score {s.minPercentage}% or more</span><strong className="text-primary">{s.discountPercent}% off</strong>
            </li>)}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Below the lowest slab: no scholarship.</p>
        </CardContent>
      </Card>
      <Card className="min-w-0 lg:col-span-2">
        <CardHeader><CardTitle>How this works</CardTitle></CardHeader>
        <CardContent>
          <ol className="grid gap-2 text-sm">
            {[
              { done: questions > 0, text: <>Build the paper: write questions under the <strong>Scholarship Tests</strong> course in the question bank (pictures, maths and CSV import work), then add them to <Link className="text-primary hover:underline" href={`/admin/exams/${test.exam_id}`}>the test</Link>.</> },
              { done: test.status !== "DRAFT", text: <>Open registration. The website&apos;s <strong>Scholarship Test</strong> button then shows the details and lets students sign up.</> },
              { done: test.candidates > 0, text: <>Students register and take the test in their <strong>student portal</strong> during the test window. Answers are marked automatically.</> },
              { done: took_test > 0, text: <>Review the ranked results below and change any student&apos;s award if needed.</> },
              { done: test.status === "RESULTS_PUBLISHED", text: <>Publish results. Students see their rank and award and get a notification.</> },
              { done: candidates.some(c => c.used), text: <>At admission, create the student&apos;s fee invoice: the scholarship is offered there and applied once as a discount.</> },
            ].map((step, i) => <li key={i} className="flex gap-3">
              <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", step.done && "border-emerald-500 bg-emerald-500 text-white")}>
                {step.done ? <CheckCircle2 className="size-4" /> : i + 1}
              </span>
              <span className={cn("pt-0.5", step.done && "text-muted-foreground")}>{step.text}</span>
            </li>)}
          </ol>
        </CardContent>
      </Card>
    </div>

    <ResultsCard data={results.data} onAward={setAwarding} />

    <ScholarshipDialog open={editOpen} onOpenChange={setEditOpen} test={test} onSaved={setTest} />
    <AwardDialog testId={id} candidate={awarding} published={test.status === "RESULTS_PUBLISHED"} onClose={() => setAwarding(null)} onSaved={r => results.setData(r)} />

    <AlertDialog open={!!confirm} onOpenChange={o => { if (!o && !busy) setConfirm(null); }}>
      <AlertDialogContent>
        {confirm && <>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "open" ? "Open registration?" : "Publish results?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === "open"
              ? `The paper (${questions} questions) is published and the website starts taking registrations. Students can take it ${testWindow(test)}.`
              : `${plural(ranked.length, "student")} took the test. Their awards are saved as shown, results become visible in their portal, and each is notified. Awards can still be adjusted afterwards until they are used on an invoice.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void run(confirm); }}>
              {busy && <Loader2 className="animate-spin" />}{confirm === "open" ? "Open registration" : "Publish results"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </>}
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function awardLabel(c: ScholarshipCandidate) {
  return c.discount_percent > 0 ? `${c.discount_percent}% off` : "No scholarship";
}

function ResultsCard({ data, onAward }: { data: ScholarshipResults; onAward: (c: ScholarshipCandidate) => void }) {
  const { test, candidates } = data;
  const exportCsv = () => downloadCsv(`scholarship-${test.id}-results.csv`, [
    ["Rank", "Student", "Mobile", "Email", "Class", "School", "Score", "Out of", "Percentage", "Slab award %", "Award %", "Overridden", "Note", "Used on invoice"],
    ...candidates.map(c => [
      c.rank ?? "", c.student.full_name, c.student.mobile, c.student.email, c.grade, c.school_name,
      c.attempt ? num(c.attempt.score) : "Did not take the test", c.attempt ? num(c.attempt.max_score) : "", c.attempt ? num(c.attempt.percentage) : "",
      c.suggested_discount, c.discount_percent, c.is_override ? "Yes" : "", c.note, c.used ? "Yes" : "",
    ]),
  ]);
  const actions = (c: ScholarshipCandidate) => [
    { label: "Change award", icon: Pencil, onSelect: () => onAward(c), disabled: c.used, hint: c.used ? "Already used on a fee invoice" : undefined },
    c.attempt && { label: "See answers on the test", icon: ExternalLink, href: `/admin/exams/${test.exam_id}`, hint: "Results tab → View answers" },
  ];

  return <Card className="min-w-0 gap-0 py-0">
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <CardTitle>Candidates and results</CardTitle>
      <CardDescription>Ranked by score (best attempt; earlier submission wins a tie). The award follows the slabs unless you change it.</CardDescription>
      <CardAction><Button variant="outline" size="sm" disabled={!candidates.length} onClick={exportCsv}><Download /> CSV</Button></CardAction>
    </CardHeader>
    <CardContent className="p-0">
      {candidates.length === 0 && <EmptyState icon={Users} title="No candidates yet" description={test.status === "DRAFT" ? "Open registration so students can sign up from the website." : "Students who register from the website appear here."} />}
      {candidates.length > 0 && <>
        <Table className="hidden @2xl/main:table">
          <TableHeader><TableRow className="hover:bg-transparent">
            <TableHead className="w-14 pl-4">Rank</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="hidden @3xl/main:table-cell">Class</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="hidden @4xl/main:table-cell">Slab</TableHead>
            <TableHead>Award</TableHead>
            <ActionsHead />
          </TableRow></TableHeader>
          <TableBody>
            {candidates.map(c => <TableRow key={c.student.id} className={cn(!c.attempt && "text-muted-foreground")}>
              <TableCell className="pl-4 font-semibold tabular-nums">{c.rank ?? "—"}</TableCell>
              <TableCell className="max-w-[16rem]">
                <span className="flex items-center gap-2">
                  <UserAvatar name={c.student.full_name} src={c.student.photo_url} className="size-7" />
                  <span className="min-w-0"><span className="block truncate font-medium text-foreground">{c.student.full_name}</span><span className="block truncate text-xs text-muted-foreground">{c.student.mobile ?? c.student.email}</span></span>
                </span>
              </TableCell>
              <TableCell className="hidden @3xl/main:table-cell">{c.grade ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{c.attempt ? <>{num(c.attempt.score)}<span className="text-xs text-muted-foreground"> / {num(c.attempt.max_score)} ({num(c.attempt.percentage)}%)</span></> : <span className="text-xs">Did not take the test</span>}</TableCell>
              <TableCell className="hidden text-muted-foreground @4xl/main:table-cell">{c.attempt ? (c.suggested_discount ? `${c.suggested_discount}%` : "—") : ""}</TableCell>
              <TableCell><AwardCell c={c} /></TableCell>
              <TableCell className="pr-4 text-right"><RowActions label={c.student.full_name} items={actions(c)} /></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
        <ul className="divide-y @2xl/main:hidden">
          {candidates.map(c => <li key={c.student.id} className="grid gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-6 shrink-0 text-center font-semibold tabular-nums">{c.rank ?? "—"}</span>
                <UserAvatar name={c.student.full_name} src={c.student.photo_url} className="size-7" />
                <span className="min-w-0"><span className="block truncate font-medium">{c.student.full_name}</span><span className="block truncate text-xs text-muted-foreground">{[c.grade, c.student.mobile].filter(Boolean).join(" · ")}</span></span>
              </span>
              <RowActions label={c.student.full_name} items={actions(c)} />
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-8 text-sm">
              <span className="tabular-nums text-muted-foreground">{c.attempt ? `${num(c.attempt.score)} / ${num(c.attempt.max_score)} (${num(c.attempt.percentage)}%)` : "Did not take the test"}</span>
              <AwardCell c={c} />
            </div>
          </li>)}
        </ul>
      </>}
    </CardContent>
  </Card>;
}

function AwardCell({ c }: { c: ScholarshipCandidate }) {
  if (!c.attempt && !c.is_override) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className="inline-flex flex-wrap items-center gap-1.5">
    <span className={cn("font-medium", c.discount_percent > 0 ? "text-primary" : "text-muted-foreground")}>{awardLabel(c)}</span>
    {c.is_override && <Badge variant="outline" className="text-[10px]" title={c.note ?? undefined}>Changed</Badge>}
    {c.used && <Badge variant="secondary" className="text-[10px]">Used on invoice</Badge>}
    {c.note && <span className="w-full truncate text-xs text-muted-foreground">{c.note}</span>}
  </span>;
}

/** Set a candidate's award by hand, or reset it to the slab. */
function AwardDialog({ testId, candidate, published, onClose, onSaved }: {
  testId: number; candidate: ScholarshipCandidate | null; published: boolean; onClose: () => void; onSaved: (r: ScholarshipResults) => void;
}) {
  return <Dialog open={!!candidate} onOpenChange={o => { if (!o) onClose(); }}>
    <DialogContent className="sm:max-w-md">
      {candidate && <AwardForm key={candidate.student.id} testId={testId} c={candidate} published={published} onClose={onClose} onSaved={onSaved} />}
    </DialogContent>
  </Dialog>;
}

function AwardForm({ testId, c, published, onClose, onSaved }: {
  testId: number; c: ScholarshipCandidate; published: boolean; onClose: () => void; onSaved: (r: ScholarshipResults) => void;
}) {
  const { withToken } = useAuth();
  const [pct, setPct] = useState(String(c.discount_percent));
  const [note, setNote] = useState(c.note ?? "");
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  const [error, setError] = useState("");

  async function save(reset: boolean) {
    const value = Number(pct);
    if (!reset && (!Number.isFinite(value) || value < 0 || value > 100)) return setError("Enter a % between 0 and 100.");
    setBusy(reset ? "reset" : "save");
    setError("");
    try {
      onSaved(await withToken(token => scholarshipsApi.override(token, testId, c.student.id, reset ? null : value, note.trim() || undefined)));
      toast.success(reset ? "Award reset to the slab" : "Award saved");
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the award."));
    } finally {
      setBusy(null);
    }
  }

  return <form onSubmit={e => { e.preventDefault(); void save(false); }} className="grid gap-4">
    <DialogHeader>
      <DialogTitle>Award for {c.student.full_name}</DialogTitle>
      <DialogDescription>{c.attempt ? `Scored ${num(c.attempt.percentage)}%. The slab gives ${c.suggested_discount}% off.` : "Did not take the test."}{published ? " Results are published: the student sees the change straight away." : ""}</DialogDescription>
    </DialogHeader>
    <Field id="aw-pct" label="% off course fees"><Input id="aw-pct" inputMode="decimal" value={pct} onChange={e => setPct(e.target.value)} /></Field>
    <Field id="aw-note" label={<>Reason <Optional /></>}><Textarea id="aw-note" maxLength={500} rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Strong interview; sibling already studying here" /></Field>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter className="gap-2">
      {c.is_override && <Button type="button" variant="ghost" disabled={!!busy} onClick={() => void save(true)}>{busy === "reset" ? <Loader2 className="animate-spin" /> : <RotateCcw />}Reset to slab</Button>}
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={!!busy}>{busy === "save" && <Loader2 className="animate-spin" />}Save award</Button>
    </DialogFooter>
  </form>;
}
