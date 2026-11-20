"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, RotateCcw, Save, Undo2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { refreshPublicSite, websiteContentApi, type ContentBlock } from "@/lib/admin-ops-api";
import type { ApiContent } from "@/lib/api";
import { parseHomeResults } from "@/lib/home-content";
import {
  isSafeHref, parseContactCard, parseContactInfo, parseFaculty, parseFeatures, parseGallery, parseHero, parseLayout, parsePrograms,
  parseResultsHeader, parseUpdates, readJson, SECTION_KEYS, type ResultsHeader,
} from "@/lib/site-sections";
import { cn } from "@/lib/utils";
import { useAdminData } from "../use-admin-data";
import { ErrorAlert, errorText, formatDate, LoadingRows, PageHeader, Pill } from "../ui";
import { ListEditor, TextField } from "./fields";
import {
  ContactCardEditor, ContactInfoEditor, FacultyEditor, FeaturesEditor, GalleryEditor, HeroEditor, LayoutEditor, ProgramsEditor,
  ResultsHeaderEditor, UpdatesEditor, type EditorProps,
} from "./section-editors";
import WebsiteContent from "./website-content";
import { AboutEditor, GalleryPageEditor, PamphletEditor } from "./page-editors";
import { isLocalVideo, PAGE_KEYS, parseAbout, parseGalleryPage, parsePamphlet } from "@/lib/site-pages";
import { toEmbed } from "@/lib/video-embed";

type Blocks = ContentBlock[];
const asApi = (blocks: Blocks): ApiContent[] => blocks;

type SectionDef<T> = {
  id: string;
  group: "Home page" | "Other pages" | "Whole site";
  name: string;
  description: string;
  key: string;
  parse: (o: Record<string, unknown> | null) => T;
  Editor: (props: EditorProps<T>) => React.ReactNode;
  /** Problems that stop saving (empty required fields, bad links). */
  check?: (value: T) => string[];
};

/** Links anywhere in a section value (fields named `...Href`) that the website would refuse. */
function badLinks(value: unknown): string[] {
  const found: string[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if (k.endsWith("Href") && typeof x === "string" && x.trim() && !isSafeHref(x.trim())) found.push(`The link “${x}” is not valid. Use a site page like /courses or a full https:// link.`);
      else walk(x);
    }
  };
  walk(value);
  return found;
}
const need = (ok: boolean, message: string) => (ok ? [] : [message]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry pairs its own value type with its editor
const SECTIONS: SectionDef<any>[] = [
  { id: "layout", group: "Home page", name: "Section order", description: "Show, hide and reorder the home page sections.", key: SECTION_KEYS.layout, parse: parseLayout, Editor: LayoutEditor },
  {
    id: "hero", group: "Home page", name: "Hero slider", description: "The large slides at the top of the home page: photo, titles, button and badge.", key: SECTION_KEYS.hero, parse: parseHero, Editor: HeroEditor,
    check: (v: ReturnType<typeof parseHero>) => [...need(v.slides.every(s => s.titleLead.trim()), "Every slide needs a title."), ...need(!!v.dockTitle.trim(), "The programs bar needs a heading.")],
  },
  {
    id: "features", group: "Home page", name: "Feature cards", description: "The cards just under the hero (Expert Faculty, Smart Learning…).", key: SECTION_KEYS.features, parse: parseFeatures, Editor: FeaturesEditor,
    check: (v: ReturnType<typeof parseFeatures>) => need(v.items.every(f => f.title.trim()), "Every card needs a title."),
  },
  {
    id: "programs", group: "Home page", name: "Programs", description: "The programs section heading, and each program card's title, icon or visibility (also used in the footer and the hero bar).", key: SECTION_KEYS.programs, parse: parsePrograms, Editor: ProgramsEditor,
    check: (v: ReturnType<typeof parsePrograms>) => need(!!v.title.trim(), "The section needs a heading."),
  },
  {
    id: "updates", group: "Home page", name: "Latest updates", description: "News and announcements: admissions, exam dates, pamphlets, new batches. Shown on the home page and at /updates.", key: SECTION_KEYS.updates, parse: parseUpdates, Editor: UpdatesEditor,
    check: (v: ReturnType<typeof parseUpdates>) => [...need(!!v.title.trim(), "The section needs a heading."), ...need(v.items.every(u => u.title.trim()), "Every update needs a title.")],
  },
  {
    id: "faculty", group: "Home page", name: "Faculty", description: "The faculty section: heading, and which teachers are shown in which order.", key: SECTION_KEYS.faculty, parse: parseFaculty, Editor: FacultyEditor,
    check: (v: ReturnType<typeof parseFaculty>) => [...need(!!v.title.trim(), "The section needs a heading."), ...need(!!v.linkLabel.trim(), "The link needs text.")],
  },
  {
    id: "gallery", group: "Home page", name: "Gallery card", description: "The “Life at EduPulse” card that links to the gallery.", key: SECTION_KEYS.gallery, parse: parseGallery, Editor: GalleryEditor,
    check: (v: ReturnType<typeof parseGallery>) => [...need(!!v.title.trim(), "The card needs a heading."), ...need(!!v.linkLabel.trim(), "The link needs text.")],
  },
  {
    id: "contact", group: "Home page", name: "Callback card", description: "The “Request a callback” card next to the gallery card.", key: SECTION_KEYS.contact, parse: parseContactCard, Editor: ContactCardEditor,
    check: (v: ReturnType<typeof parseContactCard>) => need(!!v.title.trim() && !!v.primaryLabel.trim() && !!v.secondaryLabel.trim(), "Fill in the heading and both button texts."),
  },
  {
    id: "contact-info", group: "Whole site", name: "Contact details & footer", description: "Phone numbers, WhatsApp, email, address, social links and footer text, used on every page.", key: SECTION_KEYS.contactInfo, parse: parseContactInfo, Editor: ContactInfoEditor,
    check: (v: ReturnType<typeof parseContactInfo>) => [
      ...need(v.phones.length > 0 && v.phones.every(p => p.display.trim()), "Every phone number needs the text to show."),
      ...need(/^\d{8,15}$/.test(v.whatsapp.replace(/\D/g, "")), "Enter the WhatsApp number as digits with the country code, e.g. 917015628794."),
      ...need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()), "Enter a valid email address."),
      ...need(!!v.address.trim(), "Enter the address."),
      ...[v.instagram, v.facebook, v.youtube].filter(x => x.trim() && !/^https:\/\//.test(x.trim())).map(x => `Social links must start with https:// (“${x}”).`),
    ],
  },
];

SECTIONS.push(
  {
    id: "about", group: "Other pages", name: "About page", description: "Every section of /aboutus: texts, photos, leadership messages, numbers, values and which sections show.", key: PAGE_KEYS.about, parse: parseAbout, Editor: AboutEditor,
    check: (v: ReturnType<typeof parseAbout>) => [
      ...need(!!v.hero.titleLead.trim(), "The page needs a title."),
      ...need(v.leadership.leaders.every(l => l.name.trim() && l.message.some(p => p.trim())), "Every leader needs a name and a message."),
      ...need(v.stats.every(x => x.value.trim() && x.label.trim()), "Every number needs both parts."),
      ...need(v.values.items.every(x => x.title.trim()), "Every value card needs a title."),
    ],
  },
  {
    id: "gallery-page", group: "Other pages", name: "Gallery page", description: "The /gallery page: heading, filter categories, and every photo and video.", key: PAGE_KEYS.gallery, parse: parseGalleryPage, Editor: GalleryPageEditor,
    check: (v: ReturnType<typeof parseGalleryPage>) => [
      ...need(!!v.titleLead.trim(), "The page needs a title."),
      ...need(v.items.every(i => i.title.trim()), "Every photo and video needs a title."),
      ...need(v.items.every(i => i.kind === "video" || !!i.image), "Every photo needs an uploaded picture."),
      ...need(v.items.every(i => i.kind === "photo" || isLocalVideo(i.video.trim()) || !!toEmbed(i.video.trim())), "Every video needs a YouTube, Vimeo or Google Drive link."),
    ],
  },
  {
    id: "pamphlet", group: "Other pages", name: "Pamphlet", description: "The /pamphlet page (Sainik School admissions): every text, date and subject. It can also be downloaded as an image from the page.", key: PAGE_KEYS.pamphlet, parse: parsePamphlet, Editor: PamphletEditor,
    check: (v: ReturnType<typeof parsePamphlet>) => [
      ...need(!!v.pageTitle.trim() && !!v.titleTop.trim() && !!v.examTitle.trim(), "Fill in the tab title, the big title and the preparation title."),
      ...need(v.dates.every(d => d.label.trim() && d.value.trim()), "Every date needs both parts."),
      ...need(!v.portalUrl.trim() || /^https:\/\//.test(v.portalUrl.trim()), "The official portal link must start with https://."),
    ],
  },
);

type NavItem = { id: string; name: string; group: string };
const NAV: NavItem[] = [
  ...SECTIONS.filter(s => s.group === "Home page"),
  { id: "results", name: "Results & achievements", group: "Home page" },
  ...SECTIONS.filter(s => s.group === "Other pages"),
  ...SECTIONS.filter(s => s.group === "Whole site"),
  { id: "other", name: "Ticker, scholarship & all blocks", group: "Whole site" },
].map(s => ({ id: s.id, name: s.name, group: s.group }));
const NAV_GROUPS = [...new Set(NAV.map(n => n.group))];

const STATUS_TONES = { default: "gray", live: "green", draft: "amber" } as const;

function StatusPill({ block }: { block?: ContentBlock }) {
  if (!block) return <Pill value="default" tones={STATUS_TONES} label="Built-in default" />;
  return block.is_published
    ? <Pill value="live" tones={STATUS_TONES} label={`Live · updated ${formatDate(block.updated_at, true)}`} />
    : <Pill value="draft" tones={STATUS_TONES} label="Saved but not published" />;
}

export default function WebsiteEditor() {
  const { data, error, loading, reload } = useAdminData(token => websiteContentApi.list(token), "website-sections");
  const [active, setActive] = useState("hero");
  const blocks = data ?? [];
  const section = SECTIONS.find(s => s.id === active);

  return <>
    <PageHeader
      title="Website"
      description="Edit every section of the public website. Changes go live as soon as you save."
      actions={<Button asChild variant="outline"><a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink /> View website</a></Button>}
    />
    {error && <ErrorAlert message={error} onRetry={reload} />}
    <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label="Website sections" className="lg:sticky lg:top-20 lg:self-start">
        <div className="lg:hidden">
          <Label htmlFor="website-section" className="sr-only">Section</Label>
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger id="website-section" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{NAV.map(n => <SelectItem key={n.id} value={n.id}>{n.group}: {n.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="hidden gap-4 lg:grid">{NAV_GROUPS.map(group => <div key={group} className="grid gap-1">
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group}</p>
          <ul className="grid gap-1">{NAV.filter(n => n.group === group).map(n => <li key={n.id}>
            <button type="button" onClick={() => setActive(n.id)} aria-current={active === n.id ? "page" : undefined}
              className={cn("w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted", active === n.id && "bg-muted font-medium text-primary")}>{n.name}</button>
          </li>)}</ul>
        </div>)}</div>
      </nav>
      <div className="min-w-0">
        {loading && !data ? <Card><CardContent className="pt-6"><LoadingRows rows={5} /></CardContent></Card>
          : section ? <SectionPanel key={section.id} def={section} blocks={blocks} reload={reload} />
          : active === "results" ? <ResultsPanel blocks={blocks} reload={reload} />
          : <WebsiteContent embedded />}
      </div>
    </div>
  </>;
}

/** Saves the section, then asks the website to refresh its cached pages. */
function useSaver(reload: () => void) {
  const { withToken } = useAuth();
  const [busy, setBusy] = useState(false);
  async function run(action: (token: string) => Promise<unknown>, success: string, failure: string) {
    setBusy(true);
    try {
      await withToken(action);
      const refreshed = await withToken(token => refreshPublicSite(token));
      toast.success(refreshed ? `${success} It is live on the website now.` : `${success} The website shows it within 5 minutes.`);
      reload();
      return true;
    } catch (e) {
      toast.error(errorText(e, failure));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

function SectionPanel<T>({ def, blocks, reload }: { def: SectionDef<T>; blocks: Blocks; reload: () => void }) {
  const block = blocks.find(b => b.content_key === def.key);
  const saved = useMemo(() => def.parse(readJson(asApi(blocks), def.key)), [blocks, def]);
  const [draft, setDraft] = useState<T>(saved);
  const [confirmReset, setConfirmReset] = useState(false);
  const { busy, run } = useSaver(reload);

  // A reload after saving brings the stored version back in (state adjusted while rendering, not in an effect).
  const [base, setBase] = useState(saved);
  if (base !== saved) { setBase(saved); setDraft(saved); }

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const problems = [...(def.check?.(draft) ?? []), ...badLinks(draft)];
  const { Editor } = def;

  const save = () => run(
    token => websiteContentApi.upsert(token, def.key, { body: JSON.stringify({ v: 1, ...draft }), isPublished: true }),
    `${def.name} saved.`, `Could not save ${def.name}.`,
  );
  const restore = async () => {
    if (await run(token => websiteContentApi.remove(token, def.key), `${def.name} is back to the built-in default.`, "Could not restore the default.")) setConfirmReset(false);
  };

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-center gap-2"><CardTitle>{def.name}</CardTitle><StatusPill block={block} /></div>
      <CardDescription>{def.description}</CardDescription>
    </CardHeader>
    <CardContent><Editor value={draft} onChange={setDraft} /></CardContent>
    <CardFooter className="sticky bottom-0 z-10 flex-col items-stretch gap-3 border-t bg-card/95 py-4 backdrop-blur">
      {problems.length > 0 && <ul className="grid gap-1 text-sm text-destructive">{problems.slice(0, 4).map(p => <li key={p}>{p}</li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={busy || problems.length > 0 || (!dirty && block?.is_published)}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save &amp; publish</Button>
        <Button variant="outline" onClick={() => setDraft(saved)} disabled={busy || !dirty}><Undo2 /> Discard changes</Button>
        {block && <Button variant="ghost" className="ml-auto" onClick={() => setConfirmReset(true)} disabled={busy}><RotateCcw /> Restore default</Button>}
      </div>
    </CardFooter>
    <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore the built-in {def.name.toLowerCase()}?</AlertDialogTitle>
          <AlertDialogDescription>Your changes to this section are removed and the website shows its original content again. Uploaded images stay in storage.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); void restore(); }}>Restore default</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Card>;
}

// ---------------------------------------------------------------------------
// Results: keeps the original one-line-per-entry blocks (home.results, home.highlights)
// ---------------------------------------------------------------------------

type ResultsDraft = { heading: string; header: ResultsHeader; achievements: { name: string; achievement: string; tag: string }[]; highlights: { value: string; label: string }[] };

/** The "|" separates the parts of a line, so it cannot appear inside a part. */
const part = (v: string) => v.replace(/\|/g, "/").replace(/\s+/g, " ").trim();

function ResultsPanel({ blocks, reload }: { blocks: Blocks; reload: () => void }) {
  const saved = useMemo<ResultsDraft>(() => {
    // The admin list includes unpublished blocks; read them as the website would once published.
    const all = asApi(blocks).map(b => ({ ...b }));
    const r = parseHomeResults(all);
    return {
      heading: r.heading ?? "",
      header: parseResultsHeader(readJson(all, SECTION_KEYS.resultsHeader)),
      achievements: r.achievements.map(a => ({ name: a.name, achievement: a.achievement, tag: a.tag ?? "" })),
      highlights: r.highlights,
    };
  }, [blocks]);
  const [draft, setDraft] = useState(saved);
  const [base, setBase] = useState(saved);
  if (base !== saved) { setBase(saved); setDraft(saved); }
  const { busy, run } = useSaver(reload);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const problems = [
    ...need(draft.achievements.every(a => a.name.trim() && a.achievement.trim()), "Every result needs the student's name and what they achieved."),
    ...need(draft.highlights.every(h => h.value.trim() && h.label.trim()), "Every headline number needs the number and what it counts."),
  ];
  const blockOf = (key: string) => blocks.find(b => b.content_key === key);

  const save = () => run(async token => {
    await websiteContentApi.upsert(token, "home.results", {
      title: draft.heading.trim() || null,
      body: draft.achievements.map(a => [part(a.name), part(a.achievement), part(a.tag)].filter((x, i) => i < 2 || x).join(" | ")).join("\n"),
      isPublished: true,
    });
    await websiteContentApi.upsert(token, "home.highlights", { body: draft.highlights.map(h => `${part(h.value)} | ${part(h.label)}`).join("\n"), isPublished: true });
    await websiteContentApi.upsert(token, SECTION_KEYS.resultsHeader, { body: JSON.stringify({ v: 1, ...draft.header }), isPublished: true });
  }, "Results saved.", "Could not save the results.");

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-center gap-2"><CardTitle>Results &amp; achievements</CardTitle><StatusPill block={blockOf("home.results")} /></div>
      <CardDescription>Toppers and selections shown on the home page. The section stays hidden until it has at least one result or headline number. Only publish results you have the student&apos;s (or parent&apos;s) permission to share.</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-6">
      <ResultsHeaderEditor value={draft.header} onChange={header => setDraft({ ...draft, header })} />
      <TextField label="Heading" value={draft.heading} max={255} placeholder="Our students, their milestones." hint="Leave empty for the built-in heading." onChange={heading => setDraft({ ...draft, heading })} />
      <div className="grid gap-2">
        <p className="text-sm font-medium">Headline numbers (up to 4)</p>
        <ListEditor items={draft.highlights} onChange={highlights => setDraft({ ...draft, highlights })} create={() => ({ value: "", label: "" })} max={4} addLabel="Add a number"
          itemLabel={h => h.value ? `${h.value} ${h.label}` : "Number"}
          render={(h, update, i) => <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <div className="grid gap-1.5"><Label htmlFor={`highlight-${i}`}>Number</Label><Input id={`highlight-${i}`} value={h.value} maxLength={20} placeholder="120+" onChange={e => update({ ...h, value: e.target.value })} /></div>
            <TextField label="What it counts" required value={h.label} max={80} placeholder="Sainik School selections" onChange={label => update({ ...h, label })} />
          </div>} />
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Results (up to 12)</p>
        <ListEditor items={draft.achievements} onChange={achievements => setDraft({ ...draft, achievements })} create={() => ({ name: "", achievement: "", tag: "" })} max={12} addLabel="Add a result"
          itemLabel={a => a.name || "Result"}
          render={(a, update) => <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Student name" required value={a.name} max={80} onChange={name => update({ ...a, name })} />
            <TextField label="What they achieved" required value={a.achievement} max={160} placeholder="Selected for Sainik School Lucknow" onChange={achievement => update({ ...a, achievement })} />
            <TextField label="Exam & year" value={a.tag} max={40} placeholder="AISSEE 2026" onChange={tag => update({ ...a, tag })} />
          </div>} />
      </div>
    </CardContent>
    <CardFooter className="sticky bottom-0 z-10 flex-col items-stretch gap-3 border-t bg-card/95 py-4 backdrop-blur">
      {problems.length > 0 && <ul className="grid gap-1 text-sm text-destructive">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void save()} disabled={busy || problems.length > 0 || !dirty}>{busy ? <Loader2 className="animate-spin" /> : <Save />} Save &amp; publish</Button>
        <Button variant="outline" onClick={() => setDraft(saved)} disabled={busy || !dirty}><Undo2 /> Discard changes</Button>
      </div>
    </CardFooter>
  </Card>;
}
