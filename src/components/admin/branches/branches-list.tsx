"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2, Mail, Pencil, Phone, Plus, Power, PowerOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { branchesApi, type Branch } from "@/lib/admin-catalog-api";
import { cn } from "@/lib/utils";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, LoadingRows, PageHeader, Pill } from "../ui";
import { BranchFormDialog, DeactivateBranchDialog } from "./branch-dialogs";

type Show = "active" | "inactive" | "all";

const place = (b: Branch) => [b.city, b.state].filter(Boolean).join(", ");
const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export default function BranchesList() {
  const { withToken } = useAuth();
  const { data, error, loading, reload, setData } = useAdminData(token => branchesApi.list(token, true), "branches");
  const [show, setShow] = useState<Show>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>();
  const [deactivating, setDeactivating] = useState<Branch | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(b => (show === "all" || b.is_active === (show === "active"))
      && (!term || [b.name, b.code, b.city, b.state, b.pincode].some(v => v?.toLowerCase().includes(term))));
  }, [data, show, search]);

  const counts = useMemo(() => ({
    active: (data ?? []).filter(b => b.is_active).length,
    inactive: (data ?? []).filter(b => !b.is_active).length,
  }), [data]);

  const upsert = (branch: Branch) => setData(current => {
    if (!current) return current;
    return current.some(b => b.id === branch.id) ? current.map(b => b.id === branch.id ? branch : b) : [...current, branch].sort((a, b) => a.name.localeCompare(b.name));
  });

  async function setActive(branch: Branch, isActive: boolean) {
    setPending(branch.id);
    try {
      const updated = await withToken(token => branchesApi.update(token, branch.id, { isActive }));
      upsert(updated);
      toast.success(isActive ? `${branch.name} is active again` : `${branch.name} deactivated`);
      setDeactivating(null);
    } catch (e) {
      toast.error(errorText(e, "Could not change the branch."));
    } finally {
      setPending(null);
    }
  }

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const actions: RowActions = {
    pending,
    edit: b => { setEditing(b); setFormOpen(true); },
    toggle: b => b.is_active ? setDeactivating(b) : setActive(b, true),
  };

  return <>
    <PageHeader title="Branches" description="Centres where batches run and fees are collected. Each has its own invoice and receipt numbering."
      actions={<Button onClick={openCreate}><Plus /> Add branch</Button>} />

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search by name, code, city or PIN" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search branches" />
        </div>
        <Select value={show} onValueChange={v => setShow(v as Show)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            <SelectItem value="active">Active ({counts.active})</SelectItem>
            <SelectItem value="inactive">Inactive ({counts.inactive})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && rows.length === 0 && (data.length === 0
          ? <EmptyState icon={Building2} title="No branches yet" description="Add your first centre to start creating batches and collecting fees." action={<Button onClick={openCreate}><Plus /> Add branch</Button>} />
          : <EmptyState icon={Search} title="No branches match" description="Try a different search or filter." />)}
        {rows.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <BranchesTable branches={rows} actions={actions} />
          <BranchesCards branches={rows} actions={actions} />
        </div>}
      </CardContent>
    </Card>

    <BranchFormDialog open={formOpen} onOpenChange={setFormOpen} branch={editing} onSaved={upsert} />
    <DeactivateBranchDialog branch={deactivating} open={!!deactivating} onOpenChange={open => { if (!open) setDeactivating(null); }}
      onConfirm={b => setActive(b, false)} busy={pending !== null} />
  </>;
}

type RowActions = { pending: number | null; edit: (b: Branch) => void; toggle: (b: Branch) => void };

const StatusPill = ({ branch }: { branch: Branch }) =>
  <Pill value={branch.is_active ? "ACTIVE" : "INACTIVE"} tones={{ ACTIVE: "green", INACTIVE: "gray" }} />;

function ActionButtons({ branch, actions, labels }: { branch: Branch; actions: RowActions; labels?: boolean }) {
  const busy = actions.pending === branch.id;
  const ToggleIcon = busy ? Loader2 : branch.is_active ? PowerOff : Power;
  const items = [
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(branch) },
    { label: branch.is_active ? "Deactivate" : "Activate", icon: ToggleIcon, onClick: () => actions.toggle(branch), disabled: busy, destructive: branch.is_active },
  ];
  return <div className={labels ? "grid grid-cols-2 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, onClick, disabled, destructive }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} disabled={disabled} aria-label={`${label} ${branch.name}`}>
        <Icon className={cn(busy && Icon === Loader2 && "animate-spin")} />{labels && label}
      </Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      return <Tooltip key={label}>
        <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>;
    })}
  </div>;
}

function BranchesTable({ branches, actions }: { branches: Branch[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Branch</TableHead>
        <TableHead className="hidden lg:table-cell">Location</TableHead>
        <TableHead className="hidden xl:table-cell">Contact</TableHead>
        <TableHead className="hidden lg:table-cell">Prefixes</TableHead>
        <TableHead className="text-right">Batches</TableHead>
        <TableHead className="text-right">Staff</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {branches.map(b => <TableRow key={b.id} className={cn(!b.is_active && "text-muted-foreground")}>
        <TableCell className="pl-4">
          <p className="max-w-[16rem] truncate font-medium">{b.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{b.code}<span className="lg:hidden">{place(b) && ` · ${place(b)}`}</span></p>
        </TableCell>
        <TableCell className="hidden max-w-[12rem] truncate text-muted-foreground lg:table-cell">
          {place(b) || "—"}{b.pincode && <span className="block text-xs">{b.pincode}</span>}
        </TableCell>
        <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
          {b.phone || b.email ? <>{b.phone && <span className="block">{b.phone}</span>}{b.email && <span className="block max-w-[14rem] truncate">{b.email}</span>}</> : "—"}
        </TableCell>
        <TableCell className="hidden font-mono text-xs lg:table-cell">
          <span className="block" title="Invoice prefix">INV {b.invoice_prefix}</span>
          <span className="block text-muted-foreground" title="Receipt prefix">RCT {b.receipt_prefix}</span>
        </TableCell>
        <TableCell className="text-right tabular-nums">{b._count.batches}</TableCell>
        <TableCell className="text-right tabular-nums">{b._count.branch_staff}</TableCell>
        <TableCell><StatusPill branch={b} /></TableCell>
        <TableCell className="pr-4"><ActionButtons branch={b} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function BranchesCards({ branches, actions }: { branches: Branch[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {branches.map(b => <li key={b.id} className="grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{b.name}</p>
          <p className="truncate text-xs text-muted-foreground"><span className="font-mono">{b.code}</span>{place(b) && ` · ${place(b)}`}{b.pincode && ` ${b.pincode}`}</p>
        </div>
        <StatusPill branch={b} />
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        <p>{plural(b._count.batches, "batch", "batches")} · {plural(b._count.branch_staff, "staff member")} · <span className="font-mono">INV {b.invoice_prefix} / RCT {b.receipt_prefix}</span></p>
        {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-1.5 hover:text-foreground"><Phone className="size-3.5" />{b.phone}</a>}
        {b.email && <a href={`mailto:${b.email}`} className="flex min-w-0 items-center gap-1.5 hover:text-foreground"><Mail className="size-3.5 shrink-0" /><span className="truncate">{b.email}</span></a>}
      </div>
      <ActionButtons branch={b} actions={actions} labels />
    </li>)}
  </ul>;
}
