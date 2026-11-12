"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpen, Globe, Layers, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { COURSE_STATUSES, coursesApi, type Course, type CourseStatus, type CourseWithSubjects } from "@/lib/admin-catalog-api";
import { useAdminData } from "../use-admin-data";
import { EmptyState, ErrorAlert, LoadingRows, PageHeader, titleCase } from "../ui";
import {
  archiveAction, CourseStatusPill, CreateCourseDialog, DeleteCourseDialog, primaryStatusAction, SegmentedTabs, useCourseStatus,
} from "./course-shared";
import SubjectsPanel from "./subjects-panel";

type Tab = "courses" | "subjects";
const ALL = "all";

export default function CoursesAdmin() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTabState] = useState<Tab>(params.get("tab") === "subjects" ? "subjects" : "courses");
  // Keep the tab in the URL (?tab=subjects) so it can be linked to and survives a refresh.
  const setTab = (next: Tab) => { setTabState(next); router.replace(next === "subjects" ? `${pathname}?tab=subjects` : pathname, { scroll: false }); };
  const [creating, setCreating] = useState(false);
  // Courses are loaded once for both tabs: the subjects tab shows how many courses use each subject.
  const courses = useAdminData(token => coursesApi.list(token), "courses");

  return <>
    <PageHeader title="Courses & subjects" description="Your course catalog, its subjects and syllabus."
      actions={tab === "courses" && <Button onClick={() => setCreating(true)}><Plus /> Add course</Button>} />

    <SegmentedTabs label="Catalog sections" value={tab} onChange={setTab} tabs={[
      { value: "courses", label: <><BookOpen className="size-4" /> Courses</> },
      { value: "subjects", label: <><Layers className="size-4" /> Subjects</> },
    ]} />

    {tab === "courses"
      ? <CoursesPanel {...courses} onCreate={() => setCreating(true)} />
      : <SubjectsPanel courses={courses.data ?? []} onChanged={courses.reload} />}

    <CreateCourseDialog open={creating} onOpenChange={setCreating} />
  </>;
}

function CoursesPanel({ data, error, loading, reload, setData, onCreate }: {
  data: CourseWithSubjects[] | null;
  error: string;
  loading: boolean;
  reload: () => void;
  setData: (data: CourseWithSubjects[]) => void;
  onCreate: () => void;
}) {
  const [status, setStatusFilter] = useState<CourseStatus | undefined>();
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<Course | null>(null);

  // Update one row in place after a status change instead of reloading the whole list.
  const replace = (course: Course) => { if (data) setData(data.map(c => c.id === course.id ? { ...c, ...course } : c)); };
  const { pending, setStatus } = useCourseStatus(replace);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter(c => (!status || c.status === status)
      && (!term || c.title.toLowerCase().includes(term) || c.code.toLowerCase().includes(term) || c.slug.includes(term)));
  }, [data, status, search]);

  const counts = useMemo(() => {
    const result: Record<CourseStatus, number> = { PUBLISHED: 0, DRAFT: 0, ARCHIVED: 0 };
    for (const c of data ?? []) result[c.status]++;
    return result;
  }, [data]);

  const actions: RowActions = { pending, setStatus, remove: setDeleting };

  return <>
    <Alert>
      <Globe />
      <AlertTitle>Only published courses appear on the website</AlertTitle>
      <AlertDescription>
        Drafts and archived courses are visible only here.{data && <> Right now <strong className="text-foreground">{counts.PUBLISHED} of {data.length}</strong> {data.length === 1 ? "course is" : "courses are"} live.</>}
      </AlertDescription>
    </Alert>

    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" placeholder="Search by title, code or slug" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" aria-label="Search courses" />
        </div>
        <Select value={status ?? ALL} onValueChange={v => setStatusFilter(v === ALL ? undefined : v as CourseStatus)}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {COURSE_STATUSES.map(s => <SelectItem key={s} value={s}>{titleCase(s)} ({counts[s]})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <CardContent className="p-0">
        {error && <div className="p-4"><ErrorAlert message={error} onRetry={reload} /></div>}
        {!data && loading && <LoadingRows />}
        {data && rows.length === 0 && (data.length === 0
          ? <EmptyState icon={BookOpen} title="No courses yet" description="Add your first course, attach its subjects, then publish it." action={<Button onClick={onCreate}><Plus /> Add course</Button>} />
          : <EmptyState icon={Search} title="No courses match" description="Try a different search or status." />)}
        {rows.length > 0 && <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <CoursesTable courses={rows} actions={actions} />
          <CoursesCards courses={rows} actions={actions} />
        </div>}
      </CardContent>
    </Card>

    <DeleteCourseDialog course={deleting} open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}
      onDeleted={course => { if (data) setData(data.filter(c => c.id !== course.id)); }} onArchived={replace} />
  </>;
}

type RowActions = {
  pending: number | null;
  setStatus: (course: Course, status: CourseStatus) => void;
  remove: (course: Course) => void;
};

/** The one-click status button (Publish / Unpublish / Restore). */
function StatusButton({ course, actions, full }: { course: Course; actions: RowActions; full?: boolean }) {
  const action = primaryStatusAction(course.status);
  const busy = actions.pending === course.id;
  const button = <Button size="sm" variant={action.variant} disabled={busy} onClick={() => actions.setStatus(course, action.to)} className={full ? "w-full" : "w-28"}>
    {busy ? <Loader2 className="animate-spin" /> : <action.icon />}{action.label}
  </Button>;
  if (full) return button;
  return <Tooltip>
    <TooltipTrigger asChild><span className="inline-flex">{button}</span></TooltipTrigger>
    <TooltipContent>{action.tip}</TooltipContent>
  </Tooltip>;
}

function MoreMenu({ course, actions }: { course: Course; actions: RowActions }) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label={`More actions for ${course.title}`}><MoreHorizontal /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem asChild><Link href={`/admin/courses/${course.id}`}><Pencil /> Edit course & syllabus</Link></DropdownMenuItem>
      {course.status === "ARCHIVED"
        ? <DropdownMenuItem onSelect={() => actions.setStatus(course, "PUBLISHED")}><Globe /> Publish</DropdownMenuItem>
        : <DropdownMenuItem onSelect={() => actions.setStatus(course, archiveAction.to)}><archiveAction.icon /> Archive</DropdownMenuItem>}
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => actions.remove(course)}><Trash2 /> Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

const subjectNames = (c: CourseWithSubjects) => c.course_subjects.map(cs => cs.subjects.name).join(", ");

function CoursesTable({ courses, actions }: { courses: CourseWithSubjects[]; actions: RowActions }) {
  return <Table className="hidden md:table">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="pl-4">Course</TableHead>
        <TableHead className="hidden lg:table-cell">Slug</TableHead>
        <TableHead className="hidden xl:table-cell">Subjects</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Order</TableHead>
        <TableHead className="pr-4 text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {courses.map(c => <TableRow key={c.id}>
        <TableCell className="pl-4">
          <Link href={`/admin/courses/${c.id}`} className="block max-w-[18rem] truncate font-medium hover:underline">{c.title}</Link>
          <p className="font-mono text-xs text-muted-foreground">{c.code}<span className="lg:hidden"> · {c.slug}</span></p>
        </TableCell>
        <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{c.slug}</TableCell>
        <TableCell className="hidden max-w-[16rem] truncate text-muted-foreground xl:table-cell" title={subjectNames(c)}>{subjectNames(c) || "—"}</TableCell>
        <TableCell><CourseStatusPill status={c.status} /></TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">{c.sort_order}</TableCell>
        <TableCell className="pr-4">
          <div className="flex items-center justify-end gap-1">
            <StatusButton course={c} actions={actions} />
            <MoreMenu course={c} actions={actions} />
          </div>
        </TableCell>
      </TableRow>)}
    </TableBody>
  </Table>;
}

function CoursesCards({ courses, actions }: { courses: CourseWithSubjects[]; actions: RowActions }) {
  return <ul className="divide-y md:hidden">
    {courses.map(c => <li key={c.id} className="grid gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/admin/courses/${c.id}`} className="block truncate font-medium hover:underline">{c.title}</Link>
          <p className="truncate font-mono text-xs text-muted-foreground">{c.code} · {c.slug}</p>
        </div>
        <CourseStatusPill status={c.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {c.course_subjects.length ? `${c.course_subjects.length} subject${c.course_subjects.length === 1 ? "" : "s"}: ${subjectNames(c)}` : "No subjects yet"} · Order {c.sort_order}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1"><StatusButton course={c} actions={actions} full /></div>
        <Button asChild size="sm" variant="outline" className="flex-1"><Link href={`/admin/courses/${c.id}`}><Pencil /> Edit</Link></Button>
        <MoreMenu course={c} actions={actions} />
      </div>
    </li>)}
  </ul>;
}
