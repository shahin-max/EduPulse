"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  feeLookupsApi, feePlansApi, fromPaise, invoicesApi, isMoney, MONEY_PATTERN, toPaise, type Invoice, type UpdateInvoiceInput,
} from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, errorText, Field, formatMoney, Optional, titleCase } from "../ui";
import { dateOnly } from "./shared";

const NO_PLAN = "none";
const normal = (value: string) => fromPaise(toPaise(value.trim()));

/** Amount fields shared by create and edit: gross, discount and the resulting payable. */
function AmountFields({ gross, discount, setGross, setDiscount, grossPlaceholder, grossRequired }: {
  gross: string; discount: string; setGross: (v: string) => void; setDiscount: (v: string) => void; grossPlaceholder?: string; grossRequired: boolean;
}) {
  const grossPaise = toPaise(gross.trim() || grossPlaceholder || "0");
  const discountPaise = toPaise(discount.trim() || "0");
  const payable = grossPaise - discountPaise;
  return <>
    <div className="grid grid-cols-2 gap-4">
      <Field id="inv-gross" label="Fee (₹)">
        <Input id="inv-gross" required={grossRequired} inputMode="decimal" pattern={MONEY_PATTERN} title="Rupees with at most 2 decimals" placeholder={grossPlaceholder ?? "3500"} value={gross} onChange={e => setGross(e.target.value)} autoComplete="off" />
      </Field>
      <Field id="inv-discount" label={<>Discount <Optional /></>}>
        <Input id="inv-discount" inputMode="decimal" pattern={MONEY_PATTERN} title="Rupees with at most 2 decimals" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} autoComplete="off" />
      </Field>
    </div>
    <p className="-mt-2 text-sm text-muted-foreground">
      Payable: <strong className="text-foreground tabular-nums">{Number.isFinite(payable) ? formatMoney(fromPaise(Math.max(payable, 0))) : "—"}</strong>
      {Number.isFinite(payable) && payable < 0 && <span className="text-destructive"> · discount is more than the fee</span>}
    </p>
  </>;
}

// ------------------------------------------------------------------ create

export function CreateInvoiceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <CreateInvoiceForm onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function CreateInvoiceForm({ onClose }: { onClose: () => void }) {
  const { withToken } = useAuth();
  const router = useRouter();
  const [batchId, setBatchId] = useState<number | undefined>();
  const [enrollmentId, setEnrollmentId] = useState<number | undefined>();
  const [planId, setPlanId] = useState<number | undefined>();
  const [gross, setGross] = useState("");
  const [discount, setDiscount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [issue, setIssue] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const batches = useAdminData(token => feeLookupsApi.batches(token), "batches");
  const batch = batches.data?.data.find(b => b.id === batchId);
  const roster = useAdminData(token => batchId ? feeLookupsApi.roster(token, batchId) : Promise.resolve(null), `roster:${batchId ?? ""}`);
  // Plans of the batch's course that apply to it: course-wide, its branch, or this batch.
  const plans = useAdminData(token => batch ? feePlansApi.list(token, { courseId: batch.course_id, activeOnly: true }) : Promise.resolve(null), `plans:${batch?.course_id ?? ""}`);
  const applicable = (plans.data ?? []).filter(p => batch && (p.batch_id === null || p.batch_id === batch.id) && (p.branch_id === null || p.branch_id === batch.branch_id));
  const plan = applicable.find(p => p.id === planId);

  function chooseBatch(value: string) {
    setBatchId(Number(value));
    setEnrollmentId(undefined);
    setPlanId(undefined);
  }

  // With a plan, an empty fee field means "use the plan's amount" (shown as the placeholder).
  const choosePlan = (value: string) => setPlanId(value === NO_PLAN ? undefined : Number(value));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollmentId) return setError("Choose a batch and a student.");
    if (!gross.trim() && !plan) return setError("Enter the fee, or choose a fee plan.");
    if (gross.trim() && !isMoney(gross)) return setError("Enter the fee in rupees, e.g. 3500 or 3500.50.");
    if (discount.trim() && !isMoney(discount)) return setError("Enter the discount in rupees, e.g. 500.");
    const grossPaise = toPaise(gross.trim() || plan!.amount);
    if (discount.trim() && toPaise(discount.trim()) > grossPaise) return setError("The discount cannot be more than the fee.");
    setBusy(true);
    setError("");
    try {
      const created = await withToken(token => invoicesApi.create(token, {
        enrollmentId,
        feePlanId: planId,
        grossAmount: gross.trim() ? normal(gross) : undefined,
        discountAmount: discount.trim() ? normal(discount) : undefined,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
        issue: issue || undefined,
      }));
      toast.success(`Invoice ${created.invoice_number} ${issue ? "issued" : "saved as draft"}`);
      onClose();
      router.push(`/admin/fees/invoices/${created.id}`);
    } catch (e) {
      setError(errorText(e, "Could not create the invoice."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>New invoice</DialogTitle>
      <DialogDescription>Bill a student for their enrollment in a batch. Save it as a draft to review, or issue it now.</DialogDescription>
    </DialogHeader>

    <Field id="inv-batch" label="Batch">
      <Select value={batchId ? String(batchId) : undefined} onValueChange={chooseBatch}>
        <SelectTrigger id="inv-batch" className="w-full"><SelectValue placeholder={batches.loading ? "Loading batches…" : "Choose a batch"} /></SelectTrigger>
        <SelectContent>{batches.data?.data.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.code} · {b.name} ({b.branches.name})</SelectItem>)}</SelectContent>
      </Select>
    </Field>
    {batches.error && <ErrorAlert message={batches.error} onRetry={batches.reload} />}

    <Field id="inv-student" label="Student" hint={batchId && roster.data?.length === 0 ? "No students are enrolled in this batch." : undefined}>
      <Select value={enrollmentId ? String(enrollmentId) : undefined} onValueChange={v => setEnrollmentId(Number(v))} disabled={!batchId || !roster.data?.length}>
        <SelectTrigger id="inv-student" className="w-full"><SelectValue placeholder={!batchId ? "Choose a batch first" : roster.loading ? "Loading students…" : "Choose a student"} /></SelectTrigger>
        <SelectContent>{roster.data?.map(r => <SelectItem key={r.id} value={String(r.id)}>
          {r.student_profiles.users.full_name}{r.student_profiles.admission_number ? ` · ${r.student_profiles.admission_number}` : ""}{r.status !== "ACTIVE" ? ` (${titleCase(r.status)})` : ""}
        </SelectItem>)}</SelectContent>
      </Select>
    </Field>
    {roster.error && <ErrorAlert message={roster.error} onRetry={roster.reload} />}

    <Field id="inv-plan" label={<>Fee plan <Optional /></>} hint={batch && !plans.loading && applicable.length === 0 ? "No active fee plan applies to this batch." : plan ? "The fee and description default to the plan's." : undefined}>
      <Select value={planId ? String(planId) : NO_PLAN} onValueChange={choosePlan} disabled={!batch}>
        <SelectTrigger id="inv-plan" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PLAN}>No plan (enter the fee)</SelectItem>
          {applicable.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.title} · {formatMoney(p.amount, p.currency)}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>

    <AmountFields gross={gross} discount={discount} setGross={setGross} setDiscount={setDiscount} grossPlaceholder={plan?.amount} grossRequired={!plan} />

    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="inv-due" label={<>Due date <Optional /></>}>
        <Input id="inv-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </Field>
      <Field id="inv-desc" label={<>Description <Optional /></>}>
        <Input id="inv-desc" maxLength={255} placeholder={plan?.title ?? "April 2027 tuition"} value={description} onChange={e => setDescription(e.target.value)} autoComplete="off" />
      </Field>
    </div>

    <div className="flex items-start gap-2">
      <Checkbox id="inv-issue" checked={issue} onCheckedChange={v => setIssue(v === true)} className="mt-0.5" />
      <Label htmlFor="inv-issue" className="grid gap-0.5 font-normal">
        Issue now
        <span className="text-xs text-muted-foreground">Issued invoices can take payments but can no longer be edited.</span>
      </Label>
    </div>

    {error && <ErrorAlert title="Could not create" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{issue ? "Create and issue" : "Save draft"}</Button>
    </DialogFooter>
  </form>;
}

// ------------------------------------------------------------------ edit (DRAFT only)

export function EditInvoiceDialog({ invoice, open, onOpenChange, onSaved }: {
  invoice: Invoice; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (invoice: Invoice) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <EditInvoiceForm invoice={invoice} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function EditInvoiceForm({ invoice, onSaved, onClose }: { invoice: Invoice; onSaved: (invoice: Invoice) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [gross, setGross] = useState(invoice.gross_amount);
  const [discount, setDiscount] = useState(toPaise(invoice.discount_amount) ? invoice.discount_amount : "");
  const [dueDate, setDueDate] = useState(dateOnly(invoice.due_date));
  const [description, setDescription] = useState(invoice.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isMoney(gross)) return setError("Enter the fee in rupees, e.g. 3500 or 3500.50.");
    if (discount.trim() && !isMoney(discount)) return setError("Enter the discount in rupees, e.g. 500.");
    const discountValue = discount.trim() ? normal(discount) : "0.00";
    if (toPaise(discountValue) > toPaise(gross.trim())) return setError("The discount cannot be more than the fee.");
    const patch: UpdateInvoiceInput = {};
    if (toPaise(gross.trim()) !== toPaise(invoice.gross_amount)) patch.grossAmount = normal(gross);
    if (toPaise(discountValue) !== toPaise(invoice.discount_amount)) patch.discountAmount = discountValue;
    if (dueDate !== dateOnly(invoice.due_date)) patch.dueDate = dueDate || null;
    if (description.trim() !== (invoice.description ?? "")) patch.description = description.trim();
    if (!Object.keys(patch).length) return onClose();
    setBusy(true);
    setError("");
    try {
      const updated = await withToken(token => invoicesApi.update(token, invoice.id, patch));
      toast.success("Invoice updated");
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not update the invoice."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Edit {invoice.invoice_number}</DialogTitle>
      <DialogDescription>Draft invoices can be changed until they are issued.</DialogDescription>
    </DialogHeader>
    <AmountFields gross={gross} discount={discount} setGross={setGross} setDiscount={setDiscount} grossRequired />
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="inv-due" label={<>Due date <Optional /></>}>
        <Input id="inv-due" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </Field>
      <Field id="inv-desc" label={<>Description <Optional /></>}>
        <Input id="inv-desc" maxLength={255} value={description} onChange={e => setDescription(e.target.value)} autoComplete="off" />
      </Field>
    </div>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save changes</Button>
    </DialogFooter>
  </form>;
}

// ------------------------------------------------------------------ issue / void

export function InvoiceActionDialog({ invoice, action, onOpenChange, onDone }: {
  invoice: Invoice; action: "issue" | "void" | null; onOpenChange: (open: boolean) => void; onDone: (invoice: Invoice) => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const isVoid = action === "void";

  async function run(event: React.MouseEvent) {
    event.preventDefault(); // keep the dialog open until the request finishes
    if (!action) return;
    setBusy(true);
    try {
      const updated = await withToken(token => action === "void" ? invoicesApi.void(token, invoice.id) : invoicesApi.issue(token, invoice.id));
      toast.success(`${invoice.invoice_number} ${action === "void" ? "voided" : "issued"}`);
      onOpenChange(false);
      onDone(updated);
    } catch (e) {
      toast.error(errorText(e, `Could not ${action} the invoice.`));
    } finally {
      setBusy(false);
    }
  }

  return <AlertDialog open={!!action} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{isVoid ? `Void ${invoice.invoice_number}?` : `Issue ${invoice.invoice_number}?`}</AlertDialogTitle>
        <AlertDialogDescription>
          {isVoid
            ? "The invoice is cancelled and can no longer take payments. This cannot be undone; raise a new invoice if needed."
            : `The student will see this invoice for ${formatMoney(invoice.amount_due)} and payments can be recorded. It can no longer be edited, only voided.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={run} disabled={busy} className={isVoid ? "bg-destructive text-white hover:bg-destructive/90" : undefined}>
          {busy && <Loader2 className="animate-spin" />}{isVoid ? "Void invoice" : "Issue invoice"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
