"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, FileText, Globe, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { websiteContentApi, type ContentBlock } from "@/lib/admin-ops-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, errorText, formatDate, LoadingRows, PageHeader, Pill } from "../ui";
import { ContentDialog } from "./content-dialog";
import { KNOWN_KEYS, knownKey, REFRESH_NOTE, type KnownKey } from "./known-keys";

const PUBLISHED_TONES = { yes: "green", no: "gray" } as const;
const PublishedPill = ({ published }: { published: boolean }) =>
  <Pill value={published ? "yes" : "no"} tones={PUBLISHED_TONES} label={published ? "Published" : "Unpublished"} />;

export default function WebsiteContent() {
  const { withToken } = useAuth();
  const [prefixText, setPrefixText] = useState("");
  const [prefix, setPrefix] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentBlock | undefined>();
  const [deleting, setDeleting] = useState<ContentBlock | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setPrefix(prefixText.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [prefixText]);

  // Unfiltered list for the "used by the website" panel and duplicate-key checks; the filter applies client-side.
  const { data, error, loading, reload } = useAdminData(token => websiteContentApi.list(token), "content");
  const blocks = data ?? [];
  const shown = prefix ? blocks.filter(b => b.content_key.startsWith(prefix)) : blocks;
  const keys = blocks.map(b => b.content_key);

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const edit = (b: ContentBlock) => { setEditing(b); setFormOpen(true); };

  async function createKnown(k: KnownKey) {
    setBusy(k.key);
    try {
      const created = await withToken(token => websiteContentApi.upsert(token, k.key, { title: k.starter.title, body: k.starter.body, isPublished: false, sortOrder: 0 }));
      toast.success(`${k.key} created as a draft with the website's current text`);
      reload();
      edit(created);
    } catch (e) {
      toast.error(errorText(e, `Could not create ${k.key}.`));
    } finally {
      setBusy(null);
    }
  }

  async function togglePublished(b: ContentBlock) {
    setBusy(b.content_key);
    try {
      await withToken(token => websiteContentApi.upsert(token, b.content_key, { isPublished: !b.is_published }));
      toast.success(b.is_published ? `${b.content_key} unpublished` : `${b.content_key} published`);
      reload();
    } catch (e) {
      toast.error(errorText(e, "Could not change the published state."));
    } finally {
      setBusy(null);
    }
  }

  async function remove(event: React.MouseEvent) {
    event.preventDefault();
    if (!deleting) return;
    setBusy(deleting.content_key);
    try {
      await withToken(token => websiteContentApi.remove(token, deleting.content_key));
      toast.success(`${deleting.content_key} deleted`);
      setDeleting(null);
      reload();
    } catch (e) {
      toast.error(errorText(e, "Could not delete the block."));
    } finally {
      setBusy(null);
    }
  }

  const actions: RowActions = { edit, toggle: b => void togglePublished(b), remove: setDeleting, busy };

  return <>
    <PageHeader title="Website" description="Editable text on the public website." actions={<Button onClick={openCreate}><Plus /> New block</Button>} />

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Globe className="size-4" /> Used by the website</CardTitle>
        <CardDescription>{REFRESH_NOTE}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {KNOWN_KEYS.map(k => {
          const block = blocks.find(b => b.content_key === k.key);
          return <div key={k.key} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="min-w-0 grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{k.name}</p>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{k.key}</code>
                {block ? <PublishedPill published={block.is_published} /> : data && <Pill value="missing" tones={{}} label="Not created" />}
              </div>
              <p className="text-sm text-muted-foreground">{k.where}</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                <li><strong className="font-medium text-foreground">Body:</strong> {k.body}</li>
                <li><strong className="font-medium text-foreground">Title:</strong> {k.title}</li>
              </ul>
            </div>
            {block
              ? <Button variant="outline" onClick={() => edit(block)}><Pencil /> Edit</Button>
              : <Button onClick={() => void createKnown(k)} disabled={!data || busy === k.key}>{busy === k.key ? <Loader2 className="animate-spin" /> : <Plus />}Create {k.key}</Button>}
          </div>;
        })}
      </CardContent>
    </Card>

    <Card className="gap-0 py-0">
      <div className="border-b p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Filter by key prefix, e.g. site." value={prefixText} onChange={e => setPrefixText(e.target.value)} className="pl-9 font-mono" aria-label="Filter by key prefix" />
        </div>
      </div>
      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && shown.length === 0 && <EmptyState icon={FileText}
          title={prefix ? "No blocks match this prefix" : "No content blocks yet"}
          description={prefix ? "Try a shorter prefix." : "Create site.ticker above, or add a new block."} />}
        {shown.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <BlocksTable rows={shown} actions={actions} />
          <BlocksCards rows={shown} actions={actions} />
        </div>}
      </CardContent>
    </Card>

    <ContentDialog open={formOpen} onOpenChange={setFormOpen} block={editing} existingKeys={keys} onSaved={reload} />

    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !busy) setDeleting(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-all">Delete {deleting?.content_key}?</AlertDialogTitle>
          <AlertDialogDescription>{deleting && knownKey(deleting.content_key)
            ? "The website goes back to its built-in text for this block. To hide it temporarily, unpublish it instead."
            : "This permanently removes the block. To hide it temporarily, unpublish it instead."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={remove} disabled={!!busy} className="bg-destructive text-white hover:bg-destructive/90">{busy && <Loader2 className="animate-spin" />}Delete block</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

type RowActions = { edit: (b: ContentBlock) => void; toggle: (b: ContentBlock) => void; remove: (b: ContentBlock) => void; busy: string | null };

function ActionButtons({ b, actions, labels = false }: { b: ContentBlock; actions: RowActions; labels?: boolean }) {
  const busy = actions.busy === b.content_key;
  const items = [
    { label: "Edit", icon: Pencil, onClick: () => actions.edit(b) },
    { label: b.is_published ? "Unpublish" : "Publish", icon: busy ? Loader2 : b.is_published ? EyeOff : Eye, onClick: () => actions.toggle(b), spin: busy },
    { label: "Delete", icon: Trash2, onClick: () => actions.remove(b), destructive: true },
  ];
  return <div className={labels ? "grid grid-cols-3 gap-2" : "flex justify-end gap-1"}>
    {items.map(({ label, icon: Icon, onClick, destructive, spin }) => {
      const className = destructive ? "text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined;
      const button = <Button variant={labels ? "outline" : "ghost"} size={labels ? "sm" : "icon"} className={className} onClick={onClick} disabled={busy} aria-label={`${label} ${b.content_key}`}>
        <Icon className={spin ? "animate-spin" : undefined} />{labels && label}
      </Button>;
      if (labels) return <span key={label} className="contents">{button}</span>;
      return <Tooltip key={label}>
        <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>;
    })}
  </div>;
}

const preview = (b: ContentBlock) => b.title || b.body?.split(/\r?\n/).find(l => l.trim())?.trim() || "Empty";

function BlocksTable({ rows, actions }: { rows: ContentBlock[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Key</TableHead>
        <TableHead>Content</TableHead>
        <TableHead>State</TableHead>
        <TableHead className="hidden lg:table-cell">Order</TableHead>
        <TableHead className="hidden lg:table-cell">Updated</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(b => <TableRow key={b.id}>
        <TableCell className="pl-4">
          <button type="button" className="max-w-[14rem] truncate text-left font-mono text-sm font-medium hover:underline" onClick={() => actions.edit(b)}>{b.content_key}</button>
          {knownKey(b.content_key) && <p className="text-xs text-muted-foreground">{knownKey(b.content_key)!.name}</p>}
        </TableCell>
        <TableCell className="max-w-[18rem] truncate text-muted-foreground">{preview(b)}</TableCell>
        <TableCell><PublishedPill published={b.is_published} /></TableCell>
        <TableCell className="hidden tabular-nums text-muted-foreground lg:table-cell">{b.sort_order}</TableCell>
        <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(b.updated_at, true)}</TableCell>
        <TableCell className="pr-4"><ActionButtons b={b} actions={actions} /></TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function BlocksCards({ rows, actions }: { rows: ContentBlock[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {rows.map(b => <li key={b.id} className="grid gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 break-all text-left font-mono text-sm font-medium" onClick={() => actions.edit(b)}>{b.content_key}</button>
        <PublishedPill published={b.is_published} />
      </div>
      <p className="line-clamp-2 text-sm break-words text-muted-foreground">{preview(b)}</p>
      <p className="text-xs text-muted-foreground">Order {b.sort_order} · Updated {formatDate(b.updated_at, true)}</p>
      <ActionButtons b={b} actions={actions} labels />
    </li>)}
  </ul>;
}
