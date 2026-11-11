"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, CalendarClock, Clock, KeyRound, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { usersApi } from "@/lib/admin-api";
import { useAdminData } from "./use-admin-data";
import { DeleteUserDialog, PasswordLinkDialog, UserFormDialog } from "./user-dialogs";
import { ErrorAlert, formatDate, RoleBadges, StatusBadge, UserAvatar } from "./ui";

export default function UserDetail({ id }: { id: number }) {
  const router = useRouter();
  const { user: me } = useAuth();
  const { data: user, error, loading, reload, setData } = useAdminData(token => usersApi.get(token, id), String(id));
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linking, setLinking] = useState(false);

  const back = <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground"><Link href="/admin/users"><ArrowLeft /> All users</Link></Button>;

  if (!Number.isInteger(id) || id < 1) return <>{back}<ErrorAlert title="Not found" message="This user id is not valid." /></>;
  if (loading && !user) return <>{back}<DetailSkeleton /></>;
  if (error && !user) return <>{back}<ErrorAlert message={error} onRetry={reload} /></>;
  if (!user) return null;

  const isSelf = me?.id === user.id;
  const deleted = !!user.deleted_at;

  return <>
    {back}

    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <UserAvatar name={user.full_name} className="size-16 text-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{user.full_name}</h1>
            <StatusBadge status={user.status} deleted={deleted} />
          </div>
          <RoleBadges roles={user.roles} />
          <p className="text-sm text-muted-foreground">User #{user.id} · joined {formatDate(user.created_at)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-col lg:flex-row">
          <Button onClick={() => setEditing(true)} disabled={deleted}><Pencil /> Edit</Button>
          <Button variant="outline" onClick={() => setLinking(true)} disabled={deleted}><KeyRound /> <span className="truncate">Password</span></Button>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting(true)} disabled={deleted || isSelf} title={isSelf ? "You cannot delete your own account" : undefined}><Trash2 /> Delete</Button>
        </div>
      </CardContent>
    </Card>

    {deleted && <ErrorAlert title="Deleted account" message={`This account was deleted on ${formatDate(user.deleted_at, true)} and cannot log in.`} />}

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Account</CardTitle><CardDescription>Contact details and sign-in activity.</CardDescription></CardHeader>
        <CardContent className="grid gap-4">
          <InfoRow icon={Mail} label="Email" value={user.email} verified={user.email ? !!user.email_verified_at : undefined} />
          <InfoRow icon={Phone} label="Mobile" value={user.mobile} verified={user.mobile ? !!user.mobile_verified_at : undefined} />
          <Separator />
          <InfoRow icon={Clock} label="Last login" value={formatDate(user.last_login_at, true)} />
          <InfoRow icon={CalendarClock} label="Last updated" value={formatDate(user.updated_at, true)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle><CardDescription>Student and faculty information.</CardDescription></CardHeader>
        <CardContent className="grid gap-6">
          {!user.student_profiles && !user.faculty_profiles && <p className="text-sm text-muted-foreground">No student or faculty profile. Admin-only accounts do not have one.</p>}
          {user.student_profiles && <ProfileGrid title="Student" rows={[
            ["Admission no.", user.student_profiles.admission_number],
            ["Class / grade", user.student_profiles.grade],
            ["School", user.student_profiles.school_name],
            ["Date of birth", user.student_profiles.date_of_birth && formatDate(user.student_profiles.date_of_birth)],
            ["Guardian", user.student_profiles.guardian_name],
            ["Guardian mobile", user.student_profiles.guardian_mobile],
            ["Joined on", user.student_profiles.joined_on && formatDate(user.student_profiles.joined_on)],
            ["Address", user.student_profiles.address],
          ]} />}
          {user.faculty_profiles && <ProfileGrid title="Faculty" rows={[
            ["Employee code", user.faculty_profiles.employee_code],
            ["Qualification", user.faculty_profiles.qualification],
            ["Specialization", user.faculty_profiles.specialization],
            ["Joined on", user.faculty_profiles.joined_on && formatDate(user.faculty_profiles.joined_on)],
          ]} />}
        </CardContent>
      </Card>
    </div>

    <UserFormDialog open={editing} onOpenChange={setEditing} user={user} onSaved={updated => setData({ ...user, ...updated })} />
    <PasswordLinkDialog user={user} open={linking} onOpenChange={setLinking} />
    <DeleteUserDialog user={user} open={deleting} onOpenChange={setDeleting} onDeleted={() => router.push("/admin/users")} />
  </>;
}

function InfoRow({ icon: Icon, label, value, verified }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null; verified?: boolean }) {
  return <div className="flex items-start gap-3">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="size-4 text-muted-foreground" /></span>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
    </div>
    {verified !== undefined && <span className={`flex items-center gap-1 text-xs ${verified ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
      {verified && <BadgeCheck className="size-3.5" />}{verified ? "Verified" : "Not verified"}
    </span>}
  </div>;
}

function ProfileGrid({ title, rows }: { title: string; rows: [string, string | null | undefined][] }) {
  return <div className="grid gap-3">
    <h3 className="text-sm font-semibold text-primary">{title}</h3>
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => <div key={label} className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium break-words">{value || "—"}</dd>
      </div>)}
    </dl>
  </div>;
}

function DetailSkeleton() {
  return <div className="grid gap-6">
    <Skeleton className="h-28 w-full rounded-xl" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
  </div>;
}
