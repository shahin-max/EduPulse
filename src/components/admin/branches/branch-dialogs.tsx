"use client";

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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  BRANCH_CODE_PATTERN, branchesApi, GSTIN_PATTERN, PHONE_PATTERN, PINCODE_PATTERN, PREFIX_PATTERN, type Branch, type BranchInput,
} from "@/lib/admin-catalog-api";
import { ErrorAlert, errorText, Field, Optional } from "../ui";

type Form = Record<"code" | "name" | "invoicePrefix" | "receiptPrefix" | "address" | "city" | "state" | "pincode" | "phone" | "email" | "gstin", string> & { isActive: boolean };

const REQUIRED = ["code", "name", "invoicePrefix", "receiptPrefix"] as const;
const OPTIONAL = ["address", "city", "state", "pincode", "phone", "email", "gstin"] as const;
const UPPER = new Set<keyof Form>(["code", "invoicePrefix", "receiptPrefix", "gstin"]);

/** Form field -> the branch column it edits. */
const COLUMN = {
  code: "code", name: "name", invoicePrefix: "invoice_prefix", receiptPrefix: "receipt_prefix", address: "address", city: "city",
  state: "state", pincode: "pincode", phone: "phone", email: "email", gstin: "gstin",
} as const satisfies Record<Exclude<keyof Form, "isActive">, keyof Branch>;

function initial(branch?: Branch): Form {
  const form = { isActive: branch?.is_active ?? true } as Form;
  for (const key of [...REQUIRED, ...OPTIONAL]) form[key] = branch?.[COLUMN[key]] ?? "";
  return form;
}

const clean = (form: Form, key: keyof typeof COLUMN) => {
  const value = form[key].trim();
  return UPPER.has(key) ? value.toUpperCase() : key === "email" ? value.toLowerCase() : value;
};

/** All filled fields when creating; only changed ones when editing (a cleared optional field becomes null). */
function toInput(form: Form, branch?: Branch): Partial<BranchInput> {
  const input: Partial<BranchInput> = {};
  for (const key of REQUIRED) {
    const value = clean(form, key);
    if (!branch || value !== branch[COLUMN[key]]) input[key] = value;
  }
  for (const key of OPTIONAL) {
    const value = clean(form, key) || null;
    if (branch ? value !== (branch[COLUMN[key]] || null) : value !== null) input[key] = value;
  }
  if (!branch ? !form.isActive : form.isActive !== branch.is_active) input.isActive = form.isActive;
  return input;
}

/** Add a branch, or edit one when `branch` is given. */
export function BranchFormDialog({ open, onOpenChange, branch, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
  onSaved: (branch: Branch) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
      {open && <BranchForm branch={branch} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function BranchForm({ branch, onSaved, onClose }: { branch?: Branch; onSaved: (branch: Branch) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [form, setForm] = useState(() => initial(branch));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: UPPER.has(key) ? event.target.value.toUpperCase() : event.target.value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = toInput(form, branch);
    if (branch && !Object.keys(input).length) return onClose();
    setBusy(true);
    setError("");
    try {
      const saved = await withToken(token => branch ? branchesApi.update(token, branch.id, input) : branchesApi.create(token, input as BranchInput));
      toast.success(branch ? "Branch saved" : `${saved.name} added`);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? "Another branch already uses this code." : errorText(e, "Could not save the branch."));
    } finally {
      setBusy(false);
    }
  }

  const prefixChanged = !!branch && (form.invoicePrefix.trim() !== branch.invoice_prefix || form.receiptPrefix.trim() !== branch.receipt_prefix);

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{branch ? "Edit branch" : "Add branch"}</DialogTitle>
      <DialogDescription>{branch ? `${branch.name} (${branch.code})` : "A centre where batches run and fees are collected."}</DialogDescription>
    </DialogHeader>

    <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
      <Field id="branch-name" label="Name">
        <Input id="branch-name" required minLength={2} maxLength={160} value={form.name} onChange={set("name")} placeholder="Aligarh - Civil Lines" autoComplete="off" />
      </Field>
      <Field id="branch-code" label="Code" hint="2-20 letters or digits.">
        <Input id="branch-code" required pattern={BRANCH_CODE_PATTERN} title="2-20 letters or digits" maxLength={20} value={form.code} onChange={set("code")} placeholder="ALG" className="uppercase" autoComplete="off" />
      </Field>
    </div>

    <div className="grid grid-cols-2 gap-5">
      <Field id="branch-invoice" label="Invoice prefix">
        <Input id="branch-invoice" required pattern={PREFIX_PATTERN} title="1-10 letters or digits" maxLength={10} value={form.invoicePrefix} onChange={set("invoicePrefix")} placeholder="ALG" className="uppercase" autoComplete="off" />
      </Field>
      <Field id="branch-receipt" label="Receipt prefix">
        <Input id="branch-receipt" required pattern={PREFIX_PATTERN} title="1-10 letters or digits" maxLength={10} value={form.receiptPrefix} onChange={set("receiptPrefix")} placeholder="ALGR" className="uppercase" autoComplete="off" />
      </Field>
      <p className={prefixChanged ? "col-span-2 -mt-3 text-xs text-amber-700 dark:text-amber-300" : "col-span-2 -mt-3 text-xs text-muted-foreground"}>
        {prefixChanged ? "New prefixes apply to invoices and receipts issued from now on; existing numbers do not change." : "Printed at the start of this branch's invoice and receipt numbers. 1-10 letters or digits."}
      </p>
    </div>

    <Separator />

    <Field id="branch-address" label={<>Address <Optional /></>}>
      <Textarea id="branch-address" rows={2} maxLength={2000} value={form.address} onChange={set("address")} />
    </Field>
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
      <Field id="branch-city" label={<>City <Optional /></>}>
        <Input id="branch-city" minLength={2} maxLength={80} value={form.city} onChange={set("city")} placeholder="Aligarh" />
      </Field>
      <Field id="branch-state" label={<>State <Optional /></>}>
        <Input id="branch-state" minLength={2} maxLength={80} value={form.state} onChange={set("state")} placeholder="Uttar Pradesh" />
      </Field>
      <Field id="branch-pincode" label={<>PIN code <Optional /></>} className="col-span-2 sm:col-span-1">
        <Input id="branch-pincode" inputMode="numeric" pattern={PINCODE_PATTERN} title="6 digits" maxLength={6} value={form.pincode} onChange={set("pincode")} placeholder="202001" />
      </Field>
    </div>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="branch-phone" label={<>Phone <Optional /></>}>
        <Input id="branch-phone" type="tel" pattern={PHONE_PATTERN} title="10-15 digit phone number" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
      </Field>
      <Field id="branch-email" label={<>Email <Optional /></>}>
        <Input id="branch-email" type="email" maxLength={254} value={form.email} onChange={set("email")} />
      </Field>
    </div>
    <Field id="branch-gstin" label={<>GSTIN <Optional /></>} hint="15-character GST number, printed on this branch's invoices.">
      <Input id="branch-gstin" pattern={GSTIN_PATTERN} title="15-character GSTIN" maxLength={15} value={form.gstin} onChange={set("gstin")} className="uppercase" autoComplete="off" />
    </Field>

    <div className="flex items-start gap-3 rounded-md border p-3">
      <Checkbox id="branch-active" checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v === true }))} className="mt-0.5" />
      <div className="grid gap-1">
        <Label htmlFor="branch-active">Active</Label>
        <p className="text-xs text-muted-foreground">Inactive branches cannot get new batches.</p>
      </div>
    </div>

    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{branch ? "Save changes" : "Add branch"}</Button>
    </DialogFooter>
  </form>;
}

/** Confirm before deactivating; activating needs no confirmation. */
export function DeactivateBranchDialog({ branch, open, onOpenChange, onConfirm, busy }: {
  branch: Branch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (branch: Branch) => void;
  busy: boolean;
}) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Deactivate {branch?.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          No new batches can be added to it. Its {branch?._count.batches ?? 0} existing batch{branch?._count.batches === 1 ? "" : "es"}, staff, invoices and payments are kept. Branches are never deleted, and you can activate it again at any time.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); if (branch) onConfirm(branch); }} className="bg-destructive text-white hover:bg-destructive/90">
          {busy && <Loader2 className="animate-spin" />}Deactivate
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
