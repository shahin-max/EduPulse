"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { request, type ApiFaculty } from "@/lib/api";
import { programs } from "@/lib/site";
import { SITE_ICON_NAMES, SITE_ICONS, type SiteIconName } from "@/lib/site-icons";
import type {
  ContactCard, ContactInfo, FacultySectionText, FeaturesSection, GalleryCard, HeroSection, HeroSlide, HomeLayout,
  HomeSectionId, ProgramsSection, ResultsHeader, UpdateItem, UpdatesSection,
} from "@/lib/site-sections";
import { HOME_SECTION_IDS } from "@/lib/site-sections";
import { IconField, ImageField, LinkField, ListEditor, TextAreaField, TextField } from "./fields";

export type EditorProps<T> = { value: T; onChange: (value: T) => void };

const grid2 = "grid gap-4 sm:grid-cols-2";

// ---------------------------------------------------------------------------
// Section order and visibility
// ---------------------------------------------------------------------------

export const SECTION_NAMES: Record<HomeSectionId, string> = {
  features: "Feature cards (under the hero)",
  programs: "Programs",
  updates: "Latest updates",
  results: "Results & achievements",
  faculty: "Faculty",
  gallery: "Gallery card",
  contact: "Request a callback card",
};

export function LayoutEditor({ value, onChange }: EditorProps<HomeLayout>) {
  const move = (from: number, to: number) => {
    const order = [...value.order];
    const [id] = order.splice(from, 1);
    order.splice(to, 0, id);
    onChange({ ...value, order });
  };
  const toggle = (id: HomeSectionId) => onChange({ ...value, hidden: value.hidden.includes(id) ? value.hidden.filter(x => x !== id) : [...value.hidden, id] });
  return <div className="grid gap-2">
    <p className="text-sm text-muted-foreground">The hero slider is always first. The feature cards always sit just under it, so their position here does not matter. The gallery and callback cards share one row.</p>
    <ol className="grid gap-2">
      {value.order.map((id, i) => {
        const hidden = value.hidden.includes(id);
        return <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
          <span className={hidden ? "text-muted-foreground line-through" : "font-medium"}>{i + 1}. {SECTION_NAMES[id]}</span>
          <span className="flex gap-1">
            <Button type="button" size="sm" variant={hidden ? "outline" : "ghost"} onClick={() => toggle(id)}>{hidden ? <><EyeOff /> Hidden</> : <><Eye /> Shown</>}</Button>
            <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${SECTION_NAMES[id]} up`}><ArrowUp /></Button>
            <Button type="button" size="icon" variant="ghost" disabled={i === value.order.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${SECTION_NAMES[id]} down`}><ArrowDown /></Button>
          </span>
        </li>;
      })}
    </ol>
    {HOME_SECTION_IDS.length !== value.order.length && <p className="text-xs text-muted-foreground">Some sections are missing; restoring the default fixes it.</p>}
  </div>;
}

// ---------------------------------------------------------------------------
// Hero slider
// ---------------------------------------------------------------------------

const newSlide = (): HeroSlide => ({
  eyebrow: "", titleLead: "New slide title,", titleEmphasis: "", subtitle: "", ctaLabel: "Explore programs", ctaHref: "/courses",
  image: "/hero/foundation.jpg", imageAlt: "", imagePosition: "center", badge: "", programSlugs: [],
});

const POSITIONS = [["center top", "Top"], ["center 30%", "Upper"], ["center", "Middle"], ["center 70%", "Lower"], ["center bottom", "Bottom"]] as const;

export function HeroEditor({ value, onChange }: EditorProps<HeroSection>) {
  return <div className="grid gap-6">
    <ListEditor
      items={value.slides}
      onChange={slides => onChange({ ...value, slides })}
      create={newSlide}
      min={1}
      max={8}
      addLabel="Add a slide"
      itemLabel={s => `${s.titleLead} ${s.titleEmphasis}`.trim() || "Slide"}
      render={(s, update) => <>
        <ImageField label="Photo" value={s.image} optional={false} onChange={image => update({ ...s, image: image || s.image })} hint="A landscape photo works best (it is shown in a rounded card). JPEG, PNG, WebP or GIF, up to 5 MB." />
        <div className={grid2}>
          <TextField label="Describe the photo (for screen readers)" value={s.imageAlt} max={200} onChange={imageAlt => update({ ...s, imageAlt })} />
          <div className="grid gap-1.5">
            <Label>Which part of the photo to show</Label>
            <div className="flex flex-wrap gap-1">{POSITIONS.map(([pos, name]) => <Button key={pos} type="button" size="sm" variant={s.imagePosition === pos ? "default" : "outline"} onClick={() => update({ ...s, imagePosition: pos })}>{name}</Button>)}</div>
          </div>
        </div>
        <TextField label="Small heading above the title" value={s.eyebrow} max={80} placeholder="e.g. FOUNDATION CLASSES · GRADES 6–10" onChange={eyebrow => update({ ...s, eyebrow })} />
        <div className={grid2}>
          <TextField label="Title (first part)" required value={s.titleLead} max={80} onChange={titleLead => update({ ...s, titleLead })} />
          <TextField label="Title (highlighted part)" value={s.titleEmphasis} max={80} onChange={titleEmphasis => update({ ...s, titleEmphasis })} />
        </div>
        <TextAreaField label="Text under the title" value={s.subtitle} max={300} rows={2} onChange={subtitle => update({ ...s, subtitle })} />
        <div className={grid2}>
          <TextField label="Button text" value={s.ctaLabel} max={40} hint="Leave empty for no button." onChange={ctaLabel => update({ ...s, ctaLabel })} />
          <TextField label="Badge on the photo" value={s.badge} max={60} onChange={badge => update({ ...s, badge })} />
        </div>
        <LinkField label="Button link" value={s.ctaHref} required onChange={ctaHref => update({ ...s, ctaHref })} />
        <div className="grid gap-1.5">
          <Label>Programs to highlight in the “Our programs” bar while this slide shows</Label>
          <div className="grid gap-2 sm:grid-cols-2">{programs.map(p => <label key={p.slug} className="flex items-center gap-2 text-sm">
            <Checkbox checked={s.programSlugs.includes(p.slug)} onCheckedChange={on => update({ ...s, programSlugs: on ? [...s.programSlugs, p.slug] : s.programSlugs.filter(x => x !== p.slug) })} />
            {p.title}
          </label>)}</div>
        </div>
      </>}
    />
    <div className={grid2}>
      <TextField label="Location badge: first line" value={value.locationTitle} max={60} hint="Leave empty to hide the badge." onChange={locationTitle => onChange({ ...value, locationTitle })} />
      <TextField label="Location badge: second line" value={value.locationSubtitle} max={80} onChange={locationSubtitle => onChange({ ...value, locationSubtitle })} />
      <TextField label="Programs bar: small heading" value={value.dockKicker} max={40} onChange={dockKicker => onChange({ ...value, dockKicker })} />
      <TextField label="Programs bar: heading" required value={value.dockTitle} max={40} onChange={dockTitle => onChange({ ...value, dockTitle })} />
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Feature cards
// ---------------------------------------------------------------------------

export function FeaturesEditor({ value, onChange }: EditorProps<FeaturesSection>) {
  return <ListEditor
    items={value.items}
    onChange={items => onChange({ items })}
    create={(): FeaturesSection["items"][number] => ({ icon: "Star", title: "New feature", detail: "" })}
    max={8}
    addLabel="Add a card"
    itemLabel={f => f.title || "Card"}
    render={(f, update) => <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
      <IconField label="Icon" value={f.icon} onChange={icon => update({ ...f, icon })} />
      <div className="grid gap-4">
        <TextField label="Title" required value={f.title} max={60} onChange={title => update({ ...f, title })} />
        <TextField label="Text" value={f.detail} max={160} onChange={detail => update({ ...f, detail })} />
      </div>
    </div>}
  />;
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

function HeadingFields<T extends { kicker: string; title: string; titleAccent: string; intro: string }>({ value, onChange }: EditorProps<T>) {
  return <div className="grid gap-4">
    <div className={grid2}>
      <TextField label="Small heading" value={value.kicker} max={60} onChange={kicker => onChange({ ...value, kicker })} />
      <TextField label="Heading" required value={value.title} max={100} onChange={title => onChange({ ...value, title })} />
    </div>
    <TextField label="Heading (highlighted part)" value={value.titleAccent} max={100} onChange={titleAccent => onChange({ ...value, titleAccent })} />
    <TextAreaField label="Intro text" value={value.intro} max={300} rows={2} onChange={intro => onChange({ ...value, intro })} />
  </div>;
}

export function ProgramsEditor({ value, onChange }: EditorProps<ProgramsSection>) {
  const setCard = (slug: string, card: ProgramsSection["cards"][string]) => onChange({ ...value, cards: { ...value.cards, [slug]: card } });
  return <div className="grid gap-6">
    <HeadingFields value={value} onChange={onChange} />
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">Each program has its own course page. Here you can rename a card, change its icon or hide it from the home page and menus (its course page stays available). Leave a field empty to keep the built-in text.</p>
      {programs.map(p => {
        const card = value.cards[p.slug] ?? {};
        const DefaultIcon = p.icon;
        const iconName = card.icon ?? (SITE_ICON_NAMES.find(n => SITE_ICONS[n] === DefaultIcon) as SiteIconName | undefined) ?? "Star";
        return <fieldset key={p.slug} className="grid gap-4 rounded-lg border p-4">
          <legend className="sr-only">{p.title}</legend>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{p.title} <span className="text-xs font-normal text-muted-foreground">/courses/{p.slug}</span></p>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!card.hidden} onCheckedChange={on => setCard(p.slug, { ...card, hidden: on === true || undefined })} /> Hide on the website</label>
          </div>
          <div className="grid gap-4 sm:grid-cols-[14rem_1fr_1fr]">
            <IconField label="Icon" value={iconName} onChange={icon => setCard(p.slug, { ...card, icon })} />
            <TextField label="Title" value={card.title ?? ""} max={80} placeholder={p.title} onChange={title => setCard(p.slug, { ...card, title: title || undefined })} />
            <TextField label="Short line" value={card.detail ?? ""} max={80} placeholder={p.detail} onChange={detail => setCard(p.slug, { ...card, detail: detail || undefined })} />
          </div>
        </fieldset>;
      })}
    </div>
  </div>;
}

// ---------------------------------------------------------------------------
// Latest updates
// ---------------------------------------------------------------------------

const today = () => new Date().toISOString().slice(0, 10);
const newUpdate = (): UpdateItem => ({
  id: `update-${Date.now().toString(36)}`, title: "New update", date: today(), summary: "", badge: "", image: "", imageAlt: "", linkLabel: "", linkHref: "",
});

export function UpdatesEditor({ value, onChange }: EditorProps<UpdatesSection>) {
  return <div className="grid gap-6">
    <HeadingFields value={value} onChange={onChange} />
    <div className="grid gap-1.5 sm:max-w-xs">
      <Label htmlFor="updates-home-count">How many to show on the home page</Label>
      <Input id="updates-home-count" type="number" min={1} max={12} value={value.homeCount} onChange={e => onChange({ ...value, homeCount: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} />
      <p className="text-xs text-muted-foreground">The first ones in the list are shown; all of them are on the /updates page. Put the newest at the top.</p>
    </div>
    <ListEditor
      items={value.items}
      onChange={items => onChange({ ...value, items })}
      create={newUpdate}
      max={50}
      addLabel="Add an update"
      itemLabel={u => u.title || "Update"}
      render={(u, update) => <>
        <TextField label="Title" required value={u.title} max={120} placeholder="e.g. Sainik School Admission 2027" onChange={title => update({ ...u, title })} />
        <div className={grid2}>
          <div className="grid gap-1.5">
            <Label htmlFor={`${u.id}-date`}>Date <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id={`${u.id}-date`} type="date" value={u.date} onChange={e => update({ ...u, date: e.target.value })} />
          </div>
          <TextField label="Label" value={u.badge} max={40} placeholder="e.g. Admissions open, New batch, Result" onChange={badge => update({ ...u, badge })} />
        </div>
        <TextAreaField label="Details" value={u.summary} max={1000} rows={4} onChange={summary => update({ ...u, summary })} />
        <ImageField label="Poster or photo" value={u.image} onChange={image => update({ ...u, image })} hint="e.g. the pamphlet as an image. JPEG, PNG, WebP or GIF, up to 5 MB." />
        {u.image && <TextField label="Describe the image (for screen readers)" value={u.imageAlt} max={200} onChange={imageAlt => update({ ...u, imageAlt })} />}
        <div className={grid2}>
          <TextField label="Link text" value={u.linkLabel} max={40} placeholder="Read more" onChange={linkLabel => update({ ...u, linkLabel })} />
          <div />
        </div>
        <LinkField label="Link" value={u.linkHref} allowPdf hint="A page, a full link, or attach a PDF (e.g. the pamphlet or a notice)." onChange={linkHref => update({ ...u, linkHref })} />
      </>}
    />
  </div>;
}

// ---------------------------------------------------------------------------
// Results header, faculty, gallery and callback cards
// ---------------------------------------------------------------------------

export function ResultsHeaderEditor({ value, onChange }: EditorProps<ResultsHeader>) {
  return <div className={grid2}>
    <TextField label="Small heading" value={value.kicker} max={60} onChange={kicker => onChange({ ...value, kicker })} />
    <TextAreaField label="Intro text" value={value.intro} max={300} rows={2} onChange={intro => onChange({ ...value, intro })} />
  </div>;
}

export function FacultyEditor({ value, onChange }: EditorProps<FacultySectionText>) {
  const [teachers, setTeachers] = useState<ApiFaculty[] | null>(null);
  useEffect(() => {
    let live = true;
    request<ApiFaculty[]>("/faculty").then(list => { if (live) setTeachers(list); }).catch(() => { if (live) setTeachers([]); });
    return () => { live = false; };
  }, []);
  const picked = value.userIds;
  const toggle = (id: number) => onChange({ ...value, userIds: picked.includes(id) ? picked.filter(x => x !== id) : [...picked, id] });
  const move = (from: number, to: number) => {
    const ids = [...picked];
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    onChange({ ...value, userIds: ids });
  };
  const name = (id: number) => teachers?.find(t => t.user_id === id)?.users.full_name ?? `Teacher #${id} (no longer listed)`;

  return <div className="grid gap-6">
    <HeadingFields value={value} onChange={onChange} />
    <div className={grid2}>
      <TextField label="Link text" required value={value.linkLabel} max={40} onChange={linkLabel => onChange({ ...value, linkLabel })} />
      <div className="grid gap-1.5">
        <Label htmlFor="faculty-count">How many teachers to show</Label>
        <Input id="faculty-count" type="number" min={1} max={12} value={value.count} onChange={e => onChange({ ...value, count: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} />
      </div>
    </div>
    <div className="grid gap-2">
      <p className="text-sm font-medium">Teachers on the home page</p>
      <p className="text-sm text-muted-foreground">Tick teachers to choose who is shown, in the order below. With none ticked, the website shows teachers automatically. Photos, qualification and specialisation come from each teacher&apos;s profile: Users → open the teacher → photo and Faculty profile. Only teachers who have filled in their profile appear here.</p>
      {teachers === null ? <p className="text-sm text-muted-foreground">Loading teachers…</p>
        : teachers.length === 0 ? <p className="text-sm text-muted-foreground">No teacher has a public profile yet.</p>
        : <ul className="grid gap-2 sm:grid-cols-2">{teachers.map(t => <li key={t.user_id}>
          <label className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
            <Checkbox checked={picked.includes(t.user_id)} onCheckedChange={() => toggle(t.user_id)} />
            {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail */}
            {t.users.photo_url ? <img src={t.users.photo_url} alt="" className="size-8 rounded-full object-cover" /> : <span className="flex size-8 items-center justify-center rounded-full bg-muted"><UserRound className="size-4" /></span>}
            <span className="min-w-0"><span className="block truncate font-medium">{t.users.full_name}</span>{t.qualification && <span className="block truncate text-xs text-muted-foreground">{t.qualification}</span>}</span>
          </label>
        </li>)}</ul>}
      {picked.length > 0 && <ol className="grid gap-1">{picked.map((id, i) => <li key={id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
        <span>{i + 1}. {name(id)}</span>
        <span className="flex gap-1">
          <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${name(id)} up`}><ArrowUp /></Button>
          <Button type="button" size="icon" variant="ghost" disabled={i === picked.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${name(id)} down`}><ArrowDown /></Button>
        </span>
      </li>)}</ol>}
    </div>
  </div>;
}

export function GalleryEditor({ value, onChange }: EditorProps<GalleryCard>) {
  return <div className="grid gap-4">
    <ImageField label="Photo" value={value.image} onChange={image => onChange({ ...value, image })} />
    {value.image && <TextField label="Describe the photo (for screen readers)" value={value.imageAlt} max={200} onChange={imageAlt => onChange({ ...value, imageAlt })} />}
    <div className={grid2}>
      <TextField label="Small heading" value={value.kicker} max={60} onChange={kicker => onChange({ ...value, kicker })} />
      <TextField label="Heading" required value={value.title} max={100} onChange={title => onChange({ ...value, title })} />
    </div>
    <TextAreaField label="Text" value={value.text} max={300} rows={2} onChange={text => onChange({ ...value, text })} />
    <TextField label="Link text (opens the gallery)" required value={value.linkLabel} max={40} onChange={linkLabel => onChange({ ...value, linkLabel })} />
  </div>;
}

export function ContactCardEditor({ value, onChange }: EditorProps<ContactCard>) {
  return <div className="grid gap-4">
    <div className={grid2}>
      <TextField label="Small heading" value={value.kicker} max={60} onChange={kicker => onChange({ ...value, kicker })} />
      <TextField label="Heading" required value={value.title} max={100} onChange={title => onChange({ ...value, title })} />
    </div>
    <TextAreaField label="Text" value={value.text} max={300} rows={2} onChange={text => onChange({ ...value, text })} />
    <div className={grid2}>
      <TextField label="Admission button text" required value={value.primaryLabel} max={40} onChange={primaryLabel => onChange({ ...value, primaryLabel })} />
      <TextField label="Enquiry button text" required value={value.secondaryLabel} max={40} onChange={secondaryLabel => onChange({ ...value, secondaryLabel })} />
    </div>
    <p className="text-xs text-muted-foreground">The phone numbers, WhatsApp and email in this card come from “Contact details & footer”.</p>
  </div>;
}

// ---------------------------------------------------------------------------
// Contact details and footer (every page)
// ---------------------------------------------------------------------------

export function ContactInfoEditor({ value, onChange }: EditorProps<ContactInfo>) {
  return <div className="grid gap-6">
    <div className="grid gap-2">
      <p className="text-sm font-medium">Phone numbers</p>
      <ListEditor
        items={value.phones}
        onChange={phones => onChange({ ...value, phones })}
        create={() => ({ display: "", tel: "" })}
        min={1}
        max={4}
        addLabel="Add a number"
        itemLabel={p => p.display || "Phone"}
        render={(p, update) => <div className={grid2}>
          <TextField label="As shown" required value={p.display} max={30} placeholder="+91 70156 28794" onChange={display => update({ ...p, display })} />
          <TextField label="Number to dial" value={p.tel} max={20} placeholder="+917015628794" hint="Digits only, with +91. Leave empty to use the number as shown." onChange={tel => update({ ...p, tel })} />
        </div>}
      />
    </div>
    <div className={grid2}>
      <TextField label="WhatsApp number" required value={value.whatsapp} max={20} placeholder="917015628794" hint="Country code and number, digits only (no +)." onChange={whatsapp => onChange({ ...value, whatsapp })} />
      <TextField label="Email" required value={value.email} max={120} onChange={email => onChange({ ...value, email })} />
    </div>
    <TextField label="Address" required value={value.address} max={200} hint="Also used for the Google Maps links and map." onChange={address => onChange({ ...value, address })} />
    <TextField label="Opening hours line" value={value.hours} max={120} onChange={hours => onChange({ ...value, hours })} />
    <div className="grid gap-4 sm:grid-cols-3">
      <TextField label="Instagram link" value={value.instagram} max={300} hint="Leave empty to hide." onChange={instagram => onChange({ ...value, instagram })} />
      <TextField label="Facebook link" value={value.facebook} max={300} hint="Leave empty to hide." onChange={facebook => onChange({ ...value, facebook })} />
      <TextField label="YouTube link" value={value.youtube} max={300} hint="Leave empty to hide." onChange={youtube => onChange({ ...value, youtube })} />
    </div>
    <div className={grid2}>
      <TextField label="Footer motto" value={value.motto} max={80} onChange={motto => onChange({ ...value, motto })} />
      <TextField label="Footer bottom line" value={value.footerNote} max={80} onChange={footerNote => onChange({ ...value, footerNote })} />
    </div>
    <TextAreaField label="Footer text" value={value.tagline} max={200} rows={2} onChange={tagline => onChange({ ...value, tagline })} />
  </div>;
}
