"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Check, GraduationCap, Loader2, Mail, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { AdminUser } from "@/lib/admin-api";
import type { BranchRef } from "@/lib/api";
import { ENQUIRY_STATUSES, enquiriesApi, type Enquiry, type EnquiryNote, type EnquiryStatus, type UpdateEnquiryInput } from "@/lib/admin-ops-api";
import { errorText, formatDate, titleCase } from "../ui";
import { useAdminData } from "../use-admin-data";
import { useIsAdmin } from "@/components/staff/use-staff";
import { ConvertDialog } from "./convert-dialog";
import { ContactButtons, SourcePill, STATUS_HELP, StatusPill } from "./enquiry-bits";

const UNASSIGNED = "none";

/** `branches`: where the enquiry can be moved (empty when the viewer cannot route enquiries). */
export function EnquirySheet({ enquiry, staff, onOpenChange, onChanged, branches = [] }: {
  enquiry: Enquiry | null;
  staff: AdminUser[];
  onOpenChange: (open: boolean) => void;
  onChanged: (enquiry: Enquiry) => void;
  branches?: BranchRef[];
}) {
  return <Sheet open={!!enquiry} onOpenChange={onOpenChange}>
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
      {enquiry && <EnquiryDetail key={enquiry.id} enquiry={enquiry} staff={staff} onChanged={onChanged} branches={branches} />}
    </SheetContent>
  </Sheet>;
}

function EnquiryDetail({ enquiry, staff, onChanged, branches }: { enquiry: Enquiry; staff: AdminUser[]; onChanged: (enquiry: Enquiry) => void; branches: BranchRef[] }) {
  const { withToken } = useAuth();
  // Faculty may only change the status of enquiries assigned to them; reassigning and converting are for admins.
  const admin = useIsAdmin();
  const [saving, setSaving] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  async function save(input: UpdateEnquiryInput, what: string, done: string) {
    setSaving(what);
    try {
      const updated = await withToken(token => enquiriesApi.update(token, enquiry.id, input));
      onChanged(updated);
      toast.success(done);
    } catch (e) {
      toast.error(errorText(e, "Could not update the enquiry."));
    } finally {
      setSaving(null);
    }
  }

  const setStatus = (status: EnquiryStatus) => {
    if (status !== enquiry.status) void save({ status }, status, `Marked ${titleCase(status).toLowerCase()}`);
  };
  const assign = (value: string) => {
    const assignedTo = value === UNASSIGNED ? null : Number(value);
    if (assignedTo === enquiry.assigned_to) return;
    const name = staff.find(s => s.id === assignedTo)?.full_name;
    void save({ assignedTo }, "assign", assignedTo === null ? "Unassigned" : `Assigned to ${name ?? "staff member"}`);
  };
  const route = (value: string) => {
    const branchId = Number(value);
    if (branchId === enquiry.branch_id) return;
    void save({ branchId }, "branch", `Moved to ${branches.find(b => b.id === branchId)?.name ?? "the branch"}`);
  };
  // The current assignee may be missing from the active staff list (e.g. since suspended).
  const assigneeMissing = enquiry.users && !staff.some(s => s.id === enquiry.users!.id);

  return <>
    <SheetHeader className="border-b pr-12">
      <div className="flex flex-wrap items-center gap-2"><StatusPill status={enquiry.status} /><SourcePill source={enquiry.source} /></div>
      <SheetTitle className="text-lg">{enquiry.student_name}</SheetTitle>
      <SheetDescription>Enquiry #{enquiry.id} · {formatDate(enquiry.created_at, true)}</SheetDescription>
    </SheetHeader>

    <div className="grid gap-5 p-4">
      <section className="grid gap-2">
        <p className="font-medium tabular-nums">{enquiry.mobile}</p>
        <div className="grid grid-cols-2 gap-2"><ContactButtons mobile={enquiry.mobile} name={enquiry.student_name} labels /></div>
        {enquiry.email && <a href={`mailto:${enquiry.email}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all"><Mail className="size-4 shrink-0" />{enquiry.email}</a>}
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Status</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Change status">
          {ENQUIRY_STATUSES.map(s => {
            const current = s === enquiry.status;
            return <Button key={s} size="sm" variant={current ? "default" : "outline"} disabled={!!saving} onClick={() => setStatus(s)}
              aria-pressed={current} title={STATUS_HELP[s]} className={cn("justify-start", current && "pointer-events-none")}>
              {saving === s ? <Loader2 className="animate-spin" /> : current ? <Check /> : null}{titleCase(s)}
            </Button>;
          })}
        </div>
        <p className="text-xs text-muted-foreground">{STATUS_HELP[enquiry.status]}. Last updated {formatDate(enquiry.updated_at, true)}.</p>
      </section>

      {admin && <section className="grid gap-2">
        <h3 className="text-sm font-medium" id="assign-label">Assigned to</h3>
        <Select value={enquiry.assigned_to === null ? UNASSIGNED : String(enquiry.assigned_to)} onValueChange={assign} disabled={saving === "assign"}>
          <SelectTrigger className="w-full" aria-labelledby="assign-label"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {assigneeMissing && <SelectItem value={String(enquiry.users!.id)}>{enquiry.users!.full_name}</SelectItem>}
            {staff.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.full_name}{s.roles.includes("ADMIN") ? " (admin)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </section>}

      {admin && branches.length > 0 && <section className="grid gap-2">
        <h3 className="text-sm font-medium" id="branch-label">Branch</h3>
        <Select value={enquiry.branch_id === null ? undefined : String(enquiry.branch_id)} onValueChange={route} disabled={saving === "branch"}>
          <SelectTrigger className="w-full" aria-labelledby="branch-label"><SelectValue placeholder="Not routed yet: choose a branch" /></SelectTrigger>
          <SelectContent>
            {enquiry.branches && !branches.some(b => b.id === enquiry.branches!.id) && <SelectItem value={String(enquiry.branches.id)}>{enquiry.branches.name}</SelectItem>}
            {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">The branch&apos;s admins see the enquiry and follow it up.</p>
      </section>}

      <Separator />

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Course</dt>
        <dd className="min-w-0 break-words">{enquiry.courses ? `${enquiry.courses.title} (${enquiry.courses.code})` : "Not chosen"}</dd>
        <dt className="text-muted-foreground">Branch</dt>
        <dd className="min-w-0 break-words">{enquiry.branches ? enquiry.branches.name : "Not routed yet"}</dd>
        <dt className="text-muted-foreground">Source</dt>
        <dd>{enquiry.source ? titleCase(enquiry.source) : "—"}</dd>
      </dl>

      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Message</h3>
        {enquiry.message
          ? <p className="rounded-md border bg-muted/40 p-3 text-sm break-words whitespace-pre-wrap">{enquiry.message}</p>
          : <p className="text-sm text-muted-foreground">No message.</p>}
      </section>

      <Separator />

      <CallNotes enquiry={enquiry} onChanged={onChanged} />

      <Separator />

      {admin ? <section className="grid gap-2">
        {enquiry.status === "CONVERTED"
          ? <p className="text-sm text-muted-foreground">This enquiry is converted. Find the student under <Link href="/admin/users?role=STUDENT" className="text-primary hover:underline">Users</Link>, or create another account below.</p>
          : <p className="text-sm text-muted-foreground">Ready to enrol? Create their student account; the enquiry is marked converted.</p>}
        <Button variant={enquiry.status === "CONVERTED" ? "outline" : "default"} onClick={() => setConverting(true)}><GraduationCap /> Convert to student</Button>
      </section>
        : <p className="text-sm text-muted-foreground">Ready to join? Tell the academy office so they can create the student account and enrol them, then mark this enquiry converted.</p>}
    </div>

    {admin && <ConvertDialog enquiry={enquiry} open={converting} onOpenChange={setConverting} onConverted={onChanged} />}
  </>;
}

/** "3 hours ago" for the last week, then the date. */
function when(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h ago`;
  if (diff < 7 * 86_400_000) return `${Math.round(diff / 86_400_000)} d ago`;
  return formatDate(iso, true);
}

/**
 * What happened on each call ("asked to call back Monday"), oldest first, by the admin or the
 * assigned teacher. The first note on a NEW enquiry makes the server mark it CONTACTED, so the
 * enquiry is refetched to update its status.
 */
function CallNotes({ enquiry, onChanged }: { enquiry: Enquiry; onChanged: (enquiry: Enquiry) => void }) {
  const { withToken } = useAuth();
  const { data, error, reload, setData } = useAdminData(token => enquiriesApi.notes(token, enquiry.id), `enquiry-notes:${enquiry.id}`);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const note = await withToken(token => enquiriesApi.addNote(token, enquiry.id, text));
      setData((current: EnquiryNote[] | null) => [...(current ?? []), note]);
      setBody("");
      toast.success("Note added");
      onChanged(await withToken(token => enquiriesApi.get(token, enquiry.id)));
    } catch (e) {
      toast.error(errorText(e, "Could not add the note."));
    } finally {
      setSaving(false);
    }
  }

  return <section className="grid gap-3">
    <h3 className="flex items-center gap-2 text-sm font-medium"><MessageSquareText className="size-4" /> Call notes {data && data.length > 0 && <span className="text-muted-foreground">({data.length})</span>}</h3>
    {error && <p className="text-sm text-destructive">{error} <button type="button" className="underline" onClick={reload}>Retry</button></p>}
    {!data && !error && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading notes…</p>}
    {data?.length === 0 && <p className="text-sm text-muted-foreground">No notes yet. Write down what happened after each call.</p>}
    {data && data.length > 0 && <ol className="grid gap-2">
      {data.map(n => <li key={n.id} className="rounded-md border bg-muted/30 p-3">
        <p className="text-sm break-words whitespace-pre-wrap">{n.body}</p>
        <p className="mt-1 text-xs text-muted-foreground" title={formatDate(n.created_at, true)}>{n.users?.full_name ?? "Former staff"} · {when(n.created_at)}</p>
      </li>)}
    </ol>}
    <form className="grid gap-2" onSubmit={e => { e.preventDefault(); void add(); }}>
      <label htmlFor={`note-${enquiry.id}`} className="sr-only">Add a call note</label>
      <Textarea id={`note-${enquiry.id}`} rows={3} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} disabled={saving}
        placeholder="Called; asked to call back on Monday after 5 pm."
        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void add(); } }} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{enquiry.status === "NEW" ? "Adding a note marks this enquiry contacted. " : ""}Ctrl+Enter to save.</span>
        <Button type="submit" size="sm" disabled={!body.trim() || saving}>{saving && <Loader2 className="animate-spin" />}Add note</Button>
      </div>
    </form>
  </section>;
}
