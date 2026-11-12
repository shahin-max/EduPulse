"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { feeLookupsApi, PAYMENT_METHODS, paymentsApi, type PaymentListItem, type PaymentMethod, type PaymentsSummary } from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, formatDate, formatMoney, LoadingRows, Pager, Pill } from "../ui";
import { methodLabel, PAYMENT_TONES, todayIso } from "./shared";

const ALL = "all";

/** The academy works in India time: a "day" runs from midnight to midnight IST, whatever the browser's zone. */
const istStart = (day: string) => new Date(`${day}T00:00:00+05:30`);
const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const PRESETS = [
  { label: "Today", range: (today: string) => [today, today] },
  { label: "Yesterday", range: (today: string) => [addDays(today, -1), addDays(today, -1)] },
  { label: "Last 7 days", range: (today: string) => [addDays(today, -6), today] },
  { label: "This month", range: (today: string) => [`${today.slice(0, 7)}-01`, today] },
] as const;

/**
 * The payments register: money received in a period (by default today), with totals by method and
 * refunds handed back in the same period, for the day-end cash tally. Prints as a report.
 */
export default function CollectionsList() {
  const today = todayIso();
  const [fromDay, setFromDay] = useState(today);
  const [toDay, setToDay] = useState(today);
  const [branchId, setBranchId] = useState<number | undefined>();
  const [method, setMethod] = useState<PaymentMethod | undefined>();
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const branches = useAdminData(token => feeLookupsApi.branches(token), "branches");
  const validRange = !!fromDay && !!toDay && fromDay <= toDay;
  const query = {
    from: validRange ? istStart(fromDay).toISOString() : undefined,
    to: validRange ? istStart(addDays(toDay, 1)).toISOString() : undefined,
    branchId, method, search: search || undefined, page, limit: 50,
  };
  const { data, error, loading, reload } = useAdminData(token => paymentsApi.list(token, query), JSON.stringify(query));

  const setRange = (from: string, to: string) => { setFromDay(from); setToDay(to); setPage(1); };
  const period = fromDay === toDay ? dayLabel(fromDay) : `${dayLabel(fromDay)} – ${dayLabel(toDay)}`;
  const branchName = branchId ? branches.data?.find(b => b.id === branchId)?.name : undefined;

  return <Card className="gap-0 py-0 print:border-0 print:shadow-none">
    <div className="grid gap-3 border-b p-4 print:hidden">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => {
          const [from, to] = p.range(today);
          const active = from === fromDay && to === toDay;
          return <Button key={p.label} size="sm" variant={active ? "default" : "outline"} onClick={() => setRange(from, to)}>{p.label}</Button>;
        })}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="col-from" className="text-xs text-muted-foreground">From</Label>
          <Input id="col-from" type="date" value={fromDay} max={toDay || undefined} onChange={e => { setFromDay(e.target.value); setPage(1); }} className="lg:w-40" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="col-to" className="text-xs text-muted-foreground">To</Label>
          <Input id="col-to" type="date" value={toDay} min={fromDay || undefined} onChange={e => { setToDay(e.target.value); setPage(1); }} className="lg:w-40" />
        </div>
        {(branches.data?.length ?? 0) > 1 && <Select value={branchId ? String(branchId) : ALL} onValueChange={v => { setBranchId(v === ALL ? undefined : Number(v)); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-44 [&>span]:truncate" aria-label="Filter by branch"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All branches</SelectItem>
            {branches.data?.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>}
        <Select value={method ?? ALL} onValueChange={v => { setMethod(v === ALL ? undefined : v as PaymentMethod); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Filter by method"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All methods</SelectItem>
            {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative col-span-2 lg:min-w-64 lg:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Receipt, invoice, reference or student" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search payments" />
        </div>
      </div>
      {!validRange && <p className="text-sm text-destructive">Choose a start date on or before the end date.</p>}
    </div>

    {/* Report heading, only when printed. */}
    <div className="hidden print:block print:pb-4">
      <p className="text-lg font-semibold">EduPulse Academy · Fee collection</p>
      <p className="text-sm">{period}{branchName ? ` · ${branchName}` : ""}{method ? ` · ${methodLabel(method)}` : ""}{search ? ` · “${search}”` : ""}</p>
    </div>

    {data && <Summary summary={data.summary} period={period} />}

    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <LoadingRows />}
      {data && data.data.length === 0 && <EmptyState icon={Banknote} title="No payments in this period"
        description={search || method || branchId ? "Try different filters." : "Payments recorded against invoices appear here."} />}
      {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <PaymentsTable payments={data.data} />
        <PaymentsCards payments={data.data} />
      </div>}
    </CardContent>

    {data && data.meta.totalPages > 1 && <CardFooter className="border-t p-4 print:hidden [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    {data && data.meta.totalPages > 1 && <p className="hidden px-4 pt-2 text-xs print:block">Page {data.meta.page} of {data.meta.totalPages}; totals above cover all pages.</p>}
  </Card>;
}

function Summary({ summary, period }: { summary: PaymentsSummary; period: string }) {
  return <div className="grid gap-4 border-b p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
    <div className="grid grid-cols-3 gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">Collected</p>
        <p className="truncate text-base font-semibold tabular-nums">{formatMoney(summary.collected)}</p>
        <p className="text-xs text-muted-foreground">{summary.payments} payment{summary.payments === 1 ? "" : "s"}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">Refunded</p>
        <p className={cn("truncate text-base font-semibold tabular-nums", Number(summary.refunded) > 0 && "text-red-700 dark:text-red-300")}>{Number(summary.refunded) > 0 ? `− ${formatMoney(summary.refunded)}` : formatMoney(0)}</p>
        <p className="text-xs text-muted-foreground">{summary.refunds} refund{summary.refunds === 1 ? "" : "s"}</p>
      </div>
      <div className="min-w-0 rounded-lg bg-primary/5 px-3 py-2 print:bg-transparent print:p-0">
        <p className="truncate text-xs text-muted-foreground">Net</p>
        <p className="truncate text-lg font-semibold text-primary tabular-nums print:text-foreground">{formatMoney(summary.net)}</p>
        <p className="truncate text-xs text-muted-foreground">{period}</p>
      </div>
    </div>
    <div className="min-w-0">
      <p className="mb-2 text-xs text-muted-foreground">Confirmed payments by method</p>
      {summary.byMethod.length === 0 ? <p className="text-sm text-muted-foreground">—</p>
        : <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {summary.byMethod.map(m => <li key={m.method} className="rounded-lg border px-3 py-2">
            <p className="text-xs text-muted-foreground">{methodLabel(m.method)} · {m.payments}</p>
            <p className="text-sm font-semibold tabular-nums">{formatMoney(m.amount)}</p>
          </li>)}
        </ul>}
    </div>
  </div>;
}

const student = (p: PaymentListItem) => p.fee_invoices.enrollments.student_profiles;
const batch = (p: PaymentListItem) => p.fee_invoices.enrollments.batches;

function ReceiptLink({ payment }: { payment: PaymentListItem }) {
  if (!payment.receipt_number) return <span className="text-muted-foreground">—</span>;
  return <Link href={`/admin/fees/receipts/${payment.id}`} className="font-mono text-xs hover:underline print:no-underline">{payment.receipt_number}</Link>;
}

/** md and up, and when printed. */
function PaymentsTable({ payments }: { payments: PaymentListItem[] }) {
  return <Table className="hidden md:table print:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Paid</TableHead>
        <TableHead>Receipt</TableHead>
        <TableHead>Student</TableHead>
        <TableHead className="hidden lg:table-cell print:table-cell">Invoice</TableHead>
        <TableHead>Method</TableHead>
        <TableHead className="hidden xl:table-cell print:table-cell">Taken by</TableHead>
        <TableHead className="text-right">Amount</TableHead>
        <TableHead className="pr-4 print:hidden">Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {payments.map(p => <TableRow key={p.id} className={cn(p.status !== "CONFIRMED" && "text-muted-foreground")}>
        <TableCell className="pl-4 whitespace-nowrap">{formatDate(p.paid_at ?? p.created_at, true)}</TableCell>
        <TableCell><ReceiptLink payment={p} /></TableCell>
        <TableCell>
          <p className="max-w-[14rem] truncate font-medium">{student(p).users.full_name}</p>
          <p className="max-w-[14rem] truncate text-xs text-muted-foreground">{batch(p).code}{student(p).admission_number ? ` · ${student(p).admission_number}` : ""}</p>
        </TableCell>
        <TableCell className="hidden lg:table-cell print:table-cell">
          <Link href={`/admin/fees/invoices/${p.fee_invoices.id}`} className="font-mono text-xs hover:underline print:no-underline">{p.fee_invoices.invoice_number}</Link>
        </TableCell>
        <TableCell>
          <p>{methodLabel(p.method)}</p>
          {p.external_reference && <p className="max-w-[10rem] truncate text-xs text-muted-foreground">{p.external_reference}</p>}
        </TableCell>
        <TableCell className="hidden text-muted-foreground xl:table-cell print:table-cell">{p.users?.full_name ?? "—"}</TableCell>
        <TableCell className="text-right font-medium tabular-nums">
          {formatMoney(p.amount)}
          {p.payment_refunds.some(r => r.status === "CONFIRMED") && <p className="text-xs font-normal text-red-700 dark:text-red-300">refunded {formatMoney(p.payment_refunds.filter(r => r.status === "CONFIRMED").reduce((t, r) => t + Number(r.amount), 0))}</p>}
        </TableCell>
        <TableCell className="pr-4 print:hidden"><Pill value={p.status} tones={PAYMENT_TONES} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

/** Below md (never printed: the table prints instead). */
function PaymentsCards({ payments }: { payments: PaymentListItem[] }) {
  return <ul className="divide-y md:hidden print:hidden">
    {payments.map(p => <li key={p.id} className="grid gap-1.5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{student(p).users.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{batch(p).code} · {formatDate(p.paid_at ?? p.created_at, true)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums">{formatMoney(p.amount)}</p>
          <p className="text-xs text-muted-foreground">{methodLabel(p.method)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <ReceiptLink payment={p} />
        <Pill value={p.status} tones={PAYMENT_TONES} />
      </div>
    </li>)}
  </ul>;
}

