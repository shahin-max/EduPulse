"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList, Eye, Pencil, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionsHead, RowActions, type RowAction } from "@/components/portal/row-actions";
import { scholarshipsApi, slabSentence, type ScholarshipTest } from "@/lib/scholarships-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, LoadingRows, PageHeader } from "../ui";
import { ScholarshipDialog } from "./scholarship-dialog";
import { questionCount, ScholarshipStatusPill, testWindow } from "./scholarship-bits";

/** All Scholarship Tests, newest first. */
export default function ScholarshipsList() {
  const { data, error, loading, reload, setData } = useAdminData(scholarshipsApi.list, "scholarship-tests");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScholarshipTest | undefined>();

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const saved = (t: ScholarshipTest) => setData(cur => {
    if (!cur) return cur;
    // A new test comes back without its candidate count.
    return cur.some(x => x.id === t.id) ? cur.map(x => x.id === t.id ? { ...x, ...t } : x) : [{ ...t, candidates: t.candidates ?? 0 }, ...cur];
  });
  const actions = (t: ScholarshipTest): RowAction[] => [
    { label: "Open", icon: Eye, href: `/admin/scholarships/${t.id}` },
    { label: "Build the paper", icon: ClipboardList, href: `/admin/exams/${t.exam_id}` },
    { label: "Edit", icon: Pencil, onSelect: () => { setEditing(t); setFormOpen(true); } },
  ];

  return <>
    <PageHeader title="Scholarship tests" description="Online scholarship tests: students register on the website, take the test in their portal, and win % off course fees by score."
      actions={<Button onClick={openCreate}><Plus /> New scholarship test</Button>} />

    <Card className="gap-0 py-0">
      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows rows={3} />}
        {data && data.length === 0 && <EmptyState icon={Trophy} title="No scholarship tests yet"
          description="Create one, build its paper, then open registration. The website's Scholarship Test button will take registrations."
          action={<Button onClick={openCreate}><Plus /> New scholarship test</Button>} />}
        {data && data.length > 0 && <>
          <Table className="hidden @2xl/main:table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden @3xl/main:table-cell">Test window</TableHead>
                <TableHead className="text-right">Candidates</TableHead>
                <TableHead className="hidden text-right @4xl/main:table-cell">Questions</TableHead>
                <ActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(t => <TableRow key={t.id}>
                <TableCell className="max-w-[22rem] pl-4">
                  <Link href={`/admin/scholarships/${t.id}`} className="block truncate font-medium hover:underline">{t.title}</Link>
                  <span className="block truncate text-xs text-muted-foreground">{slabSentence(t.slabs)}</span>
                </TableCell>
                <TableCell><ScholarshipStatusPill status={t.status} /></TableCell>
                <TableCell className="hidden text-muted-foreground @3xl/main:table-cell">{testWindow(t)}</TableCell>
                <TableCell className="text-right tabular-nums">{t.candidates}</TableCell>
                <TableCell className="hidden text-right tabular-nums @4xl/main:table-cell">{questionCount(t)}</TableCell>
                <TableCell className="pr-4 text-right"><RowActions label={t.title} items={actions(t)} /></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
          <ul className="divide-y @2xl/main:hidden">
            {data.map(t => <li key={t.id} className="grid gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/admin/scholarships/${t.id}`} className="min-w-0 font-medium">{t.title}</Link>
                <RowActions label={t.title} items={actions(t)} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ScholarshipStatusPill status={t.status} />
                <span>{t.candidates} candidates · {questionCount(t)} questions</span>
              </div>
              <p className="text-xs text-muted-foreground">{testWindow(t)}</p>
            </li>)}
          </ul>
        </>}
      </CardContent>
    </Card>

    <ScholarshipDialog open={formOpen} onOpenChange={setFormOpen} test={editing} onSaved={saved} />
  </>;
}
