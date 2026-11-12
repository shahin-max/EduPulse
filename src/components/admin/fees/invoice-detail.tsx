"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Ban, CircleCheck, IndianRupee, Pencil, Printer, Send, Undo2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { invoicesApi, toPaise, type Payment } from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, formatDate, formatMoney, Pill } from "../ui";
import { EditInvoiceDialog, InvoiceActionDialog } from "./invoice-dialogs";
import { RecordPaymentDialog, RefundDialog, SettleDialog, type SettleTarget } from "./payment-dialogs";
import { INVOICE_TONES, isOverdue, methodLabel, PAYMENT_TONES, pendingPaise, refundablePaise } from "./shared";

export default function InvoiceDetail({ id }: { id: number }) {
  const { data: invoice, error, loading, reload, setData } = useAdminData(token => invoicesApi.get(token, id), String(id));
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState<"issue" | "void" | null>(null);
  const [paying, setPaying] = useState(false);
  const [settling, setSettling] = useState<SettleTarget | null>(null);
  const [refunding, setRefunding] = useState<Payment | null>(null);

  const back = <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href="/admin/fees"><ArrowLeft /> All invoices</Link></Button>;

  if (!Number.isInteger(id) || id < 1) return <>{back}<ErrorAlert title="Not found" message="This invoice id is not valid." /></>;
  if (loading && !invoice) return <>{back}<DetailSkeleton /></>;
  if (error && !invoice) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!invoice) return null;

  const student = invoice.enrollments.student_profiles;
  const batch = invoice.enrollments.batches;
  const balance = toPaise(invoice.balance_due);
  const paid = toPaise(invoice.amount_paid);
  const pending = pendingPaise(invoice);
  const canPay = (invoice.status === "ISSUED" || invoice.status === "PART_PAID") && balance - pending > 0;
  const voidBlock = invoice.status === "VOID" ? "Already void"
    : paid !== 0 ? "Refund the confirmed payments first"
    : pending > 0 ? "Settle the pending payments first" : null;
  const payBlock = invoice.status === "DRAFT" ? "Issue the invoice first"
    : invoice.status === "VOID" ? "The invoice is void"
    : balance <= 0 ? "Nothing left to pay"
    : "The balance is covered by pending payments";

  const actions = [
    invoice.status === "DRAFT" && { label: "Issue", icon: Send, onClick: () => setAction("issue") },
    invoice.status === "DRAFT" && { label: "Edit", icon: Pencil, onClick: () => setEditing(true), variant: "outline" as const },
    invoice.status !== "DRAFT" && { label: "Record payment", icon: Wallet, onClick: () => setPaying(true), disabled: !canPay, tip: canPay ? undefined : payBlock },
    invoice.status !== "VOID" && { label: "Void", icon: Ban, onClick: () => setAction("void"), disabled: !!voidBlock, tip: voidBlock ?? undefined, variant: "outline" as const, destructive: true },
  ].filter(a => !!a);

  return <>
    {back}

    <Card>
      <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight tabular-nums">{invoice.invoice_number}</h1>
            <Pill value={invoice.status} tones={INVOICE_TONES} />
            {isOverdue(invoice) && <Pill value="OVERDUE" tones={{ OVERDUE: "red" }} />}
          </div>
          <p className="font-medium">{student.users.full_name}{student.admission_number && <span className="font-normal text-muted-foreground"> · {student.admission_number}</span>}</p>
          <p className="text-sm text-muted-foreground">{batch.code} · {batch.name} · {batch.courses.title}</p>
          {invoice.description && <p className="text-sm">{invoice.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {actions.map(({ label, icon: Icon, onClick, disabled, tip, variant, destructive }) => {
            const button = <Button variant={variant ?? "default"} onClick={onClick} disabled={disabled}
              className={cn("w-full sm:w-auto", destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive")}><Icon /> {label}</Button>;
            if (!tip) return <span key={label} className="contents">{button}</span>;
            return <Tooltip key={label}>
              <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>;
          })}
        </div>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader><CardTitle>Amounts</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="Fee" value={formatMoney(invoice.gross_amount)} />
          <Row label="Discount" value={toPaise(invoice.discount_amount) ? `− ${formatMoney(invoice.discount_amount)}` : "—"} />
          <Separator />
          <Row label="Payable" value={formatMoney(invoice.amount_due)} strong />
          <Row label="Paid (net of refunds)" value={formatMoney(invoice.amount_paid)} />
          {pending > 0 && <Row label="Pending clearance" value={formatMoney(pending / 100)} />}
          <Separator />
          <Row label="Balance due" value={invoice.status === "VOID" ? "—" : formatMoney(invoice.balance_due)} strong
            className={balance > 0 && invoice.status !== "VOID" ? "text-amber-700 dark:text-amber-300" : undefined} />
          <Separator />
          <Row label="Due date" value={formatDate(invoice.due_date)} />
          <Row label="Issued" value={formatDate(invoice.issued_at, true)} />
          <Row label="Created" value={formatDate(invoice.created_at, true)} />
          {invoice.fee_plans && <Row label="Fee plan" value={invoice.fee_plans.title} />}
        </CardContent>
      </Card>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Payments</CardTitle>
          <CardDescription>Confirmed payments get a receipt number. Pending ones (e.g. a cheque) count once confirmed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoice.payments.length === 0
            ? <EmptyState icon={IndianRupee} title="No payments yet" description={invoice.status === "DRAFT" ? "Issue the invoice to start taking payments." : undefined}
              action={canPay && <Button onClick={() => setPaying(true)}><Wallet /> Record payment</Button>} />
            : <ul className="divide-y border-t">
              {invoice.payments.map(p => <PaymentItem key={p.id} payment={p}
                onSettle={() => setSettling({ kind: "payment", payment: p })}
                onRefund={() => setRefunding(p)}
                onSettleRefund={refund => setSettling({ kind: "refund", refund })} />)}
            </ul>}
        </CardContent>
      </Card>
    </div>

    <EditInvoiceDialog invoice={invoice} open={editing} onOpenChange={setEditing} onSaved={setData} />
    <InvoiceActionDialog invoice={invoice} action={action} onOpenChange={open => { if (!open) setAction(null); }} onDone={setData} />
    <RecordPaymentDialog invoice={invoice} open={paying} onOpenChange={setPaying} onRecorded={reload} />
    <SettleDialog target={settling} onOpenChange={open => { if (!open) setSettling(null); }} onDone={reload} />
    <RefundDialog payment={refunding} onOpenChange={open => { if (!open) setRefunding(null); }} onDone={reload} />
  </>;
}

function Row({ label, value, strong, className }: { label: string; value: React.ReactNode; strong?: boolean; className?: string }) {
  return <div className="flex items-baseline justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("text-right tabular-nums", strong && "font-semibold text-base", className)}>{value}</span>
  </div>;
}

function PaymentItem({ payment: p, onSettle, onRefund, onSettleRefund }: {
  payment: Payment; onSettle: () => void; onRefund: () => void; onSettleRefund: (refund: Payment["payment_refunds"][number]) => void;
}) {
  const refundable = refundablePaise(p);
  return <li className="grid gap-3 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold tabular-nums">{formatMoney(p.amount, p.currency)} <span className="font-normal text-muted-foreground">· {methodLabel(p.method)}</span></p>
        <p className="text-xs text-muted-foreground">
          {p.receipt_number ?? `Payment #${p.id}`} · {formatDate(p.paid_at ?? p.created_at, true)}
        </p>
        {(p.external_reference || p.provider) && <p className="truncate text-xs text-muted-foreground">Ref: {[p.provider, p.external_reference].filter(Boolean).join(" · ")}</p>}
        {p.notes && <p className="mt-1 text-sm break-words whitespace-pre-line">{p.notes}</p>}
      </div>
      <Pill value={p.status} tones={PAYMENT_TONES} />
    </div>

    {p.payment_refunds.length > 0 && <ul className="grid gap-2 rounded-md bg-muted/50 p-3 text-sm">
      {p.payment_refunds.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p><Undo2 className="mr-1 inline size-3.5 text-muted-foreground" />Refund {formatMoney(r.amount)} <span className="text-muted-foreground">· {formatDate(r.refunded_at ?? r.created_at)}</span></p>
          <p className="text-xs break-words text-muted-foreground">{r.reason}{r.external_reference ? ` · Ref: ${r.external_reference}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Pill value={r.status} tones={PAYMENT_TONES} />
          {r.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => onSettleRefund(r)}>Settle</Button>}
        </div>
      </li>)}
    </ul>}

    <div className="flex flex-wrap gap-2">
      {p.status === "CONFIRMED" && p.receipt_number && <Button asChild size="sm" variant="outline"><Link href={`/admin/fees/receipts/${p.id}`}><Printer /> Receipt</Link></Button>}
      {p.status === "PENDING" && <Button size="sm" variant="outline" onClick={onSettle}><CircleCheck /> Settle</Button>}
      {refundable > 0 && <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRefund}><Undo2 /> Refund</Button>}
    </div>
  </li>;
}

function DetailSkeleton() {
  return <div className="grid gap-6">
    <Card><CardContent className="grid gap-3"><Skeleton className="h-7 w-56" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-72" /></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Card><CardContent className="grid gap-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-4 w-full" />)}</CardContent></Card>
      <Card><CardContent className="grid gap-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>
    </div>
  </div>;
}
