"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Eye, EyeOff, KeyRound, Loader2, Mail, Pencil, Phone, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, request } from "@/lib/api";
import { json } from "@/lib/admin-api";
import { useAuth } from "@/lib/auth";
import { accountApi, photoApi, PASSWORD_HINT, PASSWORD_RULE, type FacultySelfInput, type MyFacultyProfile } from "@/lib/account-api";
import { useAdminData } from "@/components/admin/use-admin-data";
import { ErrorAlert, errorText, Field, formatDate, Optional, RoleBadges } from "@/components/admin/ui";
import { PhotoField } from "./photo-field";
import { StudentProfileCard } from "@/components/student/student-profile-card";
import { usePortal } from "./portal-shell";

/** "My account" in both portals: sign-in details, the teaching profile (faculty) and password change. */
export default function AccountPage() {
  const { user, setCurrentUser } = useAuth();
  const { base } = usePortal();
  if (!user) return null;
  const isAdmin = user.roles.includes("ADMIN");
  const isFaculty = user.roles.includes("FACULTY");

  return <>
    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <PhotoField name={user.full_name} photoUrl={user.photo_url} upload={photoApi.setMine} remove={photoApi.removeMine} onChanged={setCurrentUser} />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{user.full_name}</h1>
          <RoleBadges roles={user.roles} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {user.email && <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5 break-all"><Mail className="size-4 shrink-0" />{user.email}<EmailVerification verified={!!user.email_verified_at} /></span>}
            {user.mobile && <span className="inline-flex items-center gap-1.5 tabular-nums"><Phone className="size-4 shrink-0" />{user.mobile}</span>}
          </div>
        </div>
        {isAdmin && base === "/admin" && <Button variant="outline" asChild><Link href={`/admin/users/${user.id}`}><Pencil /> Edit name and contact</Link></Button>}
      </CardContent>
      {!isAdmin && <CardFooter className="text-sm text-muted-foreground">To change your name, email or mobile number, ask the academy office.</CardFooter>}
    </Card>

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {isFaculty && <TeachingProfile />}
      {user.roles.includes("STUDENT") && base === "/student" && <StudentProfileCard />}
      <PasswordCard />
    </div>
  </>;
}

function TeachingProfile() {
  const { data, error, loading, reload, setData } = useAdminData(accountApi.myFacultyProfile, "faculty-me");
  const [editing, setEditing] = useState(false);

  // An account given the FACULTY role without a profile row: the API answers 404.
  const missing = error && /not found/i.test(error);

  return <Card className="lg:row-span-2">
    <CardHeader>
      <CardTitle>Teaching profile</CardTitle>
      <CardDescription>Your qualification and an introduction. Once you add them, the academy website shows them, with your photo, on the Faculty page.</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-5">
      {loading && !data && <div className="grid gap-3"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-20 w-full" /></div>}
      {missing && <p className="text-sm text-muted-foreground">Your account has no teaching profile yet. Ask an admin to set one up.</p>}
      {error && !missing && <ErrorAlert message={error} onRetry={reload} />}
      {data && (editing
        ? <ProfileForm profile={data} onSaved={p => { setData(p); setEditing(false); }} onCancel={() => setEditing(false)} />
        : <ProfileView profile={data} onEdit={() => setEditing(true)} />)}
    </CardContent>
  </Card>;
}

function ProfileView({ profile, onEdit }: { profile: MyFacultyProfile; onEdit: () => void }) {
  // One row per batch, listing the subjects taught in it.
  const batches = new Map<number, { batch: MyFacultyProfile["batch_faculty"][number]["batches"]; subjects: string[] }>();
  for (const { batches: batch, subjects } of profile.batch_faculty) {
    const entry = batches.get(batch.id) ?? { batch, subjects: [] };
    entry.subjects.push(subjects.name);
    batches.set(batch.id, entry);
  }
  const empty = <span className="text-muted-foreground">Not added</span>;

  return <>
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
      <dt className="text-muted-foreground">Qualification</dt>
      <dd className="min-w-0 break-words">{profile.qualification || empty}</dd>
      <dt className="text-muted-foreground">Specialization</dt>
      <dd className="min-w-0 break-words">{profile.specialization || empty}</dd>
      <dt className="text-muted-foreground">Employee code</dt>
      <dd>{profile.employee_code || <span className="text-muted-foreground">—</span>}</dd>
      <dt className="text-muted-foreground">Joined</dt>
      <dd>{profile.joined_on ? formatDate(profile.joined_on) : <span className="text-muted-foreground">—</span>}</dd>
    </dl>
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">About me</h3>
      {profile.biography
        ? <p className="rounded-md border bg-muted/40 p-3 text-sm break-words whitespace-pre-wrap">{profile.biography}</p>
        : <p className="text-sm text-muted-foreground">No introduction yet. Add a few lines about your teaching experience.</p>}
    </section>
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">Batches I teach</h3>
      {batches.size === 0
        ? <p className="text-sm text-muted-foreground">You are not assigned to any batch yet.</p>
        : <ul className="grid gap-2">
          {[...batches.values()].map(({ batch, subjects }) => <li key={batch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{batch.name} <span className="font-normal text-muted-foreground">({batch.code})</span></span>
              <span className="block text-muted-foreground">{subjects.join(", ")}</span>
            </span>
            {batch.status !== "ACTIVE" && <Badge variant="outline">{batch.status[0] + batch.status.slice(1).toLowerCase()}</Badge>}
          </li>)}
        </ul>}
    </section>
    <p className="text-xs text-muted-foreground">Employee code, joining date and batch assignments are managed by the academy office.</p>
    <div><Button onClick={onEdit}><Pencil /> Edit profile</Button></div>
  </>;
}

function ProfileForm({ profile, onSaved, onCancel }: { profile: MyFacultyProfile; onSaved: (p: MyFacultyProfile) => void; onCancel: () => void }) {
  const { withToken } = useAuth();
  const [qualification, setQualification] = useState(profile.qualification ?? "");
  const [specialization, setSpecialization] = useState(profile.specialization ?? "");
  const [biography, setBiography] = useState(profile.biography ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Only send what changed.
    const patch: FacultySelfInput = {};
    if (qualification.trim() !== (profile.qualification ?? "")) patch.qualification = qualification.trim();
    if (specialization.trim() !== (profile.specialization ?? "")) patch.specialization = specialization.trim();
    if (biography !== (profile.biography ?? "")) patch.biography = biography;
    if (!Object.keys(patch).length) return onCancel();
    setSaving(true);
    setError("");
    try {
      onSaved(await withToken(token => accountApi.updateMyFacultyProfile(token, patch)));
      toast.success("Profile saved");
    } catch (e) {
      setError(errorText(e, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <Field id="fp-qualification" label={<>Qualification <Optional /></>}>
      <Input id="fp-qualification" maxLength={255} value={qualification} onChange={e => setQualification(e.target.value)} placeholder="M.Sc. Physics, B.Ed." />
    </Field>
    <Field id="fp-specialization" label={<>Specialization <Optional /></>}>
      <Input id="fp-specialization" maxLength={255} value={specialization} onChange={e => setSpecialization(e.target.value)} placeholder="Mechanics and Electrodynamics for JEE" />
    </Field>
    <Field id="fp-bio" label={<>About me <Optional /></>} hint={`${biography.length.toLocaleString("en-IN")} / 5,000 characters. Line breaks are kept.`}>
      <Textarea id="fp-bio" maxLength={5000} rows={6} value={biography} onChange={e => setBiography(e.target.value)} className="max-h-[50svh]"
        placeholder="12 years teaching physics for JEE and NEET. I focus on problem solving and clear concepts." />
    </Field>
    {error && <ErrorAlert title="Could not save" message={error} />}
    <div className="flex flex-wrap gap-2">
      <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Save profile</Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
    </div>
  </form>;
}

function PasswordCard() {
  const { withToken } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return setError("Enter your current password.");
    if (!PASSWORD_RULE.test(next)) return setError(`The new password must be ${PASSWORD_HINT.charAt(0).toLowerCase()}${PASSWORD_HINT.slice(1)}`);
    if (next !== confirm) return setError("The two new passwords do not match.");
    if (next === current) return setError("Choose a password different from your current one.");
    setSaving(true);
    setError("");
    try {
      await withToken(token => accountApi.changePassword(token, current, next));
      setCurrent(""); setNext(""); setConfirm("");
      toast.success("Password changed. Your other devices have been signed out.");
    } catch (e) {
      // The API answers a wrong current password with 401. withToken then refreshes the session once and
      // retries; the retry's 401 lands here. (A truly expired session logs out instead.)
      setError(e instanceof ApiError && e.status === 401 ? "Your current password is incorrect." : errorText(e, "Could not change your password."));
    } finally {
      setSaving(false);
    }
  }

  const type = show ? "text" : "password";
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><KeyRound className="size-4" /> Change password</CardTitle>
      <CardDescription>You stay signed in here; every other device is signed out.</CardDescription>
    </CardHeader>
    <CardContent>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field id="pw-current" label="Current password">
          <Input id="pw-current" type={type} autoComplete="current-password" value={current} onChange={e => { setCurrent(e.target.value); setError(""); }} />
        </Field>
        <Field id="pw-new" label="New password" hint={PASSWORD_HINT}>
          <Input id="pw-new" type={type} autoComplete="new-password" maxLength={72} value={next} onChange={e => { setNext(e.target.value); setError(""); }} />
        </Field>
        <Field id="pw-confirm" label="Confirm new password">
          <Input id="pw-confirm" type={type} autoComplete="new-password" maxLength={72} value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} />
        </Field>
        {error && <ErrorAlert title="Password not changed" message={error} />}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />}Change password</Button>
          <Button type="button" variant="ghost" onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? <EyeOff /> : <Eye />}{show ? "Hide" : "Show"} passwords</Button>
        </div>
      </form>
    </CardContent>
  </Card>;
}

/**
 * "Verified", or a button that emails a verification link (POST /auth/verify/request). A verified email
 * is how people get back in when they forget their password. Mobile verification needs an SMS provider,
 * which is not connected yet, so it is not offered.
 */
function EmailVerification({ verified }: { verified: boolean }) {
  const { withToken } = useAuth();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  if (verified) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><BadgeCheck className="size-3.5" />Verified</span>;
  if (state === "sent") return <span className="text-xs text-muted-foreground">Link sent. Check your inbox (and spam folder).</span>;

  async function send() {
    setState("sending");
    try {
      await withToken(token => request("/auth/verify/request", { token, ...json("POST", { channel: "EMAIL" }) }));
      setState("sent");
    } catch (e) {
      setState("idle");
      toast.error(errorText(e, "Could not send the verification link."));
    }
  }

  return <span className="inline-flex items-center gap-1.5">
    <span className="text-xs text-amber-700 dark:text-amber-400">Not verified</span>
    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" disabled={state === "sending"} onClick={() => void send()}>
      {state === "sending" ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}Send verification link
    </Button>
  </span>;
}
