"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Check, GraduationCap, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import type { AdminUser } from "@/lib/admin-api";
import { ENQUIRY_STATUSES, enquiriesApi, type Enquiry, type EnquiryStatus, type UpdateEnquiryInput } from "@/lib/admin-ops-api";
import { errorText, formatDate, titleCase } from "../ui";
import { ConvertDialog } from "./convert-dialog";
import { ContactButtons, SourcePill, STATUS_HELP, StatusPill } from "./enquiry-bits";

const UNASSIGNED = "none";

export function EnquirySheet({ enquiry, staff, onOpenChange, onChanged }: {
  enquiry: Enquiry | null;
  staff: AdminUser[];
  onOpenChange: (open: boolean) => void;
  onChanged: (enquiry: Enquiry) => void;
}) {
  return <Sheet open={!!enquiry} onOpenChange={onOpenChange}>
    <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
      {enquiry && <EnquiryDetail key={enquiry.id} enquiry={enquiry} staff={staff} onChanged={onChanged} />}
    </SheetContent>
  </Sheet>;
}

function EnquiryDetail({ enquiry, staff, onChanged }: { enquiry: Enquiry; staff: AdminUser[]; onChanged: (enquiry: Enquiry) => void }) {
  const { withToken } = useAuth();
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

      <section className="grid gap-2">
        <h3 className="text-sm font-medium" id="assign-label">Assigned to</h3>
        <Select value={enquiry.assigned_to === null ? UNASSIGNED : String(enquiry.assigned_to)} onValueChange={assign} disabled={saving === "assign"}>
          <SelectTrigger className="w-full" aria-labelledby="assign-label"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {assigneeMissing && <SelectItem value={String(enquiry.users!.id)}>{enquiry.users!.full_name}</SelectItem>}
            {staff.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.full_name}{s.roles.includes("ADMIN") ? " (admin)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </section>

      <Separator />

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Course</dt>
        <dd className="min-w-0 break-words">{enquiry.courses ? `${enquiry.courses.title} (${enquiry.courses.code})` : "Not chosen"}</dd>
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

      <section className="grid gap-2">
        {enquiry.status === "CONVERTED"
          ? <p className="text-sm text-muted-foreground">This enquiry is converted. Find the student under <Link href="/admin/users?role=STUDENT" className="text-primary hover:underline">Users</Link>, or create another account below.</p>
          : <p className="text-sm text-muted-foreground">Ready to enrol? Create their student account; the enquiry is marked converted.</p>}
        <Button variant={enquiry.status === "CONVERTED" ? "outline" : "default"} onClick={() => setConverting(true)}><GraduationCap /> Convert to student</Button>
      </section>
    </div>

    <ConvertDialog enquiry={enquiry} open={converting} onOpenChange={setConverting} onConverted={onChanged} />
  </>;
}
