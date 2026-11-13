"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import type { RoleCode } from "@/lib/api";
import { ROLES, USER_STATUSES, usersApi, type AdminUser, type UserStatus } from "@/lib/admin-api";
import { useAdminData } from "./use-admin-data";
import { DeleteUserDialog, UserFormDialog } from "./user-dialogs";
import { ErrorAlert, formatDate, PageHeader, Pager, RoleBadges, StatusBadge, titleCase, UserAvatar } from "./ui";

const ALL = "all";
const pick = <T extends string>(value: string | null, allowed: readonly T[]) => allowed.find(v => v === value);

export default function UsersList() {
  const params = useSearchParams();
  const { user: me } = useAuth();
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
  const actions = {
    edit: (u: AdminUser) => { setEditing(u); setFormOpen(true); },
    remove: (u: AdminUser) => setDeleting(u),
    isSelf: (u: AdminUser) => me?.id === u.id,
  };

  return <>
    <PageHeader title="Users" description="Manage students, faculty and admins." actions={<Button onClick={openCreate}><UserPlus /> Add user</Button>} />

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search by name, email or mobile" value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-9" aria-label="Search users" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
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

type RowActions = { edit: (u: AdminUser) => void; remove: (u: AdminUser) => void; isSelf: (u: AdminUser) => boolean };

function ActionButtons({ user, actions, labels = false }: { user: AdminUser; actions: RowActions; labels?: boolean }) {
  const deleted = !!user.deleted_at;
  const cannotDelete = deleted || actions.isSelf(user);
  const items = [
    { label: "View", icon: Eye, href: `/admin/users/${user.id}` },
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(user), disabled: deleted },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(user), disabled: cannotDelete, destructive: true,
      tip: actions.isSelf(user) ? "You cannot delete your own account" : deleted ? "Already deleted" : "Delete" },
  ];
  return <div className={labels ? "grid grid-cols-3 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, href, onClick, disabled, destructive, tip }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = href
        ? <Button asChild variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className}><Link href={href} aria-label={`View ${user.full_name}`}><Icon />{labels && label}</Link></Button>
        : <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} disabled={disabled} aria-label={`${label} ${user.full_name}`}><Icon />{labels && label}</Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      // Disabled buttons do not fire pointer events, so the tooltip wraps a span.
      return <Tooltip key={label}>
        <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
        <TooltipContent>{tip ?? label}</TooltipContent>
      </Tooltip>;
    })}
  </div>;
}

/** md and up: a table. Lower-priority columns appear as the screen widens. */
function UsersTable({ users, actions }: { users: AdminUser[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">User</TableHead>
        <TableHead className="hidden lg:table-cell">Mobile</TableHead>
        <TableHead>Roles</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden xl:table-cell">Last login</TableHead>
        <TableHead className="hidden xl:table-cell">Joined</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
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
        <TableCell className="hidden text-muted-foreground lg:table-cell">{u.mobile ?? "—"}</TableCell>
        <TableCell><RoleBadges roles={u.roles} /></TableCell>
        <TableCell><StatusBadge status={u.status} deleted={!!u.deleted_at} /></TableCell>
        <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDate(u.last_login_at, true)}</TableCell>
        <TableCell className="hidden text-muted-foreground xl:table-cell">{formatDate(u.created_at)}</TableCell>
        <TableCell className="pr-4"><ActionButtons user={u} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

/** Below md: one card per user with full-width action buttons. */
function UsersCards({ users, actions }: { users: AdminUser[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {users.map(u => <li key={u.id} className="grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <UserAvatar name={u.full_name} src={u.photo_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{u.full_name}</p>
          {u.email && <p className="truncate text-xs text-muted-foreground">{u.email}</p>}
          {u.mobile && <p className="truncate text-xs text-muted-foreground">{u.mobile}</p>}
        </div>
        <StatusBadge status={u.status} deleted={!!u.deleted_at} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RoleBadges roles={u.roles} />
        <span className="text-xs text-muted-foreground">Joined {formatDate(u.created_at)}</span>
      </div>
      <ActionButtons user={u} actions={actions} labels />
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
