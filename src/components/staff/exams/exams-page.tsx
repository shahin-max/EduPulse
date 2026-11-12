"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ClipboardList, FileQuestion, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXAM_STATUSES, examsApi, type Exam, type ExamStatus } from "@/lib/staff-exams-api";
import { EmptyState, ErrorAlert, LoadingRows, PageHeader, Pager, titleCase } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { usePortal } from "@/components/portal/portal-shell";
import { batchLabel, useStaffBatches } from "@/components/staff/use-staff";
import { ALL, ExamStatusPill, formatDateTime, formatMarks, KIND_LABEL, SegmentedTabs, useCourses } from "./exam-shared";
import { CreateExamDialog } from "./exam-form";
import { QuestionBank } from "./question-bank";

type Tab = "exams" | "questions";

/** Exams and Question bank (`?tab=questions`), shared by the admin and faculty portals. */
export default function ExamsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = params.get("tab") === "questions" ? "questions" : "exams";
  const setTab = (next: Tab) => router.replace(next === "questions" ? `${pathname}?tab=questions` : pathname, { scroll: false });
  const [creating, setCreating] = useState(false);

  return <>
    <PageHeader title={tab === "questions" ? "Question bank" : "Exams"}
      description={tab === "questions" ? "Single-choice questions by course, subject and chapter, ready to pick into exams." : "Practice tests, chapter tests and mock tests with results and rank lists."}
      actions={tab === "exams" && <Button onClick={() => setCreating(true)}><Plus /> New exam</Button>} />
    <SegmentedTabs label="Exams sections" value={tab} onChange={setTab} tabs={[
      { value: "exams", label: <><ClipboardList className="size-4" /> Exams</> },
      { value: "questions", label: <><FileQuestion className="size-4" /> Question bank</> },
    ]} />
    {tab === "exams" ? <ExamsList onCreate={() => setCreating(true)} /> : <QuestionBank />}
    {creating && <CreateExamDialog onOpenChange={setCreating} />}
  </>;
}

function ExamsList({ onCreate }: { onCreate: () => void }) {
  const { base } = usePortal();
  const { courses } = useCourses();
  const { batches } = useStaffBatches();
  const [courseId, setCourseId] = useState<number | undefined>();
  const [batchId, setBatchId] = useState<number | undefined>();
  const [status, setStatus] = useState<ExamStatus | undefined>();
  const [page, setPage] = useState(1);
  const query = { courseId, batchId, status, page, limit: 20 };
  const { data, error, loading, reload } = useAdminData(token => examsApi.list(token, query), JSON.stringify(query));
  const filtered = !!(courseId || batchId || status);
  const batchOptions = courseId ? batches.filter(b => b.courses.id === courseId) : batches;

  return <Card className="gap-0 py-0">
    <div className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-3">
      <Select value={courseId ? String(courseId) : ALL} onValueChange={v => { setCourseId(v === ALL ? undefined : Number(v)); setBatchId(undefined); setPage(1); }}>
        <SelectTrigger className="w-full" aria-label="Filter by course"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All courses</SelectItem>
          {courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={batchId ? String(batchId) : ALL} onValueChange={v => { setBatchId(v === ALL ? undefined : Number(v)); setPage(1); }}>
        <SelectTrigger className="w-full" aria-label="Filter by batch"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All batches</SelectItem>
          {batchOptions.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as ExamStatus); setPage(1); }}>
        <SelectTrigger className="col-span-2 w-full sm:col-span-1" aria-label="Filter by status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {EXAM_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>

    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows />}
      {data && data.data.length === 0 && <EmptyState icon={ClipboardList}
        title={filtered ? "No exams match these filters" : "No exams yet"}
        description={filtered ? "Try different filters." : "Create an exam, add questions from the bank and assign batches."}
        action={!filtered && <Button onClick={onCreate}><Plus /> New exam</Button>} />}
      {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <ExamsTable exams={data.data} base={base} />
        <ExamsCards exams={data.data} base={base} />
      </div>}
    </CardContent>

    {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
  </Card>;
}

const windowText = (e: Exam) => e.opens_at || e.closes_at
  ? `${e.opens_at ? formatDateTime(e.opens_at) : "Anytime"} – ${e.closes_at ? formatDateTime(e.closes_at) : "no end"}`
  : "Always open";

function BatchBadges({ exam }: { exam: Exam }) {
  if (!exam.exam_batches.length) return <span className="text-xs text-amber-700 dark:text-amber-300">No batch yet</span>;
  return <div className="flex flex-wrap gap-1">{exam.exam_batches.map(({ batches: b }) => <Badge key={b.id} variant="outline" className="font-mono text-[11px]">{b.code}</Badge>)}</div>;
}

function ExamsTable({ exams, base }: { exams: Exam[]; base: string }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Exam</TableHead>
        <TableHead className="hidden lg:table-cell">Batches</TableHead>
        <TableHead className="text-right">Questions</TableHead>
        <TableHead className="text-right">Marks</TableHead>
        <TableHead className="hidden xl:table-cell">Window</TableHead>
        <TableHead className="text-right">Attempts</TableHead>
        <TableHead className="pr-4">Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {exams.map(e => <TableRow key={e.id}>
        <TableCell className="pl-4">
          <Link href={`${base}/exams/${e.id}`} className="block max-w-[22rem] truncate font-medium hover:underline">{e.title}</Link>
          <p className="max-w-[22rem] truncate text-xs text-muted-foreground">{KIND_LABEL[e.kind]} · {e.courses.code}{e.subjects && ` · ${e.subjects.name}`} · {e.duration_minutes} min</p>
        </TableCell>
        <TableCell className="hidden lg:table-cell"><BatchBadges exam={e} /></TableCell>
        <TableCell className="text-right tabular-nums">{e._count.exam_questions}</TableCell>
        <TableCell className="text-right tabular-nums">{formatMarks(e.total_marks)}</TableCell>
        <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{windowText(e)}</TableCell>
        <TableCell className="text-right tabular-nums">{e._count.exam_attempts}</TableCell>
        <TableCell className="pr-4"><ExamStatusPill status={e.status} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function ExamsCards({ exams, base }: { exams: Exam[]; base: string }) {
  return <ul className="divide-y md:hidden">
    {exams.map(e => <li key={e.id}>
      <Link href={`${base}/exams/${e.id}`} className="grid gap-2 p-4 hover:bg-muted/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium break-words">{e.title}</p>
            <p className="text-xs text-muted-foreground">{KIND_LABEL[e.kind]} · {e.courses.code}{e.subjects && ` · ${e.subjects.name}`}</p>
          </div>
          <ExamStatusPill status={e.status} className="shrink-0" />
        </div>
        <BatchBadges exam={e} />
        <p className="text-xs text-muted-foreground">{e._count.exam_questions} questions · {formatMarks(e.total_marks)} marks · {e.duration_minutes} min · {e._count.exam_attempts} attempts</p>
        <p className="text-xs text-muted-foreground">{windowText(e)}</p>
      </Link>
    </li>)}
  </ul>;
}
