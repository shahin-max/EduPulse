import type { ApiContent } from "@/lib/api";
import { isSiteIcon, type SiteIconName } from "@/lib/site-icons";

/**
 * Website sections the academy edits in Admin → Website. Each section is one website_content
 * block whose body is JSON (`{"v":1,...}`). The defaults below are exactly what the website showed
 * before the sections became editable, so a missing, unpublished or unreadable block changes
 * nothing. Everything read from a block is checked: text is trimmed and capped, links must be
 * site paths or http(s)/mailto/tel, images must be site files or Cloudinary, icons come from a
 * fixed list. Fields that fail a check fall back to their default.
 *
 * `home.results` and `home.highlights` keep their original one-line-per-entry format
 * (see home-content.ts); this file adds the texts around them.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeroSlide = {
  eyebrow: string;
  titleLead: string;
  titleEmphasis: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  /** CSS object-position, e.g. "center 30%". */
  imagePosition: string;
  badge: string;
  /** Programs (by slug) highlighted in the "Our programs" dock while this slide shows. */
  programSlugs: string[];
};
export type HeroSection = { slides: HeroSlide[]; locationTitle: string; locationSubtitle: string; dockKicker: string; dockTitle: string };

export type FeatureCard = { icon: SiteIconName; title: string; detail: string };
export type FeaturesSection = { items: FeatureCard[] };

export type ProgramOverride = { title?: string; detail?: string; icon?: SiteIconName; hidden?: boolean };
export type ProgramsSection = { kicker: string; title: string; titleAccent: string; intro: string; cards: Record<string, ProgramOverride> };

export type UpdateItem = {
  id: string;
  title: string;
  /** YYYY-MM-DD, optional. */
  date: string;
  summary: string;
  badge: string;
  image: string;
  imageAlt: string;
  linkLabel: string;
  linkHref: string;
  /** Icon shown when there is no picture (default: a megaphone). */
  icon?: SiteIconName;
};
export type UpdatesSection = { kicker: string; title: string; titleAccent: string; intro: string; homeCount: number; items: UpdateItem[] };

export type ResultsHeader = { kicker: string; intro: string };

export type FacultySectionText = { kicker: string; title: string; titleAccent: string; intro: string; linkLabel: string; count: number; userIds: number[] };

export type GalleryCard = { kicker: string; title: string; text: string; linkLabel: string; image: string; imageAlt: string };
export type ContactCard = { kicker: string; title: string; text: string; primaryLabel: string; secondaryLabel: string };

export const HOME_SECTION_IDS = ["features", "programs", "updates", "results", "faculty", "gallery", "contact"] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];
export type HomeLayout = { order: HomeSectionId[]; hidden: HomeSectionId[] };

/** Home page sections. The programs section is site-wide (site.programs) and comes from SiteContent. */
export type HomeSections = {
  layout: HomeLayout;
  hero: HeroSection;
  features: FeaturesSection;
  updates: UpdatesSection;
  resultsHeader: ResultsHeader;
  faculty: FacultySectionText;
  gallery: GalleryCard;
  contact: ContactCard;
};

export type ContactInfo = {
  phones: { display: string; tel: string }[];
  /** International number without "+", for wa.me links. */
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  youtube: string;
  motto: string;
  tagline: string;
  footerNote: string;
};

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export const SECTION_KEYS = {
  layout: "home.layout",
  hero: "home.hero",
  features: "home.features",
  programs: "site.programs",
  updates: "home.updates",
  resultsHeader: "home.results-header",
  faculty: "home.faculty",
  gallery: "home.gallery",
  contact: "home.contact",
  contactInfo: "site.contact",
} as const;

// ---------------------------------------------------------------------------
// Defaults: the website as it was before these sections became editable
// ---------------------------------------------------------------------------

// Photos: Unsplash License (free for commercial use, attribution not required). Credits kept for reference.
export const DEFAULT_HERO: HeroSection = {
  locationTitle: "Proudly based in Aligarh",
  locationSubtitle: "Lal Diggi, Civil Lines",
  dockKicker: "FIND YOUR DIRECTION",
  dockTitle: "Our programs",
  slides: [
    {
      eyebrow: "FOUNDATION CLASSES · GRADES 6–10",
      titleLead: "Strong roots today,", titleEmphasis: "brighter results tomorrow.",
      subtitle: "Concept-first classes in Mathematics, Science and English that turn everyday doubts into lasting understanding.",
      ctaLabel: "Explore programs", ctaHref: "/courses",
      image: "/hero/foundation.jpg", // Raj Rana — unsplash.com/photos/nWpTGnP_jWE
      imageAlt: "A schoolgirl in uniform standing confidently in front of her classmates",
      imagePosition: "center 30%", badge: "CBSE · ICSE · State Boards",
      programSlugs: ["foundation-classes"],
    },
    {
      eyebrow: "ENGINEERING & MEDICAL ENTRANCE",
      titleLead: "Crack the concepts,", titleEmphasis: "clear the entrance.",
      subtitle: "Structured Physics, Chemistry, Mathematics and Biology preparation with chapter tests and full-length mock papers.",
      ctaLabel: "View JEE & NEET", ctaHref: "/courses",
      image: "/hero/entrance.jpg", // Tra Nguyen — unsplash.com/photos/TVSRWmnW8Us
      imageAlt: "A teacher writing physics equations on a green chalkboard",
      imagePosition: "center 35%", badge: "JEE Main · Advanced · NEET",
      programSlugs: ["jee-main-advanced", "neet"],
    },
    {
      eyebrow: "RMS & SAINIK SCHOOL ENTRANCE",
      titleLead: "Discipline that builds", titleEmphasis: "future leaders.",
      subtitle: "Focused preparation for Rashtriya Military School and Sainik School entrance exams, with timed practice tests.",
      ctaLabel: "See AISSEE 2027 details", ctaHref: "/pamphlet",
      image: "/hero/sainik.jpg", // CIMT HOOGHLY — unsplash.com/photos/I4lLt9g8i3k
      imageAlt: "Students in uniform writing at their desks while a teacher checks their work",
      imagePosition: "center 45%", badge: "AISSEE 2027 preparation",
      programSlugs: ["aissee-class-6", "aissee-class-9"],
    },
    {
      eyebrow: "CUET · CLAT · AMU · JMI",
      titleLead: "Your university,", titleEmphasis: "your direction.",
      subtitle: "Guided preparation for CUET, CLAT, GATE and the AMU & JMI entrance tests, including previous-year paper practice.",
      ctaLabel: "View university programs", ctaHref: "/courses",
      image: "/hero/university.jpg", // Fotos — unsplash.com/photos/Xdh_J4xW1QE
      imageAlt: "Two students with backpacks reading a book together",
      imagePosition: "center 35%", badge: "Previous-year paper practice",
      programSlugs: ["amu-jmi-entrance", "cuet-clat-gate"],
    },
    {
      eyebrow: "SPOKEN ENGLISH & STUDY ABROAD",
      titleLead: "Speak with confidence,", titleEmphasis: "go global.",
      subtitle: "Build fluent spoken English and prepare for IELTS and study-abroad applications with practical speaking sessions.",
      ctaLabel: "Enquire now", ctaHref: "/contact",
      image: "/hero/spoken-english.jpg", // Muhammad Rizwan — unsplash.com/photos/VnydpKiCDaY
      imageAlt: "A smiling graduate in a cap and gown",
      imagePosition: "center 30%", badge: "IELTS & study-abroad guidance",
      programSlugs: ["spoken-english-abroad"],
    },
  ],
};

export const DEFAULT_FEATURES: FeaturesSection = {
  items: [
    { icon: "Users", title: "Expert Faculty", detail: "Learn from highly qualified and experienced teachers." },
    { icon: "Award", title: "Smart Learning", detail: "Build understanding with technology-assisted learning." },
    { icon: "Target", title: "Exam Oriented", detail: "Focused preparation for your next big milestone." },
    { icon: "GraduationCap", title: "Your Growth First", detail: "Guidance that keeps your learning moving forward." },
  ],
};

export const DEFAULT_PROGRAMS: ProgramsSection = {
  kicker: "FIND YOUR NEXT CHAPTER",
  title: "Explore top programs.",
  titleAccent: "Designed for your success.",
  intro: "From strong foundations to ambitious futures, find the right path for you.",
  cards: {},
};

export const DEFAULT_UPDATES: UpdatesSection = {
  kicker: "LATEST UPDATES",
  title: "News & announcements",
  titleAccent: "from EduPulse.",
  intro: "Admissions, exam dates, new batches and results. Check back often.",
  homeCount: 3,
  items: [
    {
      id: "aissee-2027",
      title: "Sainik School Admission 2027 (AISSEE)",
      date: "2026-11-03",
      summary: "AISSEE 2027 forms are out for Class VI and Class IX. Apply online from 3 November to 2 December 2026; the entrance exam is on 31 January 2027. Enrol now for our AISSEE 2027 preparation.",
      badge: "Admissions open",
      image: "",
      imageAlt: "",
      linkLabel: "View the pamphlet",
      linkHref: "/pamphlet",
    },
  ],
};

export const DEFAULT_RESULTS_HEADER: ResultsHeader = {
  kicker: "RESULTS & ACHIEVEMENTS",
  intro: "Every result here is a student who put in the work, with teachers who walked the path with them.",
};

export const DEFAULT_FACULTY: FacultySectionText = {
  kicker: "OUR FACULTY",
  title: "Mentors who know",
  titleAccent: "the exams inside out.",
  intro: "Experienced teachers for every subject, from Class 6 foundations to entrance exams.",
  linkLabel: "Meet all our faculty",
  count: 4,
  userIds: [],
};

export const DEFAULT_GALLERY: GalleryCard = {
  kicker: "LIFE AT EDUPULSE",
  title: "Moments that inspire us.",
  text: "Explore campus life, classroom discoveries, achievements, and student experiences.",
  linkLabel: "Explore the gallery",
  image: "/gallery/award-2024.jpg",
  imageAlt: "A member of the EduPulse team holding Brand Icon of the Year 2024 awards",
};

export const DEFAULT_CONTACT: ContactCard = {
  kicker: "TALK TO OUR TEAM",
  title: "Request a callback.",
  text: "Share a few details and our counsellors will help you choose the right program and batch.",
  primaryLabel: "Apply for admission",
  secondaryLabel: "Open the enquiry form",
};

export const DEFAULT_LAYOUT: HomeLayout = { order: [...HOME_SECTION_IDS], hidden: [] };

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  phones: [
    { display: "+91 70156 28794", tel: "+917015628794" },
    { display: "+91 96272 32324", tel: "+919627232324" },
  ],
  whatsapp: "917015628794",
  email: "edupulsea@gmail.com",
  address: "Lal Diggi, Civil Lines, Grand Bazar, Aligarh",
  hours: "Visit us or call during academy hours",
  instagram: "https://www.instagram.com/edupulsealigarh",
  facebook: "https://www.facebook.com/share/1ECs9udonF/",
  youtube: "https://www.youtube.com/@edupulse2423",
  motto: "Learn Today. Lead Tomorrow.",
  tagline: "Empowering students through quality education and guidance.",
  footerNote: "Built for brighter futures.",
};

export const DEFAULT_SECTIONS: HomeSections = {
  layout: DEFAULT_LAYOUT,
  hero: DEFAULT_HERO,
  features: DEFAULT_FEATURES,
  updates: DEFAULT_UPDATES,
  resultsHeader: DEFAULT_RESULTS_HEADER,
  faculty: DEFAULT_FACULTY,
  gallery: DEFAULT_GALLERY,
  contact: DEFAULT_CONTACT,
};

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export type Obj = Record<string, unknown>;
export const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Trimmed text up to `max` characters; the fallback when missing. Empty text is allowed only when `allowEmpty`. */
export function text(v: unknown, max: number, fallback: string, allowEmpty = false): string {
  if (typeof v !== "string") return fallback;
  const t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
  return t || allowEmpty ? t : fallback;
}

/** A link the website may render: a site path, an in-page anchor, http(s), mailto or tel. */
export function isSafeHref(v: string): boolean {
  if (v.startsWith("/")) return !v.startsWith("//") && !v.startsWith("/\\");
  if (v.startsWith("#")) return true;
  return /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:\+?[0-9 ()-]+)$/i.test(v);
}

export function href(v: unknown, fallback: string, allowEmpty = false): string {
  const t = text(v, 500, "", true);
  if (!t) return allowEmpty ? "" : fallback;
  return isSafeHref(t) ? t : fallback;
}

/** An image the website may show: a file of this site or a Cloudinary upload. */
export function isSafeImage(v: string): boolean {
  if (v.startsWith("/")) return !v.startsWith("//") && /^\/[A-Za-z0-9/_.-]+$/.test(v);
  return /^https:\/\/res\.cloudinary\.com\/[^\s"'<>]+$/.test(v);
}

export function image(v: unknown, fallback: string, allowEmpty = false): string {
  const t = text(v, 500, "", true);
  if (!t) return allowEmpty ? "" : fallback;
  return isSafeImage(t) ? t : fallback;
}

export const icon = (v: unknown, fallback: SiteIconName): SiteIconName => (isSiteIcon(v) ? v : fallback);
export const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
export const slug = (v: unknown) => (typeof v === "string" && /^[a-z0-9-]{1,80}$/.test(v) ? v : null);
export const int = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) ? Math.min(Math.max(v, min), max) : fallback;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** The JSON body of a block, or null when missing or unreadable. */
export function readJson(blocks: ApiContent[], key: string): Obj | null {
  const body = blocks.find(b => b.content_key === key)?.body;
  if (!body) return null;
  try {
    const parsed: unknown = JSON.parse(body);
    return isObj(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parsers (each returns the default when its block is absent)
// ---------------------------------------------------------------------------

export function parseHero(o: Obj | null): HeroSection {
  const d = DEFAULT_HERO;
  if (!o) return d;
  const slides = list(o.slides, 8).filter(isObj).map((s): HeroSlide => {
    const base = d.slides[0];
    return {
      eyebrow: text(s.eyebrow, 80, "", true),
      titleLead: text(s.titleLead, 80, base.titleLead),
      titleEmphasis: text(s.titleEmphasis, 80, "", true),
      subtitle: text(s.subtitle, 300, "", true),
      ctaLabel: text(s.ctaLabel, 40, "", true),
      ctaHref: href(s.ctaHref, "/courses"),
      image: image(s.image, base.image),
      imageAlt: text(s.imageAlt, 200, "", true),
      imagePosition: /^[a-z0-9 %.-]{1,40}$/i.test(String(s.imagePosition ?? "")) ? String(s.imagePosition) : "center",
      badge: text(s.badge, 60, "", true),
      programSlugs: list(s.programSlugs, 12).map(slug).filter((x): x is string => !!x),
    };
  });
  return {
    slides: slides.length ? slides : d.slides,
    locationTitle: text(o.locationTitle, 60, d.locationTitle, true),
    locationSubtitle: text(o.locationSubtitle, 80, d.locationSubtitle, true),
    dockKicker: text(o.dockKicker, 40, d.dockKicker, true),
    dockTitle: text(o.dockTitle, 40, d.dockTitle),
  };
}

export function parseFeatures(o: Obj | null): FeaturesSection {
  if (!o) return DEFAULT_FEATURES;
  const items = list(o.items, 8).filter(isObj).map((f): FeatureCard => ({
    icon: icon(f.icon, "Star"),
    title: text(f.title, 60, ""),
    detail: text(f.detail, 160, "", true),
  })).filter(f => f.title);
  return { items };
}

export function parsePrograms(o: Obj | null): ProgramsSection {
  const d = DEFAULT_PROGRAMS;
  if (!o) return d;
  const cards: Record<string, ProgramOverride> = {};
  if (isObj(o.cards)) {
    for (const [key, raw] of Object.entries(o.cards).slice(0, 40)) {
      if (!slug(key) || !isObj(raw)) continue;
      const card: ProgramOverride = {};
      const title = text(raw.title, 80, "");
      const detail = text(raw.detail, 80, "");
      if (title) card.title = title;
      if (detail) card.detail = detail;
      if (isSiteIcon(raw.icon)) card.icon = raw.icon;
      if (raw.hidden === true) card.hidden = true;
      cards[key] = card;
    }
  }
  return {
    kicker: text(o.kicker, 60, d.kicker, true),
    title: text(o.title, 100, d.title),
    titleAccent: text(o.titleAccent, 100, d.titleAccent, true),
    intro: text(o.intro, 300, d.intro, true),
    cards,
  };
}

export function parseUpdates(o: Obj | null): UpdatesSection {
  const d = DEFAULT_UPDATES;
  if (!o) return d;
  const items = list(o.items, 50).filter(isObj).map((u, i): UpdateItem => ({
    id: text(u.id, 40, `update-${i + 1}`).replace(/[^a-z0-9-]/gi, "") || `update-${i + 1}`,
    title: text(u.title, 120, ""),
    date: isDate(u.date) ? u.date : "",
    summary: text(u.summary, 1000, "", true),
    badge: text(u.badge, 40, "", true),
    image: image(u.image, "", true),
    imageAlt: text(u.imageAlt, 200, "", true),
    linkLabel: text(u.linkLabel, 40, "", true),
    linkHref: href(u.linkHref, "", true),
  })).filter(u => u.title);
  return {
    kicker: text(o.kicker, 60, d.kicker, true),
    title: text(o.title, 100, d.title),
    titleAccent: text(o.titleAccent, 100, d.titleAccent, true),
    intro: text(o.intro, 300, d.intro, true),
    homeCount: int(o.homeCount, 1, 12, d.homeCount),
    items,
  };
}

export function parseResultsHeader(o: Obj | null): ResultsHeader {
  const d = DEFAULT_RESULTS_HEADER;
  if (!o) return d;
  return { kicker: text(o.kicker, 60, d.kicker, true), intro: text(o.intro, 300, d.intro, true) };
}

export function parseFaculty(o: Obj | null): FacultySectionText {
  const d = DEFAULT_FACULTY;
  if (!o) return d;
  return {
    kicker: text(o.kicker, 60, d.kicker, true),
    title: text(o.title, 100, d.title),
    titleAccent: text(o.titleAccent, 100, d.titleAccent, true),
    intro: text(o.intro, 300, d.intro, true),
    linkLabel: text(o.linkLabel, 40, d.linkLabel),
    count: int(o.count, 1, 12, d.count),
    userIds: list(o.userIds, 24).filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x > 0),
  };
}

export function parseGallery(o: Obj | null): GalleryCard {
  const d = DEFAULT_GALLERY;
  if (!o) return d;
  return {
    kicker: text(o.kicker, 60, d.kicker, true),
    title: text(o.title, 100, d.title),
    text: text(o.text, 300, d.text, true),
    linkLabel: text(o.linkLabel, 40, d.linkLabel),
    image: image(o.image, d.image),
    imageAlt: text(o.imageAlt, 200, d.imageAlt, true),
  };
}

export function parseContactCard(o: Obj | null): ContactCard {
  const d = DEFAULT_CONTACT;
  if (!o) return d;
  return {
    kicker: text(o.kicker, 60, d.kicker, true),
    title: text(o.title, 100, d.title),
    text: text(o.text, 300, d.text, true),
    primaryLabel: text(o.primaryLabel, 40, d.primaryLabel),
    secondaryLabel: text(o.secondaryLabel, 40, d.secondaryLabel),
  };
}

export function parseLayout(o: Obj | null): HomeLayout {
  if (!o) return DEFAULT_LAYOUT;
  const known = (v: unknown): v is HomeSectionId => (HOME_SECTION_IDS as readonly string[]).includes(v as string);
  const order = [...new Set(list(o.order, 20).filter(known))];
  // Sections added in a later version appear at the end instead of disappearing.
  for (const id of HOME_SECTION_IDS) if (!order.includes(id)) order.push(id);
  return { order, hidden: [...new Set(list(o.hidden, 20).filter(known))] };
}

const digits = (v: string) => v.replace(/[^\d+]/g, "");

export function parseContactInfo(o: Obj | null): ContactInfo {
  const d = DEFAULT_CONTACT_INFO;
  if (!o) return d;
  const phones = list(o.phones, 4).filter(isObj).map(p => {
    const display = text(p.display, 30, "");
    const tel = digits(text(p.tel, 20, "") || display);
    return { display, tel };
  }).filter(p => p.display && /^\+?\d{6,15}$/.test(p.tel));
  const whatsapp = digits(text(o.whatsapp, 20, "", true)).replace(/^\+/, "");
  const social = (v: unknown, fallback: string) => {
    const t = text(v, 300, "", true);
    if (!t) return "";
    return /^https:\/\/[^\s]+$/.test(t) ? t : fallback;
  };
  return {
    phones: phones.length ? phones : d.phones,
    whatsapp: /^\d{8,15}$/.test(whatsapp) ? whatsapp : d.whatsapp,
    email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text(o.email, 120, "")) ? text(o.email, 120, "") : d.email,
    address: text(o.address, 200, d.address),
    hours: text(o.hours, 120, d.hours, true),
    instagram: social(o.instagram, d.instagram),
    facebook: social(o.facebook, d.facebook),
    youtube: social(o.youtube, d.youtube),
    motto: text(o.motto, 80, d.motto, true),
    tagline: text(o.tagline, 200, d.tagline, true),
    footerNote: text(o.footerNote, 80, d.footerNote, true),
  };
}

/** All home sections from the `home.` blocks (published blocks only reach the public website). */
export function parseHomeSections(blocks: ApiContent[]): HomeSections {
  return {
    layout: parseLayout(readJson(blocks, SECTION_KEYS.layout)),
    hero: parseHero(readJson(blocks, SECTION_KEYS.hero)),
    features: parseFeatures(readJson(blocks, SECTION_KEYS.features)),
    updates: parseUpdates(readJson(blocks, SECTION_KEYS.updates)),
    resultsHeader: parseResultsHeader(readJson(blocks, SECTION_KEYS.resultsHeader)),
    faculty: parseFaculty(readJson(blocks, SECTION_KEYS.faculty)),
    gallery: parseGallery(readJson(blocks, SECTION_KEYS.gallery)),
    contact: parseContactCard(readJson(blocks, SECTION_KEYS.contact)),
  };
}

/** "3 Nov 2026" for a YYYY-MM-DD date. */
export function formatUpdateDate(date: string): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
