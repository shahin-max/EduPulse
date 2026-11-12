"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  fromPaise, invoicesApi, isMoney, MONEY_PATTERN, PAYMENT_METHODS, paymentsApi, toPaise,
  type Invoice, type Payment, type PaymentMethod, type Refund, type SettleStatus,
} from "@/lib/admin-fees-api";
import { ErrorAlert, errorText, Field, formatMoney, Optional } from "../ui";
import { methodLabel, pendingPaise, refundablePaise, toLocalInput } from "./shared";

type Received = "CONFIRMED" | "PENDING";
const RECEIVED_LABEL: Record<Received, string> = { CONFIRMED: "Received (issue receipt)", PENDING: "Pending clearance (cheque, bank transfer)" };

/** A new key per form: retrying the same submit after a network error cannot record the money twice. */
const newKey = () => crypto.randomUUID();

function money(value: string) { return fromPaise(toPaise(value.trim())); }

// ------------------------------------------------------------------ record a payment

export function RecordPaymentDialog({ invoice, open, onOpenChange, onRecorded }: {
  invoice: Invoice; open: boolean; onOpenChange: (open: boolean) => void; onRecorded: (payment: Payment) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <RecordPaymentForm invoice={invoice} onRecorded={onRecorded} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function RecordPaymentForm({ invoice, onRecorded, onClose }: { invoice: Invoice; onRecorded: (payment: Payment) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const balance = toPaise(invoice.balance_due);
  const pending = pendingPaise(invoice);
  const [key, setKey] = useState(newKey);
  const [amount, setAmount] = useState(balance - pending > 0 ? fromPaise(balance - pending) : "");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [status, setStatus] = useState<Received>("CONFIRMED");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(() => toLocalInput(new Date()));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Confirmed money can use the whole balance; a pending payment cannot overlap other pending ones.
  const room = status === "CONFIRMED" ? balance : balance - pending;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isMoney(amount) || toPaise(amount.trim()) <= 0) return setError("Enter the amount received in rupees, e.g. 1500.");
    if (toPaise(amount.trim()) > room) return setError(`The amount is more than the ${formatMoney(fromPaise(room))} that can still be paid on this invoice.`);
    if (paidAt && new Date(paidAt) > new Date()) return setError("The payment date cannot be in the future.");
    setBusy(true);
    setError("");
    try {
      const payment = await withToken(token => invoicesApi.recordPayment(token, invoice.id, {
        amount: money(amount),
        method,
        idempotencyKey: key,
        status,
        externalReference: reference.trim() || undefined,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      }));
      toast.success(status === "CONFIRMED" ? `Payment of ${formatMoney(payment.amount)} recorded` : `Pending payment of ${formatMoney(payment.amount)} recorded`);
      onRecorded(payment);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // The key was already used: an earlier attempt went through (or the reference is taken). Start a fresh attempt.
        setKey(newKey());
        setError(`${e.message}. Check the payments list before trying again, the earlier attempt may have been recorded.`);
      } else setError(errorText(e, "Could not record the payment."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Record payment</DialogTitle>
      <DialogDescription>
        {invoice.invoice_number} · balance due <strong className="text-foreground">{formatMoney(invoice.balance_due)}</strong>
        {pending > 0 && <> ({formatMoney(fromPaise(pending))} pending)</>}
      </DialogDescription>
    </DialogHeader>
    <div className="grid grid-cols-2 gap-4">
      <Field id="pay-amount" label="Amount (₹)">
        <Input id="pay-amount" required inputMode="decimal" pattern={MONEY_PATTERN} title="Rupees with at most 2 decimals" value={amount} onChange={e => setAmount(e.target.value)} autoComplete="off" />
      </Field>
      <Field id="pay-method" label="Method">
        <Select value={method} onValueChange={v => setMethod(v as PaymentMethod)}>
          <SelectTrigger id="pay-method" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </div>
    <Field id="pay-status" label="Status">
      <Select value={status} onValueChange={v => setStatus(v as Received)}>
        <SelectTrigger id="pay-status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{(["CONFIRMED", "PENDING"] as Received[]).map(s => <SelectItem key={s} value={s}>{RECEIVED_LABEL[s]}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="pay-ref" label={<>Reference <Optional /></>} hint={method === "CASH" ? undefined : "UPI / bank transaction id"}>
        <Input id="pay-ref" maxLength={120} value={reference} onChange={e => setReference(e.target.value)} autoComplete="off" />
      </Field>
      <Field id="pay-at" label={status === "CONFIRMED" ? "Paid at" : <>Paid at <Optional /></>}>
        <Input id="pay-at" type="datetime-local" max={toLocalInput(new Date())} value={paidAt} onChange={e => setPaidAt(e.target.value)} />
      </Field>
    </div>
    <Field id="pay-notes" label={<>Notes <Optional /></>}>
      <Textarea id="pay-notes" maxLength={5000} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
    </Field>
    {error && <ErrorAlert title="Could not record" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Record payment</Button>
    </DialogFooter>
  </form>;
}

// ------------------------------------------------------------------ settle a pending payment or refund

const SETTLE_LABEL: Record<SettleStatus, string> = { CONFIRMED: "Confirmed (money received)", FAILED: "Failed", CANCELLED: "Cancelled" };

export type SettleTarget = { kind: "payment"; payment: Payment } | { kind: "refund"; refund: Refund };

export function SettleDialog({ target, onOpenChange, onDone }: { target: SettleTarget | null; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  return <Dialog open={!!target} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      {target && <SettleForm target={target} onDone={onDone} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function SettleForm({ target, onDone, onClose }: { target: SettleTarget; onDone: () => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const isPayment = target.kind === "payment";
  const amount = isPayment ? target.payment.amount : target.refund.amount;
  const [status, setStatus] = useState<SettleStatus>("CONFIRMED");
  const [paidAt, setPaidAt] = useState(() => toLocalInput(isPayment && target.payment.paid_at ? new Date(target.payment.paid_at) : new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (target.kind === "payment") {
        await withToken(token => paymentsApi.setStatus(token, target.payment.id, {
          status, ...(status === "CONFIRMED" && paidAt ? { paidAt: new Date(paidAt).toISOString() } : {}),
        }));
      } else {
        await withToken(token => paymentsApi.setRefundStatus(token, target.refund.id, status));
      }
      toast.success(`${isPayment ? "Payment" : "Refund"} marked ${status.toLowerCase()}`);
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not update the status."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Settle pending {isPayment ? "payment" : "refund"}</DialogTitle>
      <DialogDescription>
        {formatMoney(amount)}{isPayment ? ` by ${methodLabel(target.payment.method)}` : ""}. {isPayment ? "Confirming issues a receipt number and counts the money against the invoice." : "Confirming counts the refund against the invoice."}
      </DialogDescription>
    </DialogHeader>
    <Field id="settle-status" label="New status">
      <Select value={status} onValueChange={v => setStatus(v as SettleStatus)}>
        <SelectTrigger id="settle-status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{(Object.keys(SETTLE_LABEL) as SettleStatus[]).map(s => <SelectItem key={s} value={s}>{isPayment || s !== "CONFIRMED" ? SETTLE_LABEL[s] : "Confirmed (money returned)"}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
    {isPayment && status === "CONFIRMED" && <Field id="settle-paid-at" label="Paid at">
      <Input id="settle-paid-at" type="datetime-local" max={toLocalInput(new Date())} value={paidAt} onChange={e => setPaidAt(e.target.value)} />
    </Field>}
    {error && <ErrorAlert title="Could not update" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy} variant={status === "CONFIRMED" ? "default" : "destructive"}>{busy && <Loader2 className="animate-spin" />}Save</Button>
    </DialogFooter>
  </form>;
}

// ------------------------------------------------------------------ refund

export function RefundDialog({ payment, onOpenChange, onDone }: { payment: Payment | null; onOpenChange: (open: boolean) => void; onDone: () => void }) {
  return <Dialog open={!!payment} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
      {payment && <RefundForm payment={payment} onDone={onDone} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function RefundForm({ payment, onDone, onClose }: { payment: Payment; onDone: () => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const refundable = refundablePaise(payment);
  const [key, setKey] = useState(newKey);
  const [amount, setAmount] = useState(refundable > 0 ? fromPaise(refundable) : "");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<Received>("CONFIRMED");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isMoney(amount) || toPaise(amount.trim()) <= 0) return setError("Enter the amount to refund in rupees.");
    if (toPaise(amount.trim()) > refundable) return setError(`At most ${formatMoney(fromPaise(refundable))} can be refunded on this payment.`);
    setBusy(true);
    setError("");
    try {
      await withToken(token => paymentsApi.refund(token, payment.id, {
        amount: money(amount), reason: reason.trim(), idempotencyKey: key, status, externalReference: reference.trim() || undefined,
      }));
      toast.success(`Refund of ${formatMoney(money(amount))} ${status === "CONFIRMED" ? "recorded" : "started"}`);
      onDone();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setKey(newKey());
        setError(`${e.message}. Check the refunds before trying again, the earlier attempt may have been recorded.`);
      } else setError(errorText(e, "Could not record the refund."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Refund payment</DialogTitle>
      <DialogDescription>{payment.receipt_number ?? `Payment #${payment.id}`} · up to {formatMoney(fromPaise(refundable))} can be refunded.</DialogDescription>
    </DialogHeader>
    <Field id="refund-amount" label="Amount (₹)">
      <Input id="refund-amount" required inputMode="decimal" pattern={MONEY_PATTERN} title="Rupees with at most 2 decimals" value={amount} onChange={e => setAmount(e.target.value)} autoComplete="off" />
    </Field>
    <Field id="refund-reason" label="Reason">
      <Textarea id="refund-reason" required minLength={3} maxLength={500} rows={2} placeholder="Student withdrew from the batch" value={reason} onChange={e => setReason(e.target.value)} />
    </Field>
    <Field id="refund-status" label="Status">
      <Select value={status} onValueChange={v => setStatus(v as Received)}>
        <SelectTrigger id="refund-status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="CONFIRMED">Money returned</SelectItem>
          <SelectItem value="PENDING">In progress (pending)</SelectItem>
        </SelectContent>
      </Select>
    </Field>
    <Field id="refund-ref" label={<>Reference <Optional /></>}>
      <Input id="refund-ref" maxLength={120} value={reference} onChange={e => setReference(e.target.value)} autoComplete="off" />
    </Field>
    {error && <ErrorAlert title="Could not refund" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" variant="destructive" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Refund</Button>
    </DialogFooter>
  </form>;
}
