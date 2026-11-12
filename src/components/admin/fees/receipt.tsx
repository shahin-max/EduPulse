"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { feeLookupsApi, invoicesApi, paymentsApi, toPaise, type FeeBranch, type Invoice, type Payment } from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, formatDate, formatMoney, titleCase } from "../ui";
import { methodLabel, rupeesInWords } from "./shared";

type ReceiptData = { payment: Payment; invoice: Invoice | null; branch: FeeBranch | null; receivedBy: string | null };

/** GET /payments/:id has only ids, so the invoice, branch and recorder are looked up too (each optional). */
async function loadReceipt(token: string, id: number): Promise<ReceiptData> {
  const payment = await paymentsApi.get(token, id);
  const [invoice, branch, recorder] = await Promise.all([
    invoicesApi.get(token, payment.invoice_id).catch(() => null),
    feeLookupsApi.branch(token, payment.branch_id).catch(() => null),
    payment.recorded_by ? feeLookupsApi.user(token, payment.recorded_by).catch(() => null) : Promise.resolve(null),
  ]);
  return { payment, invoice, branch, receivedBy: recorder?.full_name ?? null };
}

export default function Receipt({ paymentId }: { paymentId: number }) {
  const valid = Number.isInteger(paymentId) && paymentId > 0;
  const { data, error, loading, reload } = useAdminData(token => valid ? loadReceipt(token, paymentId) : Promise.reject(new Error("This payment id is not valid.")), String(paymentId));

  const backHref = data?.invoice ? `/admin/fees/invoices/${data.invoice.id}` : data ? `/admin/fees/invoices/${data.payment.invoice_id}` : "/admin/fees";
  const toolbar = <div className="flex items-center justify-between gap-2 print:hidden">
    <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href={backHref}><ArrowLeft /> Back to invoice</Link></Button>
    {data && <Button onClick={() => window.print()}><Printer /> Print</Button>}
  </div>;

  if (loading && !data) return <>{toolbar}<Card className="mx-auto w-full max-w-2xl"><CardContent className="grid gap-3">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-4 w-full" />)}</CardContent></Card></>;
  if (error && !data) return <>{toolbar}<ErrorAlert message={error} onRetry={valid ? reload : undefined} /></>;
  if (!data) return null;

  const { payment, invoice, branch, receivedBy } = data;
  const confirmed = payment.status === "CONFIRMED" && !!payment.receipt_number;
  const refunded = payment.payment_refunds.filter(r => r.status === "CONFIRMED").reduce((t, r) => t + toPaise(r.amount), 0);
  const student = invoice?.enrollments.student_profiles;
  const batch = invoice?.enrollments.batches;
  const address = branch && [branch.address, [branch.city, branch.state].filter(Boolean).join(", "), branch.pincode].filter(Boolean).join(" · ");

  return <>
    {toolbar}
    {!confirmed && <div className="print:hidden"><ErrorAlert title="Not a valid receipt"
      message={`This payment is ${titleCase(payment.status).toLowerCase()}. A receipt number is issued only when the payment is confirmed.`} /></div>}

    <article className="mx-auto w-full max-w-2xl rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-8 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none">
      <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between print:border-black/30">
        <div className="min-w-0">
          <p className="text-xl font-bold tracking-tight">EduPulse Academy</p>
          {branch && <p className="text-sm font-medium">{branch.name}</p>}
          {address && <p className="text-xs text-muted-foreground print:text-black/70">{address}</p>}
          {branch && (branch.phone || branch.email) && <p className="text-xs text-muted-foreground print:text-black/70">{[branch.phone, branch.email].filter(Boolean).join(" · ")}</p>}
          {branch?.gstin && <p className="text-xs text-muted-foreground print:text-black/70">GSTIN: <span className="font-mono">{branch.gstin}</span></p>}
        </div>
        <div className="sm:text-right print:text-right">
          <p className="text-sm font-semibold tracking-widest uppercase">{confirmed ? "Fee receipt" : "Payment record"}</p>
          <p className="font-mono text-sm tabular-nums">{payment.receipt_number ?? `Payment #${payment.id}`}</p>
          <p className="text-xs text-muted-foreground print:text-black/70">{formatDate(payment.paid_at ?? payment.created_at)}</p>
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-3 py-5 text-sm sm:grid-cols-2 print:grid-cols-2">
        <Item label="Received from" value={student ? <>{student.users.full_name}{student.admission_number && <span className="text-muted-foreground print:text-black/70"> ({student.admission_number})</span>}</> : "—"} />
        <Item label="Invoice" value={invoice ? <span className="font-mono">{invoice.invoice_number}</span> : `#${payment.invoice_id}`} />
        <Item label="Batch / course" value={batch ? `${batch.code} · ${batch.courses.title}` : "—"} />
        <Item label="For" value={invoice?.description ?? invoice?.fee_plans?.title ?? "Fees"} />
        <Item label="Payment method" value={methodLabel(payment.method)} />
        <Item label="Reference" value={[payment.provider, payment.external_reference].filter(Boolean).join(" · ") || "—"} />
        <Item label="Date of payment" value={formatDate(payment.paid_at ?? payment.created_at, true)} />
        <Item label="Received by" value={receivedBy ?? "—"} />
      </dl>

      <div className="rounded-lg bg-muted/60 p-4 print:border print:border-black/30 print:bg-transparent">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium">Amount received</span>
          <span className="text-2xl font-bold tabular-nums">{formatMoney(payment.amount, payment.currency)}</span>
        </div>
        {payment.currency === "INR" && <p className="mt-1 text-xs text-muted-foreground print:text-black/70">{rupeesInWords(toPaise(payment.amount))}</p>}
      </div>

      {invoice && <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Item label="Invoice total" value={formatMoney(invoice.amount_due)} />
        <Item label="Paid to date" value={formatMoney(invoice.amount_paid)} />
        <Item label="Balance due" value={formatMoney(invoice.balance_due)} />
      </dl>}

      {refunded > 0 && <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-300 print:text-black">Refunded: {formatMoney(refunded / 100, payment.currency)} of this payment has been returned.</p>}
      {payment.notes && <p className="mt-4 text-sm break-words whitespace-pre-line"><span className="text-muted-foreground print:text-black/70">Notes: </span>{payment.notes}</p>}

      <footer className="mt-10 flex items-end justify-between gap-4 text-xs text-muted-foreground print:text-black/70">
        <p>Computer-generated receipt.{!confirmed && " Not valid as proof of payment."}</p>
        <div className="text-center">
          <div className="mb-1 h-10 w-40 border-b border-current" />
          <p>Authorised signatory</p>
        </div>
      </footer>
    </article>
  </>;
}

function Item({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return <div className={cn("min-w-0", className)}>
    <dt className="text-xs text-muted-foreground print:text-black/70">{label}</dt>
    <dd className="break-words font-medium">{value}</dd>
  </div>;
}
