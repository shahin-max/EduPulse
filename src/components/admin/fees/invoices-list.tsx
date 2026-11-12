"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, FilePlus2, ReceiptText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { feeLookupsApi, INVOICE_STATUSES, invoicesApi, toPaise, type Invoice, type InvoiceStatus, type InvoiceSummary } from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, formatDate, formatMoney, LoadingRows, Pager, Pill, titleCase } from "../ui";
import { INVOICE_TONES, isOverdue } from "./shared";

const ALL = "all";

export default function InvoicesList({ onCreate }: { onCreate: () => void }) {
  const [status, setStatus] = useState<InvoiceStatus | undefined>();
  const [batchId, setBatchId] = useState<number | undefined>();
  const [studentUserId, setStudentUserId] = useState<number | undefined>();
  const [overdue, setOverdue] = useState(false);
  const [branchId, setBranchId] = useState<number | undefined>();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Search after a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const batches = useAdminData(token => feeLookupsApi.batches(token), "batches");
  const branches = useAdminData(token => feeLookupsApi.branches(token), "branches");
  const roster = useAdminData(token => batchId ? feeLookupsApi.roster(token, batchId) : Promise.resolve([]), `roster:${batchId ?? ""}`);

  const query = { status, batchId, studentUserId, branchId, search: search || undefined, overdue: overdue || undefined, page, limit: 20 };
  const { data, error, loading, reload } = useAdminData(token => invoicesApi.list(token, query), JSON.stringify(query));
  const filtered = !!(status || batchId || studentUserId || overdue || branchId || search);

  return <Card className="gap-0 py-0">
    <div className="border-b p-4 pb-0">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Search by invoice number, student name, mobile or admission no." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search invoices" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 border-b p-4 sm:flex sm:flex-wrap sm:items-center">
      {(branches.data?.length ?? 0) > 1 && <Select value={branchId ? String(branchId) : ALL} onValueChange={v => { setBranchId(v === ALL ? undefined : Number(v)); setPage(1); }}>
        <SelectTrigger className="w-full sm:w-44 [&>span]:truncate" aria-label="Filter by branch"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All branches</SelectItem>
          {branches.data?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>}
      <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as InvoiceStatus); setPage(1); }}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={batchId ? String(batchId) : ALL} onValueChange={v => { setBatchId(v === ALL ? undefined : Number(v)); setStudentUserId(undefined); setPage(1); }}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Filter by batch"><SelectValue placeholder="All batches" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All batches</SelectItem>
          {batches.data?.data.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.code} · {b.branches.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={studentUserId ? String(studentUserId) : ALL} disabled={!batchId} onValueChange={v => { setStudentUserId(v === ALL ? undefined : Number(v)); setPage(1); }}>
        <SelectTrigger className="col-span-2 w-full sm:w-56" aria-label="Filter by student"><SelectValue placeholder={batchId ? "All students" : "Pick a batch for students"} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{batchId ? "All students" : "Pick a batch for students"}</SelectItem>
          {roster.data?.map(r => <SelectItem key={r.id} value={String(r.student_profiles.user_id)}>
            {r.student_profiles.users.full_name}{r.student_profiles.admission_number ? ` (${r.student_profiles.admission_number})` : ""}
          </SelectItem>)}
        </SelectContent>
      </Select>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:pl-1">
        <Checkbox id="overdue-only" checked={overdue} onCheckedChange={v => { setOverdue(v === true); setPage(1); }} />
        <Label htmlFor="overdue-only" className="font-normal whitespace-nowrap">Overdue only</Label>
      </div>
    </div>

    {data && data.summary.invoices > 0 && <Totals summary={data.summary} />}

    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows />}
      {data && data.data.length === 0 && <EmptyState icon={ReceiptText}
        title={filtered ? "No invoices match these filters" : "No invoices yet"}
        description={filtered ? "Try different filters or clear them." : "Raise the first invoice for an enrolled student."}
        action={!filtered && <Button onClick={onCreate}><FilePlus2 /> New invoice</Button>} />}
      {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <InvoicesTable invoices={data.data} />
        <InvoicesCards invoices={data.data} />
      </div>}
    </CardContent>

    {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
  </Card>;
}

/** Totals from the API over every invoice matching the filters (all pages); drafts and void invoices excluded. */
function Totals({ summary }: { summary: InvoiceSummary }) {
  const items = [
    { label: "Billed", value: summary.billed },
    { label: "Collected", value: summary.collected },
    { label: "Balance due", value: summary.outstanding, strong: true },
  ];
  return <div className="border-b px-4 py-3">
    <dl className="grid grid-cols-3 gap-3">
      {items.map(item => <div key={item.label} className="min-w-0">
        <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
        <dd className={cn("truncate text-sm font-semibold tabular-nums sm:text-base", item.strong && toPaise(item.value) > 0 && "text-amber-700 dark:text-amber-300")}>{formatMoney(item.value)}</dd>
      </div>)}
    </dl>
    <p className="mt-1 text-xs text-muted-foreground">Across all {summary.invoices} issued invoice{summary.invoices === 1 ? "" : "s"} matching these filters; drafts and void invoices excluded.</p>
  </div>;
}

const student = (i: Invoice) => i.enrollments.student_profiles;

function DueDate({ invoice }: { invoice: Invoice }) {
  const overdue = isOverdue(invoice);
  return <span className={cn(overdue ? "font-medium text-red-700 dark:text-red-300" : "text-muted-foreground")}>
    {formatDate(invoice.due_date)}{overdue && " · overdue"}
  </span>;
}

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Invoice</TableHead>
        <TableHead>Student</TableHead>
        <TableHead className="hidden lg:table-cell">Batch</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead className="hidden text-right xl:table-cell">Paid</TableHead>
        <TableHead className="text-right">Balance</TableHead>
        <TableHead className="hidden lg:table-cell">Due</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="pr-4 text-right"><span className="sr-only">Actions</span></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {invoices.map(i => <TableRow key={i.id}>
        <TableCell className="pl-4">
          <Link href={`/admin/fees/invoices/${i.id}`} className="font-medium tabular-nums hover:underline">{i.invoice_number}</Link>
          <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{i.description ?? i.fee_plans?.title ?? "—"}</p>
        </TableCell>
        <TableCell>
          <p className="max-w-[12rem] truncate font-medium">{student(i).users.full_name}</p>
          {student(i).admission_number && <p className="text-xs text-muted-foreground">{student(i).admission_number}</p>}
        </TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{i.enrollments.batches.code}</TableCell>
        <TableCell className="text-right tabular-nums">{formatMoney(i.amount_due)}</TableCell>
        <TableCell className="hidden text-right tabular-nums text-muted-foreground xl:table-cell">{formatMoney(i.amount_paid)}</TableCell>
        <TableCell className="text-right font-medium tabular-nums">{i.status === "VOID" ? "—" : formatMoney(i.balance_due)}</TableCell>
        <TableCell className="hidden lg:table-cell"><DueDate invoice={i} /></TableCell>
        <TableCell><Pill value={i.status} tones={INVOICE_TONES} /></TableCell>
        <TableCell className="pr-4 text-right">
          <Button asChild variant="ghost" size="icon"><Link href={`/admin/fees/invoices/${i.id}`} aria-label={`View ${i.invoice_number}`}><Eye /></Link></Button>
        </TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function InvoicesCards({ invoices }: { invoices: Invoice[] }) {
  return <ul className="divide-y md:hidden">
    {invoices.map(i => <li key={i.id}>
      <Link href={`/admin/fees/invoices/${i.id}`} className="grid gap-2 p-4 hover:bg-muted/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{student(i).users.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{i.invoice_number} · {i.enrollments.batches.code}</p>
          </div>
          <Pill value={i.status} tones={INVOICE_TONES} />
        </div>
        <div className="flex items-end justify-between gap-3 text-sm">
          <div className="min-w-0 text-xs"><DueDate invoice={i} /></div>
          <div className="text-right">
            <p className="font-semibold tabular-nums">{i.status === "VOID" ? formatMoney(i.amount_due) : formatMoney(i.balance_due)}</p>
            <p className="text-xs text-muted-foreground">{i.status === "VOID" ? "void" : `due of ${formatMoney(i.amount_due)}`}</p>
          </div>
        </div>
      </Link>
    </li>)}
  </ul>;
}
