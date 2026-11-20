"use client";

import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ABOUT_SECTION_IDS, isLocalVideo, type AboutLeader, type AboutPageContent, type AboutSectionId, type GalleryItem, type GalleryPageContent, type PamphletContent,
} from "@/lib/site-pages";
import { toEmbed } from "@/lib/video-embed";
import { IconField, ImageField, ListEditor, TextAreaField, TextField } from "./fields";
import type { EditorProps } from "./section-editors";

const grid2 = "grid gap-4 sm:grid-cols-2";

function Group({ title, children, hidden, onToggle }: { title: string; children: React.ReactNode; hidden?: boolean; onToggle?: () => void }) {
  return <section className="grid gap-4 rounded-lg border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className={hidden ? "font-semibold text-muted-foreground line-through" : "font-semibold"}>{title}</h3>
      {onToggle && <Button type="button" size="sm" variant={hidden ? "outline" : "ghost"} onClick={onToggle}>{hidden ? <><EyeOff /> Hidden</> : <><Eye /> Shown</>}</Button>}
    </div>
    {children}
  </section>;
}

/** A list of short texts (subjects, class names, categories). */
function StringList({ label, items, onChange, max, each, addLabel, placeholder }: {
  label: string; items: string[]; onChange: (v: string[]) => void; max: number; each: number; addLabel: string; placeholder?: string;
}) {
  return <div className="grid gap-2">
    <p className="text-sm font-medium">{label}</p>
    <ListEditor items={items} onChange={onChange} create={() => ""} max={max} addLabel={addLabel} itemLabel={(v, i) => v || `Item ${i + 1}`}
      render={(v, update) => <TextField label="Text" required value={v} max={each} placeholder={placeholder} onChange={update} />} />
  </div>;
}

// ---------------------------------------------------------------------------
// About page
// ---------------------------------------------------------------------------

const newLeader = (): AboutLeader => ({ name: "", role: "", label: "", image: "", imageAlt: "", message: [""] });

export function AboutEditor({ value, onChange }: EditorProps<AboutPageContent>) {
  const v = value;
  const set = <K extends keyof AboutPageContent>(k: K, next: AboutPageContent[K]) => onChange({ ...v, [k]: next });
  const toggle = (id: AboutSectionId) => set("hidden", v.hidden.includes(id) ? v.hidden.filter(x => x !== id) : [...v.hidden, id]);
  const isHidden = (id: AboutSectionId) => v.hidden.includes(id);
  const h = v.hero;
  return <div className="grid gap-5">
    <Group title="Top of the page">
      <TextField label="Small heading" value={h.kicker} max={80} onChange={kicker => set("hero", { ...h, kicker })} />
      <div className={grid2}>
        <TextField label="Title (first part)" required value={h.titleLead} max={60} onChange={titleLead => set("hero", { ...h, titleLead })} />
        <TextField label="Title (highlighted part)" value={h.titleEmphasis} max={60} onChange={titleEmphasis => set("hero", { ...h, titleEmphasis })} />
      </div>
      <TextAreaField label="First paragraph" value={h.intro} max={500} onChange={intro => set("hero", { ...h, intro })} />
      <TextAreaField label="Second paragraph" value={h.intro2} max={500} onChange={intro2 => set("hero", { ...h, intro2 })} />
      <ImageField label="Photo" optional={false} value={h.image} onChange={image => set("hero", { ...h, image: image || h.image })} />
      <TextField label="Describe the photo (for screen readers)" value={h.imageAlt} max={200} onChange={imageAlt => set("hero", { ...h, imageAlt })} />
      <div className={grid2}>
        <TextField label="Caption: small line" value={h.captionSmall} max={60} onChange={captionSmall => set("hero", { ...h, captionSmall })} />
        <TextAreaField label="Caption: big text" value={h.captionTitle} max={120} rows={2} hint="Press Enter for a new line." onChange={captionTitle => set("hero", { ...h, captionTitle })} />
        <TextField label="Badge on the photo" value={h.badge} max={60} onChange={badge => set("hero", { ...h, badge })} />
        <div />
        <TextField label="Button text (jumps to leadership)" value={h.primaryLabel} max={40} onChange={primaryLabel => set("hero", { ...h, primaryLabel })} />
        <TextField label="Link text (opens Faculty)" value={h.secondaryLabel} max={40} onChange={secondaryLabel => set("hero", { ...h, secondaryLabel })} />
      </div>
    </Group>

    <Group title="Numbers strip" hidden={isHidden("stats")} onToggle={() => toggle("stats")}>
      <ListEditor items={v.stats} onChange={stats => set("stats", stats)} create={() => ({ value: "", label: "" })} max={6} addLabel="Add a number"
        itemLabel={s => s.value ? `${s.value} ${s.label}` : "Number"}
        render={(s, update) => <div className={grid2}>
          <TextField label="Number" required value={s.value} max={20} placeholder="e.g. 500+, Grade 6, 2024" hint="Numbers count up when shown." onChange={value => update({ ...s, value })} />
          <TextField label="What it means" required value={s.label} max={60} onChange={label => update({ ...s, label })} />
        </div>} />
    </Group>

    <Group title="Leadership messages" hidden={isHidden("leadership")} onToggle={() => toggle("leadership")}>
      <div className={grid2}>
        <TextField label="Small heading" value={v.leadership.kicker} max={80} onChange={kicker => set("leadership", { ...v.leadership, kicker })} />
        <TextField label="Heading" required value={v.leadership.title} max={80} onChange={title => set("leadership", { ...v.leadership, title })} />
      </div>
      <TextField label="Heading (highlighted part)" value={v.leadership.titleAccent} max={80} onChange={titleAccent => set("leadership", { ...v.leadership, titleAccent })} />
      <ListEditor items={v.leadership.leaders} onChange={leaders => set("leadership", { ...v.leadership, leaders })} create={newLeader} max={6} addLabel="Add a person"
        itemLabel={l => l.name || "Person"}
        render={(l, update) => <>
          <div className={grid2}>
            <TextField label="Name" required value={l.name} max={80} onChange={name => update({ ...l, name })} />
            <TextField label="Role" value={l.role} max={80} placeholder="Co-Founder & Director" onChange={role => update({ ...l, role })} />
          </div>
          <ImageField label="Portrait" value={l.image} onChange={image => update({ ...l, image })} hint="A square or portrait photo works best." />
          <div className={grid2}>
            <TextField label="Describe the photo" value={l.imageAlt} max={200} onChange={imageAlt => update({ ...l, imageAlt })} />
            <TextField label="Label under the photo" value={l.label} max={60} onChange={label => update({ ...l, label })} />
          </div>
          <TextAreaField label="Message" required value={l.message.join("\n\n")} max={3000} rows={6} hint="Leave an empty line between paragraphs." onChange={text => update({ ...l, message: text.split(/\n\s*\n/) })} />
        </>} />
    </Group>

    <Group title="Faculty strip" hidden={isHidden("faculty")} onToggle={() => toggle("faculty")}>
      <div className={grid2}>
        <TextField label="Small heading" value={v.faculty.kicker} max={80} onChange={kicker => set("faculty", { ...v.faculty, kicker })} />
        <TextField label="Heading" required value={v.faculty.title} max={80} onChange={title => set("faculty", { ...v.faculty, title })} />
        <TextField label="Heading (highlighted part)" value={v.faculty.titleAccent} max={80} onChange={titleAccent => set("faculty", { ...v.faculty, titleAccent })} />
        <TextField label="Button text" required value={v.faculty.buttonLabel} max={40} onChange={buttonLabel => set("faculty", { ...v.faculty, buttonLabel })} />
      </div>
      <TextAreaField label="Text" value={v.faculty.intro} max={400} onChange={intro => set("faculty", { ...v.faculty, intro })} />
      <p className="text-xs text-muted-foreground">The subject cards next to it come from the Faculty page.</p>
    </Group>

    <Group title="Mission, values & vision" hidden={isHidden("values")} onToggle={() => toggle("values")}>
      <div className={grid2}>
        <TextField label="Small heading" value={v.values.kicker} max={80} onChange={kicker => set("values", { ...v.values, kicker })} />
        <TextField label="Heading" required value={v.values.title} max={80} onChange={title => set("values", { ...v.values, title })} />
      </div>
      <TextField label="Heading (highlighted part)" value={v.values.titleAccent} max={80} onChange={titleAccent => set("values", { ...v.values, titleAccent })} />
      <ListEditor items={v.values.items} onChange={items => set("values", { ...v.values, items })} create={(): AboutPageContent["values"]["items"][number] => ({ icon: "Star", title: "", description: "" })} max={8} addLabel="Add a card"
        itemLabel={c => c.title || "Card"}
        render={(c, update) => <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <IconField label="Icon" value={c.icon} onChange={icon => update({ ...c, icon })} />
          <div className="grid gap-4">
            <TextField label="Title" required value={c.title} max={60} onChange={title => update({ ...c, title })} />
            <TextField label="Text" value={c.description} max={160} onChange={description => update({ ...c, description })} />
          </div>
        </div>} />
    </Group>

    <Group title="Recognition card" hidden={isHidden("recognition")} onToggle={() => toggle("recognition")}>
      <ImageField label="Photo" value={v.recognition.image} onChange={image => set("recognition", { ...v.recognition, image })} />
      <TextField label="Describe the photo" value={v.recognition.imageAlt} max={200} onChange={imageAlt => set("recognition", { ...v.recognition, imageAlt })} />
      <div className={grid2}>
        <TextField label="Small heading" value={v.recognition.kicker} max={60} onChange={kicker => set("recognition", { ...v.recognition, kicker })} />
        <TextField label="Heading" required value={v.recognition.title} max={100} onChange={title => set("recognition", { ...v.recognition, title })} />
      </div>
      <TextAreaField label="Text" value={v.recognition.text} max={400} onChange={text => set("recognition", { ...v.recognition, text })} />
      <TextField label="Button text (opens the gallery)" value={v.recognition.buttonLabel} max={40} onChange={buttonLabel => set("recognition", { ...v.recognition, buttonLabel })} />
    </Group>

    <Group title="“The right support” section" hidden={isHidden("learning")} onToggle={() => toggle("learning")}>
      <ImageField label="Photo" value={v.learning.image} onChange={image => set("learning", { ...v.learning, image })} />
      <TextField label="Describe the photo" value={v.learning.imageAlt} max={200} onChange={imageAlt => set("learning", { ...v.learning, imageAlt })} />
      <div className={grid2}>
        <TextField label="Small heading" value={v.learning.kicker} max={60} onChange={kicker => set("learning", { ...v.learning, kicker })} />
        <TextField label="Heading" required value={v.learning.title} max={80} onChange={title => set("learning", { ...v.learning, title })} />
        <TextField label="Heading (highlighted part)" value={v.learning.titleAccent} max={80} onChange={titleAccent => set("learning", { ...v.learning, titleAccent })} />
        <TextField label="Button text (opens Courses)" value={v.learning.buttonLabel} max={40} onChange={buttonLabel => set("learning", { ...v.learning, buttonLabel })} />
      </div>
      <TextAreaField label="Text" value={v.learning.intro} max={400} onChange={intro => set("learning", { ...v.learning, intro })} />
    </Group>

    <Group title="Visit us (map)" hidden={isHidden("visit")} onToggle={() => toggle("visit")}>
      <div className={grid2}>
        <TextField label="Small heading" value={v.visit.kicker} max={60} onChange={kicker => set("visit", { ...v.visit, kicker })} />
        <TextField label="Heading" required value={v.visit.title} max={60} onChange={title => set("visit", { ...v.visit, title })} />
        <TextField label="Heading (highlighted part)" value={v.visit.titleAccent} max={60} onChange={titleAccent => set("visit", { ...v.visit, titleAccent })} />
        <TextField label="Closing line" value={v.visit.closing} max={200} onChange={closing => set("visit", { ...v.visit, closing })} />
      </div>
      <p className="text-xs text-muted-foreground">The address and map come from “Contact details &amp; footer”.</p>
    </Group>
    {ABOUT_SECTION_IDS.every(id => v.hidden.includes(id)) && <p className="text-sm text-destructive">Every section below the top is hidden.</p>}
  </div>;
}

// ---------------------------------------------------------------------------
// Gallery page
// ---------------------------------------------------------------------------

const POSITIONS = [["center top", "Top"], ["center 30%", "Upper"], ["center", "Middle"], ["center 70%", "Lower"], ["center bottom", "Bottom"]] as const;

function GalleryItemFields({ item, update, categories }: { item: GalleryItem; update: (i: GalleryItem) => void; categories: string[] }) {
  const id = useId();
  const videoOk = !item.video.trim() || isLocalVideo(item.video.trim()) || !!toEmbed(item.video.trim());
  return <>
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={item.kind === "photo" ? "default" : "outline"} onClick={() => update({ ...item, kind: "photo" })}>Photo</Button>
      <Button type="button" size="sm" variant={item.kind === "video" ? "default" : "outline"} onClick={() => update({ ...item, kind: "video" })}>Video</Button>
    </div>
    {item.kind === "video" && <div className="grid gap-1.5">
      <TextField label="Video link" required value={item.video} max={500} placeholder="https://www.youtube.com/watch?v=…" hint="A YouTube, Vimeo or Google Drive link. Upload the video to YouTube (unlisted is fine) and paste its link." onChange={video => update({ ...item, video })} />
      {!videoOk && <p className="text-xs text-destructive">This link is not a YouTube, Vimeo or Google Drive video.</p>}
    </div>}
    <ImageField label={item.kind === "photo" ? "Photo" : "Cover picture"} optional={item.kind === "video"} value={item.image} onChange={image => update({ ...item, image })}
      hint={item.kind === "video" ? "Optional for YouTube: its own thumbnail is used." : undefined} />
    <div className={grid2}>
      <TextField label="Title" required value={item.title} max={80} onChange={title => update({ ...item, title })} />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-cat`}>Category</Label>
        <Select value={item.category || undefined} onValueChange={category => update({ ...item, category })}>
          <SelectTrigger id={`${id}-cat`} className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
    <TextField label="Caption" value={item.description} max={200} onChange={description => update({ ...item, description })} />
    <div className={grid2}>
      <TextField label="Describe the picture (for screen readers)" value={item.alt} max={200} onChange={alt => update({ ...item, alt })} />
      <div className="grid gap-1.5">
        <Label>Which part of the picture to show in the grid</Label>
        <div className="flex flex-wrap gap-1">{POSITIONS.map(([pos, name]) => <Button key={pos} type="button" size="sm" variant={item.position === pos ? "default" : "outline"} onClick={() => update({ ...item, position: pos })}>{name}</Button>)}</div>
      </div>
    </div>
  </>;
}

export function GalleryPageEditor({ value, onChange }: EditorProps<GalleryPageContent>) {
  const v = value;
  return <div className="grid gap-5">
    <Group title="Heading">
      <div className={grid2}>
        <TextField label="Small heading" value={v.kicker} max={60} onChange={kicker => onChange({ ...v, kicker })} />
        <TextField label="Title" required value={v.titleLead} max={80} onChange={titleLead => onChange({ ...v, titleLead })} />
      </div>
      <TextField label="Title (highlighted line)" value={v.titleAccent} max={80} onChange={titleAccent => onChange({ ...v, titleAccent })} />
      <TextAreaField label="Intro text" value={v.intro} max={400} onChange={intro => onChange({ ...v, intro })} />
      <TextAreaField label="Note under the heading" value={v.note} max={300} rows={2} onChange={note => onChange({ ...v, note })} />
    </Group>
    <Group title="Categories (filter buttons)">
      <StringList label="Categories, in order" items={v.categories} onChange={categories => onChange({ ...v, categories })} max={12} each={30} addLabel="Add a category" placeholder="e.g. Results" />
    </Group>
    <Group title={`Photos & videos (${v.items.length})`}>
      <p className="text-sm text-muted-foreground">The first items show first. Add new ones, then move them to the top.</p>
      <ListEditor items={v.items} onChange={items => onChange({ ...v, items })} max={200} addLabel="Add a photo or video"
        create={(): GalleryItem => ({ kind: "photo", image: "", video: "", title: "", category: v.categories[0] ?? "", description: "", alt: "", position: "center" })}
        itemLabel={i => `${i.kind === "video" ? "Video" : "Photo"}: ${i.title || "untitled"}`}
        render={(item, update) => <GalleryItemFields item={item} update={update} categories={v.categories} />} />
    </Group>
  </div>;
}

// ---------------------------------------------------------------------------
// Pamphlet
// ---------------------------------------------------------------------------

export function PamphletEditor({ value, onChange }: EditorProps<PamphletContent>) {
  const v = value;
  const t = (k: keyof PamphletContent) => (s: string) => onChange({ ...v, [k]: s });
  return <div className="grid gap-5">
    <Group title="Page">
      <TextField label="Browser tab title" required value={v.pageTitle} max={80} onChange={t("pageTitle")} />
      <TextAreaField label="Description for Google" value={v.pageDescription} max={300} rows={2} onChange={t("pageDescription")} />
    </Group>
    <Group title="Header">
      <div className={grid2}>
        <TextField label="Message" value={v.headerMessage} max={60} onChange={t("headerMessage")} />
        <TextField label="Line under it" value={v.headerSub} max={80} hint="Use “ · ” to separate parts." onChange={t("headerSub")} />
      </div>
    </Group>
    <Group title="Left panel: admissions">
      <div className={grid2}>
        <TextField label="Badge" value={v.badge} max={40} onChange={t("badge")} />
        <TextField label="Corner text" value={v.panelOne} max={40} onChange={t("panelOne")} />
        <TextField label="Big title" required value={v.titleTop} max={40} onChange={t("titleTop")} />
        <TextAreaField label="Title second line" value={v.titleSub} max={80} rows={2} hint="Press Enter for a new line." onChange={t("titleSub")} />
      </div>
      <StringList label="Classes" items={v.classes} onChange={classes => onChange({ ...v, classes })} max={4} each={20} addLabel="Add a class" placeholder="CLASS VI" />
      <div className={grid2}>
        <TextField label="Academic session" value={v.session} max={20} onChange={t("session")} />
        <div />
        <TextField label="Highlight: label" value={v.noticeLabel} max={60} onChange={t("noticeLabel")} />
        <TextField label="Highlight: date or text" value={v.noticeValue} max={60} onChange={t("noticeValue")} />
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Important dates</p>
        <ListEditor items={v.dates} onChange={dates => onChange({ ...v, dates })} create={() => ({ label: "", value: "" })} max={4} addLabel="Add a date"
          itemLabel={d => d.label || "Date"}
          render={(d, update) => <div className={grid2}>
            <TextField label="What" required value={d.label} max={60} onChange={label => update({ ...d, label })} />
            <TextField label="When" required value={d.value} max={80} onChange={value => update({ ...d, value })} />
          </div>} />
      </div>
      <TextField label="Closing line" value={v.footnote} max={120} onChange={t("footnote")} />
    </Group>
    <Group title="Right panel: preparation">
      <div className={grid2}>
        <TextField label="Label" value={v.sectionLabel} max={40} onChange={t("sectionLabel")} />
        <TextField label="Corner text" value={v.panelTwo} max={40} onChange={t("panelTwo")} />
        <TextField label="Small line above the title" value={v.enrolLabel} max={40} onChange={t("enrolLabel")} />
        <TextField label="Title" required value={v.examTitle} max={30} onChange={t("examTitle")} />
        <TextField label="Title second line" value={v.examSub} max={30} onChange={t("examSub")} />
        <TextField label="Text" value={v.guidance} max={120} onChange={t("guidance")} />
      </div>
      <StringList label="Subjects" items={v.subjects} onChange={subjects => onChange({ ...v, subjects })} max={10} each={40} addLabel="Add a subject" />
      <div className={grid2}>
        <TextField label="Contact box: small line" value={v.contactEyebrow} max={60} onChange={t("contactEyebrow")} />
        <TextField label="Contact box: title" value={v.contactTitle} max={80} onChange={t("contactTitle")} />
        <TextField label="Location line" value={v.location} max={80} onChange={t("location")} />
      </div>
      <p className="text-xs text-muted-foreground">The phone numbers come from “Contact details &amp; footer”.</p>
    </Group>
    <Group title="Footer">
      <div className={grid2}>
        <TextField label="Motto" value={v.footerLead} max={40} onChange={t("footerLead")} />
        <TextField label="Motto (bold part)" value={v.footerAccent} max={40} onChange={t("footerAccent")} />
        <TextField label="Official portal link" value={v.portalUrl} max={300} hint="Must start with https://. Leave empty to hide." onChange={t("portalUrl")} />
        <TextField label="Official portal text" value={v.portalLabel} max={80} onChange={t("portalLabel")} />
      </div>
    </Group>
  </div>;
}
