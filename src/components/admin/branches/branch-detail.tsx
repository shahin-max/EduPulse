"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Building2, CircleOff, Layers, Loader2, Mail, Pencil, Phone, Plus, RotateCcw, Search, UserMinus, UserPlus, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RowActions } from "@/components/portal/row-actions";
import { useAuth } from "@/lib/auth";
import { isHeadOffice } from "@/lib/api";
import { usersApi, type AdminUser } from "@/lib/admin-api";
import { branchesApi, coursesApi, type Branch, type BranchCourse, type BranchStaff, type BranchStaffRole } from "@/lib/admin-catalog-api";
import { cn } from "@/lib/utils";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, Field, formatDate, Pill, UserAvatar } from "../ui";
import { BranchFormDialog } from "./branch-dialogs";

type Tab = "staff" | "courses";

const ROLE_LABEL: Record<BranchStaffRole, string> = { ADMIN: "Branch admin", FACULTY: "Faculty" };
const ROLE_HELP: Record<BranchStaffRole, string> = {
  ADMIN: "Runs this branch in the admin portal: its batches, fees, enquiries and people. Head office adds and removes branch admins.",
  FACULTY: "Teaches at this branch, so it can be assigned to the branch's batches.",
};

const place = (b: Branch) => [b.address, b.city, b.state, b.pincode].filter(Boolean).join(", ");

/** One branch: its details, staff (branch admins and faculty) and the courses it offers. */
export default function BranchDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const headOffice = isHeadOffice(user);
  const { data: branch, error, loading, reload, setData } = useAdminData(token => branchesApi.get(token, id), `branch:${id}`);
  const [tab, setTab] = useState<Tab>("staff");
  const [editing, setEditing] = useState(false);

  const back = <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href="/admin/branches"><ArrowLeft /> All branches</Link></Button>;

  if (!Number.isInteger(id) || id < 1) return <>{back}<ErrorAlert title="Not found" message="This branch id is not valid." /></>;
  if (loading && !branch) return <>{back}<Card><CardContent className="grid gap-3"><Skeleton className="h-7 w-1/2" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-2/3" /></CardContent></Card></>;
  if (error && !branch) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!branch) return null;

  return <>
    {back}

    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Building2 className="size-6" /></span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{branch.name}</h1>
            <Pill value={branch.is_active ? "ACTIVE" : "INACTIVE"} tones={{ ACTIVE: "green", INACTIVE: "gray" }} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">{branch.code} · INV {branch.invoice_prefix} / RCT {branch.receipt_prefix}</p>
          {place(branch) && <p className="text-sm text-muted-foreground">{place(branch)}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {branch.phone && <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="size-4" />{branch.phone}</a>}
            {branch.email && <a href={`mailto:${branch.email}`} className="inline-flex min-w-0 items-center gap-1.5 break-all hover:text-foreground"><Mail className="size-4 shrink-0" />{branch.email}</a>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild><Link href={`/admin/batches?branchId=${branch.id}`}><Layers /> Batches ({branch._count.batches})</Link></Button>
          {headOffice && <Button onClick={() => setEditing(true)}><Pencil /> Edit</Button>}
        </div>
      </CardContent>
    </Card>

    {!branch.is_active && <ErrorAlert title="This branch is inactive" message="Its records are kept, but no new batches or staff can be added until head office activates it again." />}

    <Card className="gap-0 py-0">
      <div className="flex flex-wrap gap-1 border-b p-2" role="tablist" aria-label="Branch sections">
        {([["staff", "Staff", Users], ["courses", "Courses", BookOpen]] as const).map(([value, label, Icon]) =>
          <Button key={value} role="tab" aria-selected={tab === value} size="sm" variant={tab === value ? "secondary" : "ghost"} onClick={() => setTab(value)}>
            <Icon />{label}
          </Button>)}
      </div>
      {tab === "staff"
        ? <StaffPanel branch={branch} headOffice={headOffice} onCountChanged={n => setData({ ...branch, _count: { ...branch._count, branch_staff: n } })} />
        : <CoursesPanel branch={branch} headOffice={headOffice} />}
    </Card>

    {headOffice && <BranchFormDialog open={editing} onOpenChange={setEditing} branch={branch} onSaved={saved => setData({ ...branch, ...saved })} />}
  </>;
}

// ---------------------------------------------------------------- staff

function StaffPanel({ branch, headOffice, onCountChanged }: { branch: Branch; headOffice: boolean; onCountChanged: (count: number) => void }) {
  const { withToken } = useAuth();
  const { data, error, loading, reload, setData } = useAdminData(token => branchesApi.staff(token, branch.id), `branch-staff:${branch.id}`);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<BranchStaff | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (staff: BranchStaff[]) => { setData(staff); onCountChanged(staff.length); };

  async function remove(member: BranchStaff) {
    setBusy(true);
    try {
      await withToken(token => branchesApi.removeStaff(token, branch.id, member.user.id, member.role));
      update((data ?? []).filter(s => !(s.user.id === member.user.id && s.role === member.role)));
      toast.success(`${member.user.full_name} removed from ${branch.name}`);
      setRemoving(null);
    } catch (e) {
      toast.error(errorText(e, "Could not remove them from the branch."));
    } finally {
      setBusy(false);
    }
  }

  const addButton = <Button size="sm" onClick={() => setAdding(true)} disabled={!branch.is_active}><UserPlus /> Add staff</Button>;

  return <>
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <CardTitle>Staff</CardTitle>
      <CardDescription>{headOffice
        ? "Branch admins run this branch in the admin portal; faculty can be assigned to its batches."
        : "Faculty who teach here. Head office adds and removes branch admins."}</CardDescription>
      <CardAction>{addButton}</CardAction>
    </CardHeader>
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <div className="grid gap-3 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>}
      {data && data.length === 0 && <EmptyState icon={Users} title="No staff yet" description={headOffice ? "Add a branch admin to run this branch, and the faculty who teach here." : "Add the faculty who teach at this branch."} action={branch.is_active ? addButton : undefined} />}
      {data && data.length > 0 && <ul className="divide-y">
        {data.map(s => {
          const canRemove = s.role === "FACULTY" || headOffice;
          return <li key={`${s.user.id}:${s.role}`} className="flex items-center gap-3 px-4 py-3">
            <UserAvatar name={s.user.full_name} src={s.user.photo_url} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/users/${s.user.id}`} className="truncate font-medium hover:underline">{s.user.full_name}</Link>
                <Pill value={s.role} tones={{ ADMIN: "violet", FACULTY: "blue" }} label={ROLE_LABEL[s.role]} />
                {s.user.status !== "ACTIVE" && <Pill value={s.user.status} tones={{ PENDING: "amber", SUSPENDED: "orange", DISABLED: "red" }} />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{[s.user.email, s.user.mobile].filter(Boolean).join(" · ") || "No contact details"} · since {formatDate(s.assigned_at)}</p>
            </div>
            <RowActions label={`${s.user.full_name} (${ROLE_LABEL[s.role]})`} items={[
              canRemove
                ? { label: "Remove from branch", icon: UserMinus, onSelect: () => setRemoving(s), destructive: true, hint: s.role === "ADMIN" ? "Their admin access ends at once" : undefined }
                : { label: "Remove from branch", icon: UserMinus, disabled: true, hint: "Only head office can remove a branch admin" },
            ]} />
          </li>;
        })}
      </ul>}
    </CardContent>

    <AddStaffDialog open={adding} onOpenChange={setAdding} branch={branch} headOffice={headOffice} staff={data ?? []} onAdded={update} />

    <AlertDialog open={!!removing} onOpenChange={open => { if (!open && !busy) setRemoving(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {removing?.user.full_name} from {branch.name}?</AlertDialogTitle>
          <AlertDialogDescription>{removing?.role === "ADMIN"
            ? "They stop being an admin of this branch straight away. Their account is kept."
            : "They can no longer be assigned to this branch's batches. Existing batch assignments and their account are kept."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} className="bg-destructive text-white hover:bg-destructive/90"
            onClick={e => { e.preventDefault(); if (removing) void remove(removing); }}>
            {busy && <Loader2 className="animate-spin" />}Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

/** Why a user cannot take the role at this branch, or null when they can. Mirrors the API's checks. */
function blockedReason(u: AdminUser, role: BranchStaffRole, staff: BranchStaff[]): string | null {
  if (staff.some(s => s.user.id === u.id && s.role === role)) return role === "ADMIN" ? "Already a branch admin here" : "Already on the staff";
  if (role === "FACULTY" && !u.roles.includes("FACULTY")) return "Needs the Faculty role first";
  if (role === "ADMIN" && u.roles.includes("ADMIN")) return "Head office already runs every branch";
  if (role === "ADMIN" && u.roles.includes("STUDENT")) return "A student cannot be a branch admin";
  return null;
}

function AddStaffDialog({ open, onOpenChange, ...props }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch;
  headOffice: boolean;
  staff: BranchStaff[];
  onAdded: (staff: BranchStaff[]) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <AddStaffForm {...props} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function AddStaffForm({ branch, headOffice, staff, onAdded, onClose }: {
  branch: Branch;
  headOffice: boolean;
  staff: BranchStaff[];
  onAdded: (staff: BranchStaff[]) => void;
  onClose: () => void;
}) {
  const { withToken } = useAuth();
  const [role, setRole] = useState<BranchStaffRole>("FACULTY");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Faculty must hold the FACULTY role; a branch admin can be anyone active who is not a student or head office.
  const results = useAdminData(
    token => search.length < 2 ? Promise.resolve(null) : usersApi.list(token, { search, status: "ACTIVE", role: role === "FACULTY" ? "FACULTY" : undefined, limit: 10 }).then(r => r.data),
    `staff-search:${role}:${search}`,
  );

  async function add(u: AdminUser) {
    setPending(u.id);
    setError("");
    try {
      const updated = await withToken(token => branchesApi.addStaff(token, branch.id, u.id, role));
      onAdded(updated);
      toast.success(`${u.full_name} added as ${ROLE_LABEL[role].toLowerCase()}`);
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not add them to the branch."));
    } finally {
      setPending(null);
    }
  }

  return <div className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Add staff to {branch.name}</DialogTitle>
      <DialogDescription>Find an existing account. To add someone new, create their account under Users first{headOffice ? "" : " (new faculty join your branch automatically)"}.</DialogDescription>
    </DialogHeader>
    {headOffice && <Field id="staff-role" label="Role" hint={ROLE_HELP[role]}>
      <Select value={role} onValueChange={v => setRole(v as BranchStaffRole)}>
        <SelectTrigger id="staff-role" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="FACULTY">{ROLE_LABEL.FACULTY}</SelectItem>
          <SelectItem value="ADMIN">{ROLE_LABEL.ADMIN}</SelectItem>
        </SelectContent>
      </Select>
    </Field>}
    <Field id="staff-search" label="Search people" hint={role === "FACULTY" ? "Only accounts with the Faculty role are listed." : undefined}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="staff-search" type="search" autoFocus placeholder="Name, email or mobile" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" autoComplete="off" />
      </div>
    </Field>
    <div className="min-h-24">
      {search.length < 2 ? <p className="text-sm text-muted-foreground">Type at least 2 characters.</p>
        : results.error ? <ErrorAlert message={results.error} onRetry={results.reload} />
        : results.loading && !results.data ? <div className="grid gap-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-11" />)}</div>
        : !results.data?.length ? <p className="text-sm text-muted-foreground">No one matches “{search}”.</p>
        : <ul className={cn("-mx-2 grid", results.loading && "opacity-60")}>
          {results.data.map(u => {
            const reason = blockedReason(u, role, staff);
            return <li key={u.id} className="flex items-center gap-3 rounded-md p-2">
              <UserAvatar name={u.full_name} src={u.photo_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{reason ?? (u.email ?? u.mobile)}</p>
              </div>
              <Button size="sm" variant="outline" disabled={!!reason || pending !== null} onClick={() => void add(u)}>
                {pending === u.id ? <Loader2 className="animate-spin" /> : <Plus />}Add
              </Button>
            </li>;
          })}
        </ul>}
    </div>
    {error && <ErrorAlert title="Could not add" message={error} />}
    <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
  </div>;
}

// ---------------------------------------------------------------- courses

function CoursesPanel({ branch, headOffice }: { branch: Branch; headOffice: boolean }) {
  const { withToken } = useAuth();
  const { data, error, loading, reload, setData } = useAdminData(token => branchesApi.courses(token, branch.id), `branch-courses:${branch.id}`);
  const [offering, setOffering] = useState(false);
  const [withdrawing, setWithdrawing] = useState<BranchCourse | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  async function offer(courseId: number, title: string) {
    setPending(courseId);
    try {
      const updated = await withToken(token => branchesApi.offerCourse(token, branch.id, courseId));
      setData(updated);
      toast.success(`${title} is offered at ${branch.name}`);
      return true;
    } catch (e) {
      toast.error(errorText(e, "Could not offer the course."));
      return false;
    } finally {
      setPending(null);
    }
  }

  async function withdraw(item: BranchCourse) {
    setPending(item.course.id);
    try {
      await withToken(token => branchesApi.withdrawCourse(token, branch.id, item.course.id));
      setData((data ?? []).map(c => c.course.id === item.course.id ? { ...c, is_active: false } : c));
      toast.success(`${item.course.title} withdrawn from ${branch.name}`);
      setWithdrawing(null);
    } catch (e) {
      toast.error(errorText(e, "Could not withdraw the course."));
    } finally {
      setPending(null);
    }
  }

  const offerButton = headOffice && <Button size="sm" onClick={() => setOffering(true)}><Plus /> Offer course</Button>;

  return <>
    <CardHeader className="border-b py-4 [.border-b]:pb-4">
      <CardTitle>Courses offered</CardTitle>
      <CardDescription>Batches can be opened here only for these courses.{headOffice ? " Withdrawing one stops new batches; running batches carry on." : " Head office decides which courses a branch offers."}</CardDescription>
      {offerButton && <CardAction>{offerButton}</CardAction>}
    </CardHeader>
    <CardContent className="p-0">
      {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
      {!data && loading && <div className="grid gap-3 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>}
      {data && data.length === 0 && <EmptyState icon={BookOpen} title="No courses offered yet"
        description={headOffice ? "Offer a course so this branch can open batches for it." : "Ask head office to offer courses at this branch."} action={offerButton || undefined} />}
      {data && data.length > 0 && <ul className="divide-y">
        {data.map(c => <li key={c.course.id} className={cn("flex items-center gap-3 px-4 py-3", !c.is_active && "text-muted-foreground")}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{c.course.title}</p>
              {!c.is_active && <Pill value="WITHDRAWN" tones={{ WITHDRAWN: "gray" }} />}
              {c.course.status !== "PUBLISHED" && <Pill value={c.course.status} tones={{ DRAFT: "amber", ARCHIVED: "gray" }} />}
            </div>
            <p className="truncate font-mono text-xs text-muted-foreground">{c.course.code} · offered since {formatDate(c.added_at)}</p>
          </div>
          {headOffice && <RowActions label={c.course.title} busy={pending === c.course.id} items={[
            c.is_active
              ? { label: "Withdraw", icon: CircleOff, onSelect: () => setWithdrawing(c), destructive: true, hint: "No new batches; running ones carry on" }
              : { label: "Offer again", icon: RotateCcw, onSelect: () => void offer(c.course.id, c.course.title), disabled: c.course.status === "ARCHIVED", hint: c.course.status === "ARCHIVED" ? "The course is archived" : undefined },
          ]} />}
        </li>)}
      </ul>}
    </CardContent>

    {headOffice && <OfferCourseDialog open={offering} onOpenChange={setOffering} offered={(data ?? []).filter(c => c.is_active).map(c => c.course.id)}
      busy={pending !== null} onOffer={offer} />}

    <AlertDialog open={!!withdrawing} onOpenChange={open => { if (!open && pending === null) setWithdrawing(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw {withdrawing?.course.title} from {branch.name}?</AlertDialogTitle>
          <AlertDialogDescription>No new batches of this course can be opened here. Running batches, their students and fees are not affected, and you can offer it again later.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending !== null}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending !== null} className="bg-destructive text-white hover:bg-destructive/90"
            onClick={e => { e.preventDefault(); if (withdrawing) void withdraw(withdrawing); }}>
            {pending !== null && <Loader2 className="animate-spin" />}Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function OfferCourseDialog({ open, onOpenChange, offered, busy, onOffer }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offered: number[];
  busy: boolean;
  onOffer: (courseId: number, title: string) => Promise<boolean>;
}) {
  const courses = useAdminData(token => open ? coursesApi.list(token) : Promise.resolve(null), `offer-courses:${open}`);
  const [courseId, setCourseId] = useState("");
  const options = (courses.data ?? []).filter(c => c.status !== "ARCHIVED" && !offered.includes(c.id));
  const chosen = options.find(c => String(c.id) === courseId);

  return <Dialog open={open} onOpenChange={next => { onOpenChange(next); if (!next) setCourseId(""); }}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Offer a course</DialogTitle>
        <DialogDescription>The branch&apos;s admins can then open batches for it.</DialogDescription>
      </DialogHeader>
      {courses.error && <ErrorAlert message={courses.error} onRetry={courses.reload} />}
      <Field id="offer-course" label="Course" hint={courses.data && !options.length ? "Every active course is already offered here." : undefined}>
        <Select value={courseId} onValueChange={setCourseId} disabled={!courses.data || !options.length}>
          <SelectTrigger id="offer-course" className="w-full [&>span]:truncate"><SelectValue placeholder={courses.loading ? "Loading…" : "Choose a course"} /></SelectTrigger>
          <SelectContent>{options.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.title} ({c.code}){c.status === "DRAFT" ? " · draft" : ""}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button disabled={!chosen || busy} onClick={async () => {
          if (chosen && await onOffer(chosen.id, chosen.title)) { onOpenChange(false); setCourseId(""); }
        }}>{busy && <Loader2 className="animate-spin" />}Offer course</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
