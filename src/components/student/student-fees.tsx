"use client";

import { IndianRupee, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { rupees, studentApi, type MyInvoice } from "@/lib/student-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { EmptyState, ErrorAlert, formatDate, PageHeader, Pill, titleCase, type Tone } from "@/components/admin/ui";
import { useNow } from "./shared";

const INVOICE_TONES: Record<string, Tone> = { ISSUED: "amber", PART_PAID: "orange", PAID: "green", VOID: "gray", OVERDUE: "red" };
const PAYMENT_TONES: Record<string, Tone> = { CONFIRMED: "green", PENDING: "amber", FAILED: "red", CANCELLED: "gray" };

/** The student's invoices and payments. Payments are made at the academy; there is no online payment yet. */
export default function StudentFees() {
  const { data, error, reload } = useAdminData(studentApi.invoices, "student-invoices");
  const now = useNow();

  const live = (data ?? []).filter(i => i.status !== "VOID");
  const billed = live.reduce((s, i) => s + Number(i.amount_due), 0);
  const paid = live.reduce((s, i) => s + Number(i.amount_paid), 0);
  const due = live.filter(i => i.status === "ISSUED" || i.status === "PART_PAID");
  const outstanding = due.reduce((s, i) => s + Number(i.balance_due), 0);
  const next = due.filter(i => i.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
  const overdue = (i: MyInvoice) => (i.status === "ISSUED" || i.status === "PART_PAID") && !!i.due_date && new Date(i.due_date).getTime() + 24 * 60 * 60 * 1000 <= now;

  const tiles = [
    { label: "Total fees", value: rupees(billed) },
    { label: "Paid", value: rupees(paid) },
    { label: "Balance due", value: outstanding ? rupees(outstanding) : "Nil", alert: outstanding > 0 },
    { label: "Next due date", value: next ? formatDate(next.due_date) : "—", alert: !!next && overdue(next) },
  ];

  return <>
    <PageHeader title="Fees" description="Your invoices, payments and receipt numbers. Pay at the academy office; ask for a receipt for every payment." />
    {error && <ErrorAlert message={error} onRetry={reload} />}
    {!data && !error && <Skeleton className="h-64 rounded-xl" />}
    {data && <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {tiles.map(t => <Card key={t.label} className={cn("gap-1 py-4", t.alert && "border-amber-500/40")}>
        <CardContent className="grid gap-1 px-4">
          <p className="text-xs text-muted-foreground">{t.label}</p>
          <p className="truncate text-xl font-semibold tabular-nums sm:text-2xl">{t.value}</p>
        </CardContent>
      </Card>)}
    </div>}
    {data?.length === 0 && <Card><EmptyState icon={IndianRupee} title="No invoices yet" description="Invoices from the academy appear here once they are issued." /></Card>}
    {data && data.length > 0 && <div className="grid gap-4">
      {data.map(i => <InvoiceCard key={i.id} invoice={i} overdue={overdue(i)} />)}
    </div>}
  </>;
}

function InvoiceCard({ invoice: i, overdue }: { invoice: MyInvoice; overdue: boolean }) {
  return <Card id={`invoice-${i.id}`} className={cn("scroll-mt-20 gap-0 py-0", i.status === "VOID" && "opacity-70", overdue && "border-red-500/40")}>
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <CardTitle className="tabular-nums">{i.invoice_number}</CardTitle>
        {overdue ? <Pill value="OVERDUE" label="Overdue" tones={INVOICE_TONES} /> : <Pill value={i.status} tones={INVOICE_TONES} />}
      </div>
      <CardDescription>
        {[i.description ?? i.fee_plans?.title, i.enrollments.batches.courses.title, i.enrollments.batches.name].filter(Boolean).join(" · ")}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid gap-4 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Amount</dt><dd className="tabular-nums">{rupees(i.gross_amount)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Discount</dt><dd className="tabular-nums">{Number(i.discount_amount) ? `− ${rupees(i.discount_amount)}` : "—"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Paid</dt><dd className="tabular-nums">{rupees(i.amount_paid)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Balance</dt><dd className={cn("font-semibold tabular-nums", Number(i.balance_due) > 0 && i.status !== "VOID" && "text-amber-700 dark:text-amber-400")}>{i.status === "VOID" ? "—" : rupees(i.balance_due)}</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">
        {i.issued_at ? `Issued ${formatDate(i.issued_at)}` : ""}{i.due_date ? ` · due ${formatDate(i.due_date)}` : ""}{i.status === "VOID" ? " · This invoice was cancelled and is not payable." : ""}
      </p>
      {i.payments.length > 0 && <section className="grid gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium"><Receipt className="size-4" /> Payments</h3>
        <ul className="divide-y rounded-lg border">
          {i.payments.map(p => {
            const refunded = p.payment_refunds.filter(r => r.status === "CONFIRMED").reduce((s, r) => s + Number(r.amount), 0);
            return <li key={p.id} id={`payment-${p.id}`} className="scroll-mt-20 flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm">
              <span className="font-medium tabular-nums">{rupees(p.amount)}</span>
              <span className="text-muted-foreground">{titleCase(p.method)} · {formatDate(p.paid_at ?? p.created_at)}</span>
              {p.receipt_number && <span className="text-muted-foreground">Receipt <span className="font-medium text-foreground tabular-nums">{p.receipt_number}</span></span>}
              {refunded > 0 && <span className="text-muted-foreground">Refunded {rupees(refunded)}</span>}
              <span className="ml-auto"><Pill value={p.status} tones={PAYMENT_TONES} /></span>
            </li>;
          })}
        </ul>
      </section>}
    </CardContent>
  </Card>;
}
