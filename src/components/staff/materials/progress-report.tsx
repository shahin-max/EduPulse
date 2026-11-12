"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorAlert, formatDate, LoadingRows, Pager, Pill } from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/use-admin-data";
import { batchLabel, type StaffBatch } from "@/components/staff/use-staff";
import { materialsApi, type MaterialProgress } from "@/lib/staff-learning-api";

const STATUS_TONES = { COMPLETED: "green", IN_PROGRESS: "amber", NOT_STARTED: "gray" } as const;

/**
 * Staff view of students' progress on the course's materials, for one batch (GET /study-materials/progress).
 * The API only has rows for materials a student has marked; anything else counts as not started.
 */
export default function ProgressReport({ batches }: { batches: StaffBatch[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const batch = batches.find(b => b.id === picked) ?? batches[0];

  return <Card className="gap-0 py-0">
    <CardHeader className="border-b p-4 [.border-b]:pb-4">
      <CardTitle>Student progress</CardTitle>
      <CardDescription>What students of a batch have started or finished. Materials a student has not opened are not listed.</CardDescription>
      {batches.length > 0 && <Select value={batch ? String(batch.id) : ""} onValueChange={v => { setPicked(Number(v)); setPage(1); }}>
        <SelectTrigger className="mt-2 w-full sm:w-80" aria-label="Batch"><SelectValue /></SelectTrigger>
        <SelectContent>{batches.map(b => <SelectItem key={b.id} value={String(b.id)}>{batchLabel(b)}</SelectItem>)}</SelectContent>
      </Select>}
    </CardHeader>
    {batch
      ? <BatchProgress key={batch.id} batch={batch} page={page} onPage={setPage} />
      : <CardContent className="p-0"><EmptyState icon={BarChart3} title="No batches of this course" description="Progress is tracked per batch once students are enrolled." /></CardContent>}
  </Card>;
}

function BatchProgress({ batch, page, onPage }: { batch: StaffBatch; page: number; onPage: (page: number) => void }) {
  const { data, error, loading, reload } = useAdminData(token => materialsApi.progress(token, batch.id, page, 50), `progress:${batch.id}:${page}`);
  const rows = data?.data ?? [];

  // Per-material counts over the rows on this page.
  const byMaterial = new Map<number, { title: string; completed: number; inProgress: number }>();
  for (const r of rows) {
    const entry = byMaterial.get(r.material_id) ?? { title: r.study_materials.title, completed: 0, inProgress: 0 };
    if (r.status === "COMPLETED") entry.completed++;
    else if (r.status === "IN_PROGRESS") entry.inProgress++;
    byMaterial.set(r.material_id, entry);
  }

  return <>
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows rows={3} />}
      {data && rows.length === 0 && <EmptyState icon={BarChart3} title="No progress recorded yet" description={`${batch.enrolled} student${batch.enrolled === 1 ? "" : "s"} enrolled; none has marked a material yet.`} />}
      {rows.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <div className="flex flex-wrap gap-2 border-b p-4">
          {[...byMaterial.values()].map(m => <div key={m.title} className="min-w-0 max-w-full rounded-md border px-3 py-2 text-sm">
            <p className="truncate font-medium">{m.title}</p>
            <p className="text-xs text-muted-foreground">{m.completed} completed · {m.inProgress} in progress · {batch.enrolled} enrolled</p>
          </div>)}
        </div>
        <ProgressTable rows={rows} />
        <ul className="divide-y md:hidden">
          {rows.map(r => <li key={r.id} className="grid gap-1 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 truncate font-medium">{r.enrollments.student_profiles.users.full_name}</p>
              <Pill value={r.status} tones={STATUS_TONES} />
            </div>
            <p className="truncate text-sm text-muted-foreground">{r.study_materials.title}</p>
            <p className="text-xs text-muted-foreground">Last opened {formatDate(r.last_accessed_at, true)}</p>
          </li>)}
        </ul>
      </div>}
    </CardContent>
    {data && data.meta.total > data.meta.limit && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={onPage} /></div></CardFooter>}
  </>;
}

function ProgressTable({ rows }: { rows: MaterialProgress[] }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Student</TableHead>
        <TableHead>Material</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden lg:table-cell">Last opened</TableHead>
        <TableHead className="pr-4">Completed</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(r => <TableRow key={r.id}>
        <TableCell className="pl-4 font-medium">{r.enrollments.student_profiles.users.full_name}</TableCell>
        <TableCell className="max-w-[18rem] truncate">{r.study_materials.title}</TableCell>
        <TableCell><Pill value={r.status} tones={STATUS_TONES} /></TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(r.last_accessed_at, true)}</TableCell>
        <TableCell className="pr-4 text-muted-foreground">{formatDate(r.completed_at)}</TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}
