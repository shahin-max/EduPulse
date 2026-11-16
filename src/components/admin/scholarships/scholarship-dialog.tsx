"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  SCHOLARSHIP_GRADES, scholarshipsApi, slabSentence, type ScholarshipTest, type Slab, type UpdateScholarshipInput,
} from "@/lib/scholarships-api";
import { ErrorAlert, errorText, Field, Optional } from "../ui";

/** ISO -> value for <input type="datetime-local"> in the browser's time zone (India for the academy). */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value: string) => value ? new Date(value).toISOString() : null;

type SlabRow = { key: number; min: string; discount: string };
let nextKey = 1;
const rowsFrom = (slabs: Slab[]): SlabRow[] => slabs.map(s => ({ key: nextKey++, min: String(s.minPercentage), discount: String(s.discountPercent) }));
const DEFAULT_SLABS: Slab[] = [{ minPercentage: 90, discountPercent: 50 }, { minPercentage: 75, discountPercent: 25 }, { minPercentage: 60, discountPercent: 10 }];

/** Create a Scholarship Test, or edit one (`test`). The window and duration of an existing test live on its exam. */
export function ScholarshipDialog({ open, onOpenChange, test, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test?: ScholarshipTest;
  onSaved: (test: ScholarshipTest) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
      {open && <ScholarshipForm test={test} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function ScholarshipForm({ test, onSaved, onClose }: { test?: ScholarshipTest; onSaved: (t: ScholarshipTest) => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const editing = !!test;
  const [title, setTitle] = useState(test?.title ?? "");
  const [description, setDescription] = useState(test?.description ?? "");
  const [grades, setGrades] = useState<string[]>(test?.eligible_grades ?? []);
  const [slabs, setSlabs] = useState<SlabRow[]>(rowsFrom(test?.slabs ?? DEFAULT_SLABS));
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [omr, setOmr] = useState(false);
  const [registrationClosesAt, setRegistrationClosesAt] = useState(toLocalInput(test?.registration_closes_at));
  const [validUntil, setValidUntil] = useState(test?.valid_until?.slice(0, 10) ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resultsOut = test?.status === "RESULTS_PUBLISHED";

  const parsed: Slab[] = slabs
    .filter(r => r.min.trim() !== "" && r.discount.trim() !== "")
    .map(r => ({ minPercentage: Number(r.min), discountPercent: Number(r.discount) }));
  const slabsValid = parsed.length === slabs.length && parsed.length > 0
    && parsed.every(s => Number.isFinite(s.minPercentage) && Number.isFinite(s.discountPercent) && s.minPercentage >= 0 && s.minPercentage <= 100 && s.discountPercent >= 0 && s.discountPercent <= 100)
    && new Set(parsed.map(s => s.minPercentage)).size === parsed.length;

  const toggleGrade = (g: string) => setGrades(cur => cur.includes(g) ? cur.filter(x => x !== g) : SCHOLARSHIP_GRADES.filter(x => x === g || cur.includes(x)));
  const setSlab = (key: number, field: "min" | "discount", value: string) => setSlabs(rows => rows.map(r => r.key === key ? { ...r, [field]: value } : r));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 3) return setError("Enter a title of at least 3 characters.");
    if (!slabsValid) return setError("Each slab needs a minimum score and a discount between 0 and 100, and no two slabs can start at the same score.");
    if (!editing) {
      if (!opensAt || !closesAt) return setError("Choose when the test opens and closes.");
      if (new Date(closesAt) <= new Date(opensAt)) return setError("The test must close after it opens.");
      const d = Number(duration);
      if (!Number.isInteger(d) || d < 5 || d > 600) return setError("Duration must be 5 to 600 minutes.");
    }
    setBusy(true);
    setError("");
    try {
      let saved: ScholarshipTest;
      if (!test) {
        saved = await withToken(token => scholarshipsApi.create(token, {
          title: title.trim(),
          description: description.trim() || undefined,
          eligibleGrades: grades,
          slabs: parsed,
          opensAt: fromLocalInput(opensAt)!,
          closesAt: fromLocalInput(closesAt)!,
          durationMinutes: Number(duration),
          omr: omr || undefined,
          registrationClosesAt: fromLocalInput(registrationClosesAt) ?? undefined,
          validUntil: validUntil || undefined,
        }));
        toast.success("Scholarship test created. Next, build the paper.");
      } else {
        const patch: UpdateScholarshipInput = {};
        if (title.trim() !== test.title) patch.title = title.trim();
        if ((description.trim() || null) !== (test.description ?? null)) patch.description = description.trim() || null;
        if (grades.join(",") !== test.eligible_grades.join(",")) patch.eligibleGrades = grades;
        if (!resultsOut && slabSentence(parsed) !== slabSentence(test.slabs)) patch.slabs = parsed;
        if (toLocalInput(fromLocalInput(registrationClosesAt)) !== toLocalInput(test.registration_closes_at)) patch.registrationClosesAt = fromLocalInput(registrationClosesAt);
        if ((validUntil || null) !== (test.valid_until?.slice(0, 10) ?? null)) patch.validUntil = validUntil || null;
        saved = Object.keys(patch).length ? await withToken(token => scholarshipsApi.update(token, test.id, patch)) : test;
        toast.success("Changes saved");
      }
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the scholarship test."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{editing ? "Edit scholarship test" : "New scholarship test"}</DialogTitle>
      <DialogDescription>{editing
        ? "The test window, duration and paper are set on the test itself."
        : "Creates the test, its candidates list and an empty paper. Build the paper next, then open registration."}</DialogDescription>
    </DialogHeader>

    <Field id="sch-title" label="Title">
      <Input id="sch-title" required minLength={3} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="EduPulse Scholarship Test 2027" />
    </Field>
    <Field id="sch-desc" label={<>Details for students <Optional /></>} hint="Shown in the website dialog and the student portal: syllabus, who can apply, what to bring.">
      <Textarea id="sch-desc" maxLength={5000} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
    </Field>

    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">Who can register <span className="font-normal text-muted-foreground">(none selected = any class)</span></legend>
      <div className="flex flex-wrap gap-2">
        {SCHOLARSHIP_GRADES.map(g => {
          const on = grades.includes(g);
          return <Button key={g} type="button" size="sm" variant="outline" aria-pressed={on} onClick={() => toggleGrade(g)}
            className={cn("rounded-full", on && "border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}>{g}</Button>;
        })}
      </div>
    </fieldset>

    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Scholarship slabs</legend>
      {resultsOut && <p className="text-xs text-muted-foreground">Results are published, so the slabs can no longer change.</p>}
      <ul className="grid gap-2">
        {slabs.map((r, i) => <li key={r.key} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Score ≥</span>
          <Input aria-label={`Slab ${i + 1} minimum score`} inputMode="decimal" className="w-20" value={r.min} onChange={e => setSlab(r.key, "min", e.target.value)} disabled={resultsOut} />
          <span className="text-muted-foreground">% gets</span>
          <Input aria-label={`Slab ${i + 1} discount`} inputMode="decimal" className="w-20" value={r.discount} onChange={e => setSlab(r.key, "discount", e.target.value)} disabled={resultsOut} />
          <span className="text-muted-foreground">% off course fees</span>
          {slabs.length > 1 && !resultsOut && <Button type="button" variant="ghost" size="icon" aria-label={`Remove slab ${i + 1}`} onClick={() => setSlabs(rows => rows.filter(x => x.key !== r.key))}
            className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>}
        </li>)}
      </ul>
      {!resultsOut && slabs.length < 10 && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setSlabs(rows => [...rows, { key: nextKey++, min: "", discount: "" }])}><Plus /> Add slab</Button>}
      <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        {slabsValid ? <>Students who score {slabSentence(parsed)}. Below the lowest slab: no scholarship. You can still change any student&apos;s award by hand before publishing.</> : "Fill in every slab to see the rule."}
      </p>
    </fieldset>

    {editing
      ? <p className="text-sm text-muted-foreground">
        Test window and duration: change them on the test paper. <Button asChild variant="link" className="h-auto p-0"><Link href={`/admin/exams/${test.exam_id}`}>Open the test <ExternalLink /></Link></Button>
      </p>
      : <>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="sch-opens" label="Test opens"><Input id="sch-opens" type="datetime-local" required value={opensAt} onChange={e => setOpensAt(e.target.value)} /></Field>
          <Field id="sch-closes" label="Test closes"><Input id="sch-closes" type="datetime-local" required value={closesAt} onChange={e => setClosesAt(e.target.value)} /></Field>
          <Field id="sch-duration" label="Duration (minutes)"><Input id="sch-duration" type="number" inputMode="numeric" min={5} max={600} required value={duration} onChange={e => setDuration(e.target.value)} /></Field>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">Times are in your device&apos;s time zone (India time for the academy). Each student gets the full duration, but no later than the closing time.</p>
        <div className="flex items-start gap-2">
          <Checkbox id="sch-omr" checked={omr} onCheckedChange={v => setOmr(v === true)} className="mt-0.5" />
          <Label htmlFor="sch-omr" className="grid gap-0.5 font-normal">OMR answer sheet<span className="text-xs text-muted-foreground">Students see the whole paper and fill bubbles, like the real AISSEE.</span></Label>
        </div>
      </>}

    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="sch-reg" label={<>Registration closes <Optional /></>} hint="Empty: open until the test closes.">
        <Input id="sch-reg" type="datetime-local" value={registrationClosesAt} onChange={e => setRegistrationClosesAt(e.target.value)} />
      </Field>
      <Field id="sch-valid" label={<>Scholarship valid until <Optional /></>} hint="Last day an award can be applied to a fee invoice.">
        <Input id="sch-valid" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
      </Field>
    </div>

    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{editing ? "Save changes" : "Create test"}</Button>
    </DialogFooter>
  </form>;
}
