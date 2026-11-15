"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Download, Eye, Loader2, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import type { RoleCode } from "@/lib/api";
import { ROLES, USER_STATUSES, usersApi, type AdminUser, type ListUsersQuery, type UserStatus } from "@/lib/admin-api";
import { downloadCsv } from "@/lib/teaching-api";
import { ActionsHead, RowActions } from "@/components/portal/row-actions";
import { useAdminData } from "./use-admin-data";
import { DeleteUserDialog, UserFormDialog } from "./user-dialogs";
import { ErrorAlert, formatDate, PageHeader, Pager, RoleBadges, StatusBadge, titleCase, UserAvatar } from "./ui";

const ALL = "all";
const pick = <T extends string>(value: string | null, allowed: readonly T[]) => allowed.find(v => v === value);

export default function UsersList() {
  const params = useSearchParams();
  const { user: me, withToken } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const [role, setRole] = useState<RoleCode | undefined>(pick(params.get("role"), ROLES));
  const [status, setStatus] = useState<UserStatus | undefined>(pick(params.get("status"), USER_STATUSES));
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<AdminUser | undefined>();
  const [deleting, setDeleting] = useState<AdminUser | null>(null);

  // Search after a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = { role, status, search, includeDeleted, page, limit: 20 };
  const { data, error, loading, reload } = useAdminData(token => usersApi.list(token, query), JSON.stringify(query));

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };

  /** Every user matching the current filters, fetched 100 at a time, as a CSV download. */
  async function exportUsers(filters: ListUsersQuery) {
    setExporting("Exporting…");
    try {
      const rows: AdminUser[] = [];
      for (let p = 1; ; p++) {
        const result = await withToken(token => usersApi.list(token, { ...filters, page: p, limit: 100 }));
        rows.push(...result.data);
        setExporting(`Exporting ${rows.length} of ${result.meta.total}…`);
        if (p >= result.meta.totalPages) break;
      }
      const day = (iso: string | null) => iso ? iso.slice(0, 10) : "";
      downloadCsv(`users-${(filters.role ?? "all").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, [
        ["Name", "Email", "Mobile", "Roles", "Status", "Joined", "Last login"],
        ...rows.map(u => [u.full_name, u.email, u.mobile, u.roles.join(", "), u.deleted_at ? "DELETED" : u.status, day(u.created_at), day(u.last_login_at)]),
      ]);
      toast.success(`Exported ${rows.length} ${rows.length === 1 ? "user" : "users"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export users.");
    } finally {
      setExporting(null);
    }
  }
  const actions = {
    edit: (u: AdminUser) => { setEditing(u); setFormOpen(true); },
    remove: (u: AdminUser) => setDeleting(u),
    isSelf: (u: AdminUser) => me?.id === u.id,
  };

  return <>
    <PageHeader title="Users" description="Manage students, faculty and admins." actions={<>
      <Button variant="outline" disabled={exporting !== null || !data?.meta.total} onClick={() => void exportUsers({ role, status, search, includeDeleted })}>
        {exporting !== null ? <Loader2 className="animate-spin" /> : <Download />}{exporting ?? "Export CSV"}
      </Button>
      <Button onClick={openCreate}><UserPlus /> Add user</Button>
    </>} />

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search by name, email or mobile" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search users" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
          <Select value={role ?? ALL} onValueChange={v => { setRole(v === ALL ? undefined : v as RoleCode); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{titleCase(r)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status ?? ALL} onValueChange={v => { setStatus(v === ALL ? undefined : v as UserStatus); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {USER_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="col-span-2 flex items-center gap-2 sm:col-span-1 sm:pl-1">
            <Checkbox id="show-deleted" checked={includeDeleted} onCheckedChange={v => { setIncludeDeleted(v === true); setPage(1); }} />
            <Label htmlFor="show-deleted" className="font-normal whitespace-nowrap">Show deleted</Label>
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && data.data.length === 0 && <EmptyState filtered={!!(role || status || search || includeDeleted)} onCreate={openCreate} />}
        {data && data.data.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <UsersTable users={data.data} actions={actions} />
          <UsersCards users={data.data} actions={actions} />
        </div>}
      </CardContent>

      {data && data.meta.total > 0 && <CardFooter className="border-t p-4 [.border-t]:pt-4"><div className="w-full"><Pager meta={data.meta} onPage={setPage} /></div></CardFooter>}
    </Card>

    <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} onSaved={reload} />
    <DeleteUserDialog user={deleting} open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }} onDeleted={reload} />
  </>;
}

type RowHandlers = { edit: (u: AdminUser) => void; remove: (u: AdminUser) => void; isSelf: (u: AdminUser) => boolean };

/** The ⋮ menu of a user row: view, edit, delete (disabled for yourself and deleted accounts). */
function UserActions({ user, actions }: { user: AdminUser; actions: RowHandlers }) {
  const deleted = !!user.deleted_at;
  return <RowActions label={user.full_name} items={[
    { label: "View", icon: Eye, href: `/admin/users/${user.id}` },
    { label: "Edit", icon: Pencil, onSelect: () => actions.edit(user), disabled: deleted, hint: deleted ? "Deleted accounts cannot be edited" : undefined },
    { label: "Delete", icon: Trash2, onSelect: () => actions.remove(user), destructive: true, disabled: deleted || actions.isSelf(user),
      hint: actions.isSelf(user) ? "You cannot delete your own account" : deleted ? "Already deleted" : undefined },
  ]} />;
}

/** md and up: a table. Lower-priority columns appear as the screen widens. */
function UsersTable({ users, actions }: { users: AdminUser[]; actions: RowHandlers }) {
  return <Table className="hidden @2xl/main:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">User</TableHead>
        <TableHead className="hidden @3xl/main:table-cell">Mobile</TableHead>
        <TableHead>Roles</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden @4xl/main:table-cell">Last login</TableHead>
        <TableHead className="hidden @4xl/main:table-cell">Joined</TableHead>
        <ActionsHead />
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map(u => <TableRow key={u.id}>
        <TableCell className="pl-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={u.full_name} src={u.photo_url} />
            <div className="min-w-0">
              <Link href={`/admin/users/${u.id}`} className="block max-w-[16rem] truncate font-medium hover:underline">{u.full_name}</Link>
              <p className="max-w-[16rem] truncate text-xs text-muted-foreground">{u.email ?? u.mobile}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden text-muted-foreground @3xl/main:table-cell">{u.mobile ?? "—"}</TableCell>
        <TableCell><RoleBadges roles={u.roles} /></TableCell>
        <TableCell><StatusBadge status={u.status} deleted={!!u.deleted_at} /></TableCell>
        <TableCell className="hidden text-muted-foreground @4xl/main:table-cell">{formatDate(u.last_login_at, true)}</TableCell>
        <TableCell className="hidden text-muted-foreground @4xl/main:table-cell">{formatDate(u.created_at)}</TableCell>
        <TableCell className="pr-4 text-right"><UserActions user={u} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

/** Narrow screens: one card per user, actions in the ⋮ menu at the top right. */
function UsersCards({ users, actions }: { users: AdminUser[]; actions: RowHandlers }) {
  return <ul className="divide-y @2xl/main:hidden">
    {users.map(u => <li key={u.id} className="grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <UserAvatar name={u.full_name} src={u.photo_url} />
        <div className="min-w-0 flex-1">
          <Link href={`/admin/users/${u.id}`} className="block truncate font-medium hover:underline">{u.full_name}</Link>
          {u.email && <p className="truncate text-xs text-muted-foreground">{u.email}</p>}
          {u.mobile && <p className="truncate text-xs text-muted-foreground">{u.mobile}</p>}
        </div>
        <UserActions user={u} actions={actions} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5"><StatusBadge status={u.status} deleted={!!u.deleted_at} /><RoleBadges roles={u.roles} /></div>
        <span className="text-xs text-muted-foreground">Joined {formatDate(u.created_at)}</span>
      </div>
    </li>)}
  </ul>;
}

function LoadingRows() {
  return <div className="grid gap-4 p-4">
    {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-3">
      <Skeleton className="size-9 rounded-full" />
      <div className="grid flex-1 gap-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div>
      <Skeleton className="hidden h-8 w-24 sm:block" />
    </div>)}
  </div>;
}

function EmptyState({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  return <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
    <span className="flex size-12 items-center justify-center rounded-full bg-muted"><Users className="size-5 text-muted-foreground" /></span>
    <div>
      <p className="font-medium">{filtered ? "No users match these filters" : "No users yet"}</p>
      <p className="text-sm text-muted-foreground">{filtered ? "Try a different search or clear the filters." : "Add the first faculty member or student."}</p>
    </div>
    {!filtered && <Button onClick={onCreate}><UserPlus /> Add user</Button>}
  </div>;
}
