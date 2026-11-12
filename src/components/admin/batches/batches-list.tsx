"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarRange, Eye, Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BATCH_STATUSES, batchesApi, type Batch, type BatchStatus } from "@/lib/admin-batches-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, LoadingRows, PageHeader, Pager, Pill, titleCase } from "../ui";
import { BatchFormDialog, courseLabel, DeleteBatchDialog, useBatchPickers } from "./batch-dialogs";
import { BATCH_TONES, dateRange, Seats, useDebounced } from "./batch-shared";

const ALL = "all";
const PAGE_SIZE = 20;
const toId = (value: string | null) => (value && /^\d+$/.test(value) ? Number(value) : undefined);

export default function BatchesList() {
  const params = useSearchParams();
  const pickers = useBatchPickers();
  const [branchId, setBranchId] = useState(toId(params.get("branchId")));
  const [courseId, setCourseId] = useState(toId(params.get("courseId")));
  const [status, setStatus] = useState<BatchStatus | undefined>(BATCH_STATUSES.find(s => s === params.get("status")));
  const [searchText, setSearchText] = useState("");
  const search = useDebounced(searchText.trim());
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<Batch | undefined>();
  const [deleting, setDeleting] = useState<Batch | null>(null);

  // The API searches batch name/code and course title/code.
  const query = { branchId, courseId, status, search: search || undefined, page, limit: PAGE_SIZE };
  const { data, error, loading, reload } = useAdminData(token => batchesApi.list(token, query), JSON.stringify(query));

  const rows = data?.data ?? [];
  const filtered = !!(branchId || courseId || status || search);

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const actions: RowActions = { edit: b => { setEditing(b); setFormOpen(true); }, remove: b => setDeleting(b) };
  const resetPage = () => setPage(1);

  return <>
    <PageHeader title="Batches" description="Course runs at each branch: dates, seats, faculty and students." actions={<Button onClick={openCreate}><Plus /> New batch</Button>} />

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search by code, name or course" value={searchText} onChange={e => { setSearchText(e.target.value); resetPage(); }} className="pl-9" aria-label="Search batches" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:flex xl:items-center">
          <Select value={branchId ? String(branchId) : ALL} onValueChange={v => { setBranchId(v === ALL ? undefined : Number(v)); resetPage(); }}>
            <SelectTrigger className="w-full xl:w-40 [&>span]:truncate" aria-label="Filter by branch"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All branches</SelectItem>
              {pickers.data?.branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}{!b.is_active && " (inactive)"}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as BatchStatus); resetPage(); }}>
            <SelectTrigger className="w-full xl:w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {BATCH_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={courseId ? String(courseId) : ALL} onValueChange={v => { setCourseId(v === ALL ? undefined : Number(v)); resetPage(); }}>
            <SelectTrigger className="col-span-2 w-full sm:col-span-1 xl:w-56 [&>span]:truncate" aria-label="Filter by course"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {pickers.data?.courses.map(c => <SelectItem key={c.id} value={String(c.id)}>{courseLabel(c)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && rows.length === 0 && <EmptyState icon={Layers}
          title={filtered ? "No batches match these filters" : "No batches yet"}
          description={filtered ? "Try a different search or clear the filters." : "Create the first batch to start enrolling students."}
          action={!filtered && <Button onClick={openCreate}><Plus /> New batch</Button>} />}
        {data && rows.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <BatchesTable batches={rows} actions={actions} />
          <BatchesCards batches={rows} actions={actions} />
        </div>}
      </CardContent>

      {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    </Card>

    <BatchFormDialog open={formOpen} onOpenChange={setFormOpen} batch={editing} onSaved={reload} />
    <DeleteBatchDialog batch={deleting} open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} onDeleted={reload} onUpdated={reload} />
  </>;
}

type RowActions = { edit: (b: Batch) => void; remove: (b: Batch) => void };

function ActionButtons({ batch, actions, labels = false }: { batch: Batch; actions: RowActions; labels?: boolean }) {
  const items = [
    { label: "View", icon: Eye, href: `/admin/batches/${batch.id}` },
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(batch) },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(batch), destructive: true },
  ];
  return <div className={labels ? "grid grid-cols-3 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, href, onClick, destructive }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = href
        ? <Button asChild variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className}><Link href={href} aria-label={`View ${batch.code}`}><Icon />{labels && label}</Link></Button>
        : <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} aria-label={`${label} ${batch.code}`}><Icon />{labels && label}</Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      return <Tooltip key={label}>
        <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>;
    })}
  </div>;
}

/** md and up: a table. Lower-priority columns appear as the screen widens. */
function BatchesTable({ batches, actions }: { batches: Batch[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Batch</TableHead>
        <TableHead className="hidden lg:table-cell">Course</TableHead>
        <TableHead>Branch</TableHead>
        <TableHead className="hidden xl:table-cell">Dates</TableHead>
        <TableHead>Seats</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {batches.map(b => <TableRow key={b.id}>
        <TableCell className="pl-4">
          <Link href={`/admin/batches/${b.id}`} className="block max-w-[14rem] truncate font-medium hover:underline">{b.name}</Link>
          <p className="max-w-[14rem] truncate font-mono text-xs text-muted-foreground">{b.code}<span className="font-sans lg:hidden"> · {b.courses.title}</span></p>
        </TableCell>
        <TableCell className="hidden lg:table-cell"><p className="max-w-[14rem] truncate">{b.courses.title}</p></TableCell>
        <TableCell><p className="max-w-[10rem] truncate">{b.branches.name}</p></TableCell>
        <TableCell className="hidden text-muted-foreground xl:table-cell">{dateRange(b)}</TableCell>
        <TableCell className="w-36"><Seats batch={b} /></TableCell>
        <TableCell><Pill value={b.status} tones={BATCH_TONES} /></TableCell>
        <TableCell className="pr-4"><ActionButtons batch={b} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

/** Below md: one card per batch with full-width action buttons. */
function BatchesCards({ batches, actions }: { batches: Batch[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {batches.map(b => <li key={b.id} className="grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/batches/${b.id}`} className="block truncate font-medium hover:underline">{b.name}</Link>
          <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{b.code}</span> · {b.branches.name}</p>
          <p className="truncate text-xs text-muted-foreground">{b.courses.title}</p>
        </div>
        <Pill value={b.status} tones={BATCH_TONES} className="shrink-0" />
      </div>
      <div className="grid grid-cols-2 items-end gap-3">
        <Seats batch={b} />
        <p className="flex items-center justify-end gap-1.5 text-right text-xs text-muted-foreground"><CalendarRange className="size-3.5 shrink-0" />{dateRange(b)}</p>
      </div>
      <ActionButtons batch={b} actions={actions} labels />
    </li>)}
  </ul>;
}
