"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
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
import { isHeadOffice, type AccessRole, type RoleCode } from "@/lib/api";
import { passwordLink, ROLES, studentsApi, USER_STATUSES, usersApi, type AdminUser, type StudentProfile, type StudentProfileInput, type UpdateUserInput, type UserStatus } from "@/lib/admin-api";
import { useBranchScope } from "./branch-scope";
import { ErrorAlert, errorText, Field, Optional, titleCase } from "./ui";

const STATUS_HELP: Record<UserStatus, string> = {
  ACTIVE: "Can log in normally.",
  PENDING: "Has not set a password yet.",
  SUSPENDED: "Temporarily blocked and signed out everywhere.",
  DISABLED: "Blocked and signed out everywhere.",
};

/** Read-only field with a Copy button, for setup and reset links. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="flex gap-2">
    <Input readOnly value={value} aria-label={label} onFocus={e => e.target.select()} className="font-mono text-xs" />
    <Button type="button" variant="outline" className="shrink-0" onClick={async () => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Link copied");
      } catch {
        toast.error("Could not copy; select the link and copy it manually.");
      }
    }}>{copied ? <Check /> : <Copy />}<span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span></Button>
  </div>;
}

const NO_BRANCH = "none";

/** Branch admins create students and faculty only; head office any role. */
export const BRANCH_ADMIN_ROLES: RoleCode[] = ["FACULTY", "STUDENT"];

/** The stored roles of a user (the API also reports BRANCH_ADMIN, which is set on the branch, not here). */
const storedRoles = (roles: AccessRole[]) => roles.filter((r): r is RoleCode => r !== "BRANCH_ADMIN");

/** Roles that cannot be combined with running a branch (the API refuses them with adminBranchId). */
const NOT_WITH_BRANCH_ADMIN: RoleCode[] = ["ADMIN", "STUDENT"];

/**
 * The role checkboxes. `branchAdmin` (head office creating a user) adds a "Branch admin" choice: it can go with
 * Faculty but not with Admin or Student, so those are disabled while it is ticked and vice versa.
 */
function RolePicker({ value, onChange, lockAdmin, options = ROLES, branchAdmin }: {
  value: RoleCode[];
  onChange: (roles: RoleCode[]) => void;
  lockAdmin?: boolean;
  options?: RoleCode[];
  branchAdmin?: { checked: boolean; onChange: (checked: boolean) => void };
}) {
  const blocksBranchAdmin = value.some(r => NOT_WITH_BRANCH_ADMIN.includes(r));
  return <fieldset className="grid gap-2">
    <legend className="mb-2 text-sm font-medium">Roles</legend>
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {options.map(role => {
        const locked = (lockAdmin && role === "ADMIN") || (!!branchAdmin?.checked && NOT_WITH_BRANCH_ADMIN.includes(role));
        return <div key={role} className="flex items-center gap-2">
          <Checkbox id={`role-${role}`} checked={value.includes(role)} disabled={locked}
            onCheckedChange={checked => onChange(checked ? [...value, role] : value.filter(r => r !== role))} />
          <Label htmlFor={`role-${role}`} className="font-normal">{titleCase(role)}</Label>
        </div>;
      })}
      {branchAdmin && <div className="flex items-center gap-2">
        <Checkbox id="role-BRANCH_ADMIN" checked={branchAdmin.checked} disabled={blocksBranchAdmin} onCheckedChange={checked => branchAdmin.onChange(checked === true)} />
        <Label htmlFor="role-BRANCH_ADMIN" className="font-normal">Branch admin</Label>
      </div>}
    </div>
    <p className="text-xs text-muted-foreground">Adding Student or Faculty creates that profile.{lockAdmin && " You cannot remove your own Admin role."}
      {branchAdmin && " A branch admin runs one branch in the admin portal; they can also be Faculty, but not Admin or Student."}</p>
  </fieldset>;
}

/** Add a user, or edit one when `user` is given. */
export function UserFormDialog({ open, onOpenChange, user, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AdminUser;
  onSaved: (user: AdminUser) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {/* Mounted only while open, so the form starts fresh each time. */}
      {open && <UserForm user={user} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function UserForm({ user, onSaved, onClose }: { user?: AdminUser; onSaved: (user: AdminUser) => void; onClose: () => void }) {
  const { withToken, user: me } = useAuth();
  const isSelf = !!user && me?.id === user.id;
  // Branch admins create students and faculty, and cannot change roles (head office only).
  const headOffice = isHeadOffice(me);
  const scope = useBranchScope();
  const branchChoices = scope.branches.filter(b => b.is_active !== false);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<RoleCode[]>(user ? storedRoles(user.roles) : ["FACULTY"]);
  // Which branch a new faculty member joins: required for a branch admin with several branches, optional for head office.
  const [branchId, setBranchId] = useState(() => scope.branchId && branchChoices.some(b => b.id === scope.branchId) ? String(scope.branchId) : "");
  const askBranch = !user && roles.includes("FACULTY") && (headOffice ? branchChoices.length > 0 : branchChoices.length > 1);
  // Head office can make a new account the admin of one branch (an office manager, or someone who also teaches).
  const offerBranchAdmin = !user && headOffice;
  const [makeBranchAdmin, setMakeBranchAdmin] = useState(false);
  const [adminBranchId, setAdminBranchId] = useState("");
  const isBranchAdmin = offerBranchAdmin && makeBranchAdmin;
  const [status, setStatus] = useState<UserStatus>(user?.status ?? "ACTIVE");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ id: number; name: string; link?: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() && !mobile.trim()) return setError("Enter an email address or a mobile number.");
    if (roles.length === 0 && !isBranchAdmin) return setError("Choose at least one role.");
    if (isBranchAdmin && !adminBranchId) return setError("Choose the branch they will run.");
    if (askBranch && !headOffice && !branchId) return setError("Choose the branch they will teach at.");
    setBusy(true);
    setError("");
    try {
      if (!user) {
        const created = await withToken(token => usersApi.create(token, {
          fullName: fullName.trim(), email: email.trim() || undefined, mobile: mobile.trim() || undefined, password: password || undefined, roles,
          branchId: askBranch && branchId ? Number(branchId) : undefined,
          adminBranchId: isBranchAdmin ? Number(adminBranchId) : undefined,
        }));
        onSaved(created);
        toast.success(`${created.full_name} added`);
        setSetup({ id: created.id, name: created.full_name, link: created.setupToken && passwordLink(created.setupToken) });
        return;
      }
      // The API cannot remove an email or mobile; say so instead of silently keeping it.
      if ((user.email && !email.trim()) || (user.mobile && !mobile.trim())) {
        setError(`${user.email && !email.trim() ? "The email" : "The mobile number"} cannot be removed; enter a new one instead.`);
        return;
      }
      // Only send what changed: changing email or mobile clears its verification.
      const patch: UpdateUserInput = {};
      if (fullName.trim() !== user.full_name) patch.fullName = fullName.trim();
      if (email.trim() && email.trim() !== (user.email ?? "")) patch.email = email.trim();
      if (mobile.trim() && mobile.trim() !== (user.mobile ?? "")) patch.mobile = mobile.trim();
      if (status !== user.status) patch.status = status;
      const current = storedRoles(user.roles);
      const rolesChanged = headOffice && (roles.length !== current.length || roles.some(r => !current.includes(r)));
      let updated: AdminUser = user;
      if (Object.keys(patch).length) updated = await withToken(token => usersApi.update(token, user.id, patch));
      if (rolesChanged) updated = { ...updated, ...(await withToken(token => usersApi.setRoles(token, user.id, roles))) };
      onSaved(updated);
      toast.success("Changes saved");
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the user."));
    } finally {
      setBusy(false);
    }
  }

  if (setup) return <>
    <DialogHeader>
      <DialogTitle>User created</DialogTitle>
      <DialogDescription>{setup.name} has been added.</DialogDescription>
    </DialogHeader>
    {setup.link ? <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">No password was set, so the account is <strong className="text-foreground">pending</strong>. Send this one-time link so they can choose a password. It expires in 1 hour.</p>
      <CopyField value={setup.link} label="Password setup link" />
    </div> : <p className="text-sm text-muted-foreground">The account is active and can log in with the password you set.</p>}
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Done</Button>
      <Button asChild><Link href={`/admin/users/${setup.id}`} onClick={onClose}>View user</Link></Button>
    </DialogFooter>
  </>;

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>{user ? "Edit user" : "Add user"}</DialogTitle>
      <DialogDescription>{user
        ? headOffice ? "Update account details, status and roles." : "Update account details and status."
        : headOffice ? "Create an account for a student, faculty member or admin." : "Create an account for a student or faculty member."}</DialogDescription>
    </DialogHeader>
    <Field id="fullName" label="Full name">
      <Input id="fullName" required minLength={2} maxLength={160} value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="off" />
    </Field>
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="email" label="Email" hint={user && user.email && (user.email_verified_at ? "Verified" : "Not verified")}>
        <Input id="email" type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" />
      </Field>
      <Field id="mobile" label="Mobile" hint={user && user.mobile && (user.mobile_verified_at ? "Verified" : "Not verified")}>
        <Input id="mobile" type="tel" pattern="\+?[0-9 ]{10,20}" title="10-15 digit phone number" value={mobile} onChange={e => setMobile(e.target.value)} autoComplete="off" />
      </Field>
    </div>
    {(headOffice || !user) && <RolePicker value={roles} onChange={setRoles} lockAdmin={isSelf} options={headOffice ? ROLES : BRANCH_ADMIN_ROLES}
      branchAdmin={offerBranchAdmin ? { checked: makeBranchAdmin, onChange: setMakeBranchAdmin } : undefined} />}
    {isBranchAdmin && <Field id="user-admin-branch" label="Runs branch" hint="They sign in to the admin portal and see only this branch. Add more branches later on the branch page.">
      <Select value={adminBranchId} onValueChange={setAdminBranchId}>
        <SelectTrigger id="user-admin-branch" className="w-full"><SelectValue placeholder={branchChoices.length ? "Choose a branch" : "No active branches"} /></SelectTrigger>
        <SelectContent>{branchChoices.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
      </Select>
    </Field>}
    {askBranch && <Field id="user-branch" label={headOffice ? <>Teaches at <Optional /></> : "Teaches at"}
      hint={headOffice ? "Adds them to the branch staff. You can add more branches later on the branch page." : "They join this branch's staff."}>
      <Select value={branchId || (headOffice ? NO_BRANCH : "")} onValueChange={v => setBranchId(v === NO_BRANCH ? "" : v)}>
        <SelectTrigger id="user-branch" className="w-full"><SelectValue placeholder="Choose a branch" /></SelectTrigger>
        <SelectContent>
          {headOffice && <SelectItem value={NO_BRANCH}>Not now</SelectItem>}
          {branchChoices.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>}
    {user ? <Field id="status" label="Status" hint={isSelf ? "You cannot change your own status." : STATUS_HELP[status]}>
      <Select value={status} onValueChange={value => setStatus(value as UserStatus)} disabled={isSelf}>
        <SelectTrigger id="status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{USER_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}</SelectContent>
      </Select>
    </Field> : <Field id="password" label={<>Password <span className="font-normal text-muted-foreground">(optional)</span></>} hint="Leave empty to get a setup link the user opens to choose their own password.">
      <Input id="password" type="password" autoComplete="new-password" pattern="(?=.*[A-Za-z])(?=.*\d).{8,72}" title="At least 8 characters, with a letter and a number" value={password} onChange={e => setPassword(e.target.value)} />
    </Field>}
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}{user ? "Save changes" : "Create user"}</Button>
    </DialogFooter>
  </form>;
}

export function DeleteUserDialog({ user, open, onOpenChange, onDeleted }: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (user: AdminUser) => void;
}) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function remove(event: React.MouseEvent) {
    event.preventDefault(); // keep the dialog open until the request finishes
    if (!user) return;
    setBusy(true);
    try {
      await withToken(token => usersApi.remove(token, user.id));
      toast.success(`${user.full_name} deleted`);
      onOpenChange(false);
      onDeleted(user);
    } catch (e) {
      toast.error(errorText(e, "Could not delete the user."));
    } finally {
      setBusy(false);
    }
  }
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete {user?.full_name}?</AlertDialogTitle>
        <AlertDialogDescription>They will be signed out and can no longer log in. Their history (attendance, results, fees) is kept, and the account stays visible under “Show deleted”.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={remove} disabled={busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete user</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

export function PasswordLinkDialog({ user, open, onOpenChange }: { user: AdminUser; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { withToken } = useAuth();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await withToken(token => usersApi.passwordToken(token, user.id));
      setLink(passwordLink(result.token));
    } catch (e) {
      setError(errorText(e, "Could not create the link."));
    } finally {
      setBusy(false);
    }
  }
  return <Dialog open={open} onOpenChange={next => { onOpenChange(next); if (!next) { setLink(""); setError(""); } }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Password link</DialogTitle>
        <DialogDescription>Create a one-time link (valid for 1 hour) for {user.full_name} to set a new password. Using it activates a pending account and signs them out everywhere.</DialogDescription>
      </DialogHeader>
      {error && <ErrorAlert title="Could not create link" message={error} />}
      {link && <CopyField value={link} label="Password link" />}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        {!link && <Button onClick={generate} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <KeyRound />}Create link</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

const PROFILE_FIELDS: { key: keyof StudentProfileInput; column: keyof StudentProfile; label: string; type?: string; maxLength?: number; minLength?: number; pattern?: string; title?: string }[] = [
  { key: "admissionNumber", column: "admission_number", label: "Admission no.", maxLength: 40 },
  { key: "grade", column: "grade", label: "Class / grade", maxLength: 30 },
  { key: "schoolName", column: "school_name", label: "School", minLength: 2, maxLength: 160 },
  { key: "dateOfBirth", column: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "guardianName", column: "guardian_name", label: "Guardian", minLength: 2, maxLength: 160 },
  { key: "guardianMobile", column: "guardian_mobile", label: "Guardian mobile", type: "tel", pattern: "\+?[0-9 \-]{10,20}", title: "10-15 digit phone number" },
  { key: "joinedOn", column: "joined_on", label: "Joined on", type: "date" },
  { key: "address", column: "address", label: "Address", maxLength: 2000 },
];

/** Edit a student's profile (class, school, guardian...). The API cannot clear a field, so only changed, non-empty values are sent. */
export function StudentProfileDialog({ userId, profile, open, onOpenChange, onSaved }: {
  userId: number;
  profile: StudentProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      {open && <StudentProfileForm userId={userId} profile={profile} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>;
}

function StudentProfileForm({ userId, profile, onSaved, onClose }: { userId: number; profile: StudentProfile; onSaved: () => void; onClose: () => void }) {
  const { withToken } = useAuth();
  const initial = (column: keyof StudentProfile, type?: string) => {
    const value = profile[column] ?? "";
    return type === "date" ? value.slice(0, 10) : value;
  };
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(PROFILE_FIELDS.map(f => [f.key, initial(f.column, f.type)])));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patch: StudentProfileInput = {};
    for (const f of PROFILE_FIELDS) {
      const value = values[f.key].trim();
      if (value === initial(f.column, f.type)) continue;
      if (!value) return setError(`${f.label} cannot be removed once saved; enter a new value instead.`);
      patch[f.key] = f.key === "guardianMobile" ? value.replace(/[\s-]/g, "") : value;
    }
    if (!Object.keys(patch).length) return onClose();
    setBusy(true);
    setError("");
    try {
      await withToken(token => studentsApi.updateProfile(token, userId, patch));
      toast.success("Student details saved");
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e, "Could not save the student details."));
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <DialogHeader>
      <DialogTitle>Student details</DialogTitle>
      <DialogDescription>Class, school, guardian and admission details.</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      {PROFILE_FIELDS.map(f => <Field key={f.key} id={`sp-${f.key}`} label={f.label} className={f.key === "address" ? "sm:col-span-2" : undefined}>
        <Input id={`sp-${f.key}`} type={f.type ?? "text"} maxLength={f.maxLength} minLength={f.minLength} pattern={f.pattern} title={f.title}
          max={f.key === "dateOfBirth" ? new Date().toISOString().slice(0, 10) : undefined}
          value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} autoComplete="off" />
      </Field>)}
    </div>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save details</Button>
    </DialogFooter>
  </form>;
}
