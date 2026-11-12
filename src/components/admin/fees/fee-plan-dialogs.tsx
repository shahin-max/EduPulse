"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { feeLookupsApi, feePlansApi, isMoney, MONEY_PATTERN, toPaise, fromPaise, type FeePlanListItem, type UpdateFeePlanInput } from "@/lib/admin-fees-api";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, errorText, Field } from "../ui";

type Scope = "all" | "branch" | "batch";
const NONE = "none";

/** Create a fee plan, or edit one when `plan` is given. */
export function FeePlanFormDialog({ open, onOpenChange, plan, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: FeePlanListItem;
  onSaved: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <FeePlanForm plan={plan} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function FeePlanForm({ plan, onSaved, onClose }: { plan?: FeePlanListItem; onSaved: () => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const [courseId, setCourseId] = useState<number | undefined>(plan?.course_id);
  const [scope, setScope] = useState<Scope>(plan?.batch_id ? "batch" : plan?.branch_id ? "branch" : "all");
  const [branchId, setBranchId] = useState<number | undefined>(plan?.branch_id ?? undefined);
  const [batchId, setBatchId] = useState<number | undefined>(plan?.batch_id ?? undefined);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [amount, setAmount] = useState(plan ? plan.amount : "");
  const [isActive, setIsActive] = useState(plan?.is_active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const courses = useAdminData(token => plan ? Promise.resolve([]) : feeLookupsApi.courses(token), plan ? "-" : "courses");
  const branches = useAdminData(token => feeLookupsApi.branches(token), "branches");
  const batches = useAdminData(token => courseId ? feeLookupsApi.batches(token, { courseId }) : Promise.resolve(null), `batches:${courseId ?? ""}`);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId) return setError("Choose a course.");
    if (!isMoney(amount)) return setError("Enter the amount in rupees, e.g. 3500 or 3500.50.");
    if (scope === "branch" && !branchId) return setError("Choose the branch this plan is for.");
    if (scope === "batch" && !batchId) return setError("Choose the batch this plan is for.");
    setBusy(true);
    setError("");
    try {
      const money = fromPaise(toPaise(amount.trim()));
      if (!plan) {
        await withToken(token => feePlansApi.create(token, {
          courseId, title: title.trim(), amount: money, isActive,
          ...(scope === "branch" ? { branchId } : scope === "batch" ? { batchId } : {}),
        }));
        toast.success("Fee plan created");
      } else {
        const patch: UpdateFeePlanInput = {};
        if (title.trim() !== plan.title) patch.title = title.trim();
        if (toPaise(money) !== toPaise(plan.amount)) patch.amount = money;
        if (isActive !== plan.is_active) patch.isActive = isActive;
        const nextBatch = scope === "batch" ? batchId ?? null : null;
        if (nextBatch !== plan.batch_id) patch.batchId = nextBatch;
        if (Object.keys(patch).length) await withToken(token => feePlansApi.update(token, plan.id, patch));
        toast.success("Changes saved");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the fee plan."));
    } finally {
      setBusy(false);
    }
  }

  // On edit the API can only move a plan onto a batch or off it; the course and branch stay (taking it off a batch keeps that batch's branch).
  const scopeOptions: { value: Scope; label: string }[] = plan
    ? [plan.branch_id ? { value: "branch", label: "All batches in its branch" } : { value: "all", label: "All branches" }, { value: "batch", label: "One batch" }]
    : [{ value: "all", label: "All branches" }, { value: "branch", label: "One branch" }, { value: "batch", label: "One batch" }];
  const batchOptions = batches.data?.data ?? [];

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{plan ? "Edit fee plan" : "New fee plan"}</DialogTitle>
      <DialogDescription>{plan ? "Invoices already raised from this plan keep their amounts." : "The standard fee for a course; it can be limited to one branch or one batch."}</DialogDescription>
    </DialogHeader>

    {plan ? <Field id="plan-course" label="Course"><Input id="plan-course" value={plan.courses.title} disabled /></Field>
      : <Field id="plan-course" label="Course">
        <Select value={courseId ? String(courseId) : undefined} onValueChange={v => { setCourseId(Number(v)); setBatchId(undefined); }}>
          <SelectTrigger id="plan-course" className="w-full"><SelectValue placeholder={courses.loading ? "Loading courses…" : "Choose a course"} /></SelectTrigger>
          <SelectContent>{courses.data?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} ({c.code})</SelectItem>)}</SelectContent>
        </Select>
      </Field>}

    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="plan-scope" label="Applies to">
        <Select value={scope} onValueChange={v => setScope(v as Scope)}>
          <SelectTrigger id="plan-scope" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{scopeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      {scope === "branch" && !plan && <Field id="plan-branch" label="Branch">
        <Select value={branchId ? String(branchId) : undefined} onValueChange={v => setBranchId(Number(v))}>
          <SelectTrigger id="plan-branch" className="w-full"><SelectValue placeholder="Choose a branch" /></SelectTrigger>
          <SelectContent>{branches.data?.filter(b => b.is_active).map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>}
      {scope === "branch" && plan && <Field id="plan-branch" label="Branch">
        <Input id="plan-branch" disabled value={branches.data?.find(b => b.id === plan.branch_id)?.name ?? `Branch #${plan.branch_id}`} />
      </Field>}
      {scope === "batch" && <Field id="plan-batch" label="Batch">
        <Select value={batchId ? String(batchId) : NONE} onValueChange={v => setBatchId(v === NONE ? undefined : Number(v))} disabled={!courseId}>
          <SelectTrigger id="plan-batch" className="w-full"><SelectValue placeholder="Choose a batch" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} disabled>{courseId ? (batches.loading ? "Loading batches…" : "Choose a batch") : "Choose a course first"}</SelectItem>
            {batchOptions.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.code} · {b.branches.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>}
    </div>
    {plan && scope === "batch" && !plan.batch_id && plan.branch_id && <p className="-mt-3 text-xs text-muted-foreground">The plan moves to the chosen batch&apos;s branch.</p>}

    <Field id="plan-title" label="Title">
      <Input id="plan-title" required minLength={2} maxLength={160} placeholder="JEE 2027 – monthly fee" value={title} onChange={e => setTitle(e.target.value)} autoComplete="off" />
    </Field>
    <Field id="plan-amount" label="Amount (₹)">
      <Input id="plan-amount" required inputMode="decimal" pattern={MONEY_PATTERN} title="Rupees with at most 2 decimals, e.g. 3500 or 3500.50" placeholder="3500" value={amount} onChange={e => setAmount(e.target.value)} autoComplete="off" />
    </Field>
    <div className="flex items-center gap-2">
      <Checkbox id="plan-active" checked={isActive} onCheckedChange={v => setIsActive(v === true)} />
      <Label htmlFor="plan-active" className="font-normal">Active (can be used for new invoices)</Label>
    </div>

    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{plan ? "Save changes" : "Create plan"}</Button>
    </DialogFooter>
  </form>;
}
