import { leaders as defaultLeaders } from "@/lib/team";
import type { SiteIconName } from "@/lib/site-icons";
import { href, icon, image, isObj, list, text, type Obj } from "@/lib/site-sections";
import { toEmbed } from "@/lib/video-embed";

/**
 * The About, Gallery and Pamphlet pages as the academy edits them in Admin → Website. Same rules
 * as site-sections.ts: one website_content block per page with a JSON body, defaults identical to
 * the pages before they became editable, and every field checked on the way in.
 */

export const PAGE_KEYS = { about: "page.about", gallery: "page.gallery", pamphlet: "page.pamphlet" } as const;

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export type AboutLeader = { name: string; role: string; label: string; image: string; imageAlt: string; message: string[] };
export type AboutStat = { value: string; label: string };
export type AboutValue = { icon: SiteIconName; title: string; description: string };
export const ABOUT_SECTION_IDS = ["stats", "leadership", "faculty", "values", "recognition", "learning", "visit"] as const;
export type AboutSectionId = (typeof ABOUT_SECTION_IDS)[number];

export type AboutPageContent = {
  hidden: AboutSectionId[];
  hero: { kicker: string; titleLead: string; titleEmphasis: string; intro: string; intro2: string; image: string; imageAlt: string; captionSmall: string; captionTitle: string; badge: string; primaryLabel: string; secondaryLabel: string };
  stats: AboutStat[];
  leadership: { kicker: string; title: string; titleAccent: string; leaders: AboutLeader[] };
  faculty: { kicker: string; title: string; titleAccent: string; intro: string; buttonLabel: string };
  values: { kicker: string; title: string; titleAccent: string; items: AboutValue[] };
  recognition: { image: string; imageAlt: string; kicker: string; title: string; text: string; buttonLabel: string };
  learning: { image: string; imageAlt: string; kicker: string; title: string; titleAccent: string; intro: string; buttonLabel: string };
  visit: { kicker: string; title: string; titleAccent: string; closing: string };
};

export const DEFAULT_ABOUT: AboutPageContent = {
  hidden: [],
  hero: {
    kicker: "THE PEOPLE. THE PURPOSE. THE POSSIBILITIES.",
    titleLead: "About EduPulse",
    titleEmphasis: "Academy.",
    intro: "EduPulse Academy is built on a strong belief: every student deserves the right guidance, the right support, and the right opportunities to shape their future.",
    intro2: "We are a team of passionate educators and counsellors driven by the goal to help students realize their academic potential and guide them to success in every step of their journey.",
    image: "/academy-campus-student.png",
    imageAlt: "Illustrative academy setting with a student looking confidently toward her future",
    captionSmall: "LEARN TODAY. LEAD TOMORROW.",
    captionTitle: "A stronger foundation.\nA brighter future.",
    badge: "Brand Icon of the Year 2024",
    primaryLabel: "Meet our leadership",
    secondaryLabel: "Meet our faculty",
  },
  // "10" programs and "6" departments match the built-in lists; the counter animates any number.
  stats: [
    { value: "10", label: "Programs offered" },
    { value: "6", label: "Subject departments" },
    { value: "Grade 6", label: "Where learning begins" },
    { value: "2024", label: "Brand Icon of the Year" },
  ],
  leadership: {
    kicker: "A SHARED VISION FOR YOUR FUTURE",
    title: "A message from",
    titleAccent: "our leadership.",
    leaders: defaultLeaders.map(l => ({ name: l.name, role: l.role, label: l.label, image: l.image, imageAlt: l.imageAlt, message: l.message })),
  },
  faculty: {
    kicker: "THE MENTORS IN THE CLASSROOM",
    title: "Subject experts who",
    titleAccent: "teach with care.",
    intro: "Our faculty is organised into six subject departments, each supporting the programs where that subject matters most, from Grade 6 foundations to entrance exams.",
    buttonLabel: "Meet our faculty",
  },
  values: {
    kicker: "WHAT GUIDES US",
    title: "Our purpose,",
    titleAccent: "in everything we do.",
    items: [
      { icon: "Target", title: "Our Mission", description: "Transforming lives through education" },
      { icon: "Users", title: "Our Values", description: "Excellence and student support" },
      { icon: "Award", title: "Our Vision", description: "Building tomorrow's leaders today" },
      { icon: "Heart", title: "Our Commitment", description: "Dedicated to student success" },
    ],
  },
  recognition: {
    image: "/gallery/award-2024.jpg",
    imageAlt: "A member of the EduPulse team holding Brand Icon of the Year 2024 awards",
    kicker: "RECOGNITION",
    title: "Brand Icon of the Year 2024",
    text: "Recognition that inspires us to keep raising the bar, for our students, their families and every learner who walks through our doors.",
    buttonLabel: "See life at EduPulse",
  },
  learning: {
    image: "/academy-students.png",
    imageAlt: "Two students studying together at a library table",
    kicker: "YOUR POTENTIAL. OUR PURPOSE.",
    title: "The right support",
    titleAccent: "makes all the difference.",
    intro: "From building strong foundations to preparing for entrance examinations, our focus is on helping students learn with clarity, confidence, and purpose.",
    buttonLabel: "Explore our programs",
  },
  visit: {
    kicker: "LET'S START A CONVERSATION",
    title: "Visit",
    titleAccent: "us.",
    closing: "We look forward to helping you plan your next chapter.",
  },
};

const paragraphs = (v: unknown, max: number, fallback: string[]) => {
  const items = list(v, 8).map(p => text(p, max, "")).filter(Boolean);
  return items.length ? items : fallback;
};

export function parseAbout(o: Obj | null): AboutPageContent {
  const d = DEFAULT_ABOUT;
  if (!o) return d;
  const sec = (k: string) => (isObj(o[k]) ? (o[k] as Obj) : {});
  const h = sec("hero"), lead = sec("leadership"), fac = sec("faculty"), val = sec("values"), rec = sec("recognition"), lrn = sec("learning"), vis = sec("visit");
  const stats = list(o.stats, 6).filter(isObj).map(s => ({ value: text(s.value, 20, ""), label: text(s.label, 60, "") })).filter(s => s.value && s.label);
  const leaders = list(lead.leaders, 6).filter(isObj).map(l => ({
    name: text(l.name, 80, ""),
    role: text(l.role, 80, "", true),
    label: text(l.label, 60, "", true),
    image: image(l.image, "", true),
    imageAlt: text(l.imageAlt, 200, "", true),
    message: paragraphs(l.message, 1500, []),
  })).filter(l => l.name);
  const values = list(val.items, 8).filter(isObj).map(v => ({ icon: icon(v.icon, "Star"), title: text(v.title, 60, ""), description: text(v.description, 160, "", true) })).filter(v => v.title);
  return {
    hidden: list(o.hidden, 10).filter((x): x is AboutSectionId => (ABOUT_SECTION_IDS as readonly string[]).includes(x as string)),
    hero: {
      kicker: text(h.kicker, 80, d.hero.kicker, true),
      titleLead: text(h.titleLead, 60, d.hero.titleLead),
      titleEmphasis: text(h.titleEmphasis, 60, d.hero.titleEmphasis, true),
      intro: text(h.intro, 500, d.hero.intro, true),
      intro2: text(h.intro2, 500, d.hero.intro2, true),
      image: image(h.image, d.hero.image),
      imageAlt: text(h.imageAlt, 200, d.hero.imageAlt, true),
      captionSmall: text(h.captionSmall, 60, d.hero.captionSmall, true),
      captionTitle: text(h.captionTitle, 120, d.hero.captionTitle, true),
      badge: text(h.badge, 60, d.hero.badge, true),
      primaryLabel: text(h.primaryLabel, 40, d.hero.primaryLabel, true),
      secondaryLabel: text(h.secondaryLabel, 40, d.hero.secondaryLabel, true),
    },
    stats: Array.isArray(o.stats) ? stats : d.stats,
    leadership: {
      kicker: text(lead.kicker, 80, d.leadership.kicker, true),
      title: text(lead.title, 80, d.leadership.title),
      titleAccent: text(lead.titleAccent, 80, d.leadership.titleAccent, true),
      leaders: Array.isArray(lead.leaders) ? leaders : d.leadership.leaders,
    },
    faculty: {
      kicker: text(fac.kicker, 80, d.faculty.kicker, true),
      title: text(fac.title, 80, d.faculty.title),
      titleAccent: text(fac.titleAccent, 80, d.faculty.titleAccent, true),
      intro: text(fac.intro, 400, d.faculty.intro, true),
      buttonLabel: text(fac.buttonLabel, 40, d.faculty.buttonLabel),
    },
    values: {
      kicker: text(val.kicker, 80, d.values.kicker, true),
      title: text(val.title, 80, d.values.title),
      titleAccent: text(val.titleAccent, 80, d.values.titleAccent, true),
      items: Array.isArray(val.items) ? values : d.values.items,
    },
    recognition: {
      image: image(rec.image, d.recognition.image, true),
      imageAlt: text(rec.imageAlt, 200, d.recognition.imageAlt, true),
      kicker: text(rec.kicker, 60, d.recognition.kicker, true),
      title: text(rec.title, 100, d.recognition.title),
      text: text(rec.text, 400, d.recognition.text, true),
      buttonLabel: text(rec.buttonLabel, 40, d.recognition.buttonLabel, true),
    },
    learning: {
      image: image(lrn.image, d.learning.image, true),
      imageAlt: text(lrn.imageAlt, 200, d.learning.imageAlt, true),
      kicker: text(lrn.kicker, 60, d.learning.kicker, true),
      title: text(lrn.title, 80, d.learning.title),
      titleAccent: text(lrn.titleAccent, 80, d.learning.titleAccent, true),
      intro: text(lrn.intro, 400, d.learning.intro, true),
      buttonLabel: text(lrn.buttonLabel, 40, d.learning.buttonLabel, true),
    },
    visit: {
      kicker: text(vis.kicker, 60, d.visit.kicker, true),
      title: text(vis.title, 60, d.visit.title),
      titleAccent: text(vis.titleAccent, 60, d.visit.titleAccent, true),
      closing: text(vis.closing, 200, d.visit.closing, true),
    },
  };
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export type GalleryItem = {
  kind: "photo" | "video";
  /** Photo: the image. Video: the cover picture shown in the grid (optional for YouTube). */
  image: string;
  /** Video: a site file (/gallery/6.mp4) or a YouTube, Vimeo or Google Drive link. */
  video: string;
  title: string;
  category: string;
  description: string;
  alt: string;
  position: string;
};
export type GalleryPageContent = { kicker: string; titleLead: string; titleAccent: string; intro: string; note: string; categories: string[]; items: GalleryItem[] };

const photo = (n: number, ext = "jpg") => ({ kind: "photo" as const, image: `/gallery/${n}.${ext}`, video: "" });
const clip = (n: number) => ({ kind: "video" as const, image: `/gallery/${n}-poster.jpg`, video: `/gallery/${n}.mp4` });

export const DEFAULT_GALLERY_PAGE: GalleryPageContent = {
  kicker: "LIFE AT EDUPULSE",
  titleLead: "Little moments.",
  titleAccent: "Limitless possibilities.",
  intro: "A glimpse into learning, discovery, achievements, and the connections that make an academy feel like a community.",
  note: "Real moments from EduPulse: games days, outings, celebrations and achievements.",
  categories: ["Activities", "Outings", "Celebrations", "Achievements"],
  items: [
    { ...photo(1), title: "Together under the trees", category: "Outings", description: "Students and mentors on an EduPulse day out in the park.", alt: "EduPulse students in white T-shirts kneeling in front of three mentors in a park", position: "center 55%" },
    { ...clip(6), title: "Lemon-and-spoon race", category: "Activities", description: "Steady hands and steady steps at our games day.", alt: "Video of EduPulse students lined up with spoons and lemons in their mouths for a lemon-and-spoon race", position: "center 30%" },
    { ...photo(12), title: "Ready, set, go!", category: "Activities", description: "On your marks for the park race.", alt: "Students crouched at the start line of a race in a park", position: "center 40%" },
    { ...clip(18), title: "The race is on", category: "Activities", description: "Every step counts.", alt: "Video of students starting a race in the park", position: "center 40%" },
    { ...photo(15), title: "Waiting for our turn", category: "Activities", description: "Teamwork, patience and plenty of smiles.", alt: "Students in white T-shirts standing in a line on the grass", position: "center 25%" },
    { ...clip(19), title: "Racing to the finish", category: "Activities", description: "Fun, fitness and friendly competition.", alt: "Video of students racing in the park", position: "center 45%" },
    { ...photo(5, "jpeg"), title: "Time out on the lawn", category: "Outings", description: "Catching our breath between games.", alt: "Students sitting together on a lawn in a park", position: "center" },
    { ...photo(2), title: "A day out together", category: "Outings", description: "Learning happens outside the classroom too.", alt: "EduPulse students with backpacks posing together in a shopping mall", position: "center 45%" },
    { ...photo(8), title: "Exploring the city", category: "Outings", description: "New places, new conversations.", alt: "Students and a mentor standing in a row inside a mall", position: "center 50%" },
    { ...photo(16), title: "Dinner together", category: "Celebrations", description: "Sharing a meal and stories after a busy day.", alt: "Students sitting on the floor sharing a meal from steel plates", position: "center" },
    { ...photo(3), title: "A birthday to remember", category: "Celebrations", description: "Friends who celebrate together, stay together.", alt: "A student feeding birthday cake to a friend", position: "center 25%" },
    { ...photo(9), title: "Cake time!", category: "Celebrations", description: "No birthday is complete without cake.", alt: "Students sharing cake at a birthday celebration", position: "center 40%" },
    { ...photo(13), title: "Sweet surprises", category: "Celebrations", description: "A little cake, a lot of laughter.", alt: "A student putting cake on a friend's face at a birthday celebration", position: "center 25%" },
    { ...photo(10), title: "Celebrating friendship", category: "Celebrations", description: "Good friends make every day special.", alt: "Friends sharing birthday cake together", position: "center 30%" },
    { ...photo(17), title: "Big smiles, little moments", category: "Celebrations", description: "Celebrating together as one family.", alt: "A younger student offering cake to a smiling friend", position: "center 35%" },
    { ...photo(14), title: "The birthday star", category: "Celebrations", description: "Cake on the cheeks, joy in the heart.", alt: "A smiling student with cake on his face", position: "center 25%" },
    { kind: "photo", image: "/gallery/award-2024.jpg", video: "", title: "Brand Icon of the Year 2024", category: "Achievements", description: "Recognition that inspires us to keep raising the bar.", alt: "A member of the EduPulse team holding Brand Icon of the Year 2024 awards", position: "center 35%" },
  ],
};

/** A site video file (e.g. /gallery/6.mp4). */
export const isLocalVideo = (v: string) => /^\/[A-Za-z0-9/_.-]+\.(mp4|webm)$/.test(v) && !v.startsWith("//");

/** YouTube's own thumbnail for a YouTube link, used when a video has no cover picture. */
export function youtubeThumbnail(video: string): string {
  const embed = toEmbed(video);
  const id = embed?.provider === "youtube" ? embed.embedUrl.match(/\/embed\/([\w-]{11})/)?.[1] : undefined;
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
}

export function parseGalleryPage(o: Obj | null): GalleryPageContent {
  const d = DEFAULT_GALLERY_PAGE;
  if (!o) return d;
  const categories = [...new Set(list(o.categories, 12).map(c => text(c, 30, "")).filter(Boolean))];
  const items = list(o.items, 200).filter(isObj).map((i): GalleryItem | null => {
    const kind = i.kind === "video" ? "video" : "photo";
    const video = text(i.video, 500, "", true);
    const okVideo = kind === "video" && (isLocalVideo(video) || !!toEmbed(video));
    const img = image(i.image, "", true);
    if (kind === "photo" && !img) return null;
    if (kind === "video" && !okVideo) return null;
    return {
      kind,
      image: img,
      video: kind === "video" ? video : "",
      title: text(i.title, 80, ""),
      category: text(i.category, 30, ""),
      description: text(i.description, 200, "", true),
      alt: text(i.alt, 200, "", true),
      position: /^[a-z0-9 %.-]{1,40}$/i.test(String(i.position ?? "")) ? String(i.position) : "center",
    };
  }).filter((i): i is GalleryItem => !!i && !!i.title);
  return {
    kicker: text(o.kicker, 60, d.kicker, true),
    titleLead: text(o.titleLead, 80, d.titleLead),
    titleAccent: text(o.titleAccent, 80, d.titleAccent, true),
    intro: text(o.intro, 400, d.intro, true),
    note: text(o.note, 300, d.note, true),
    categories: categories.length ? categories : d.categories,
    items,
  };
}

// ---------------------------------------------------------------------------
// Pamphlet (/pamphlet)
// ---------------------------------------------------------------------------

export type PamphletDate = { label: string; value: string };
export type PamphletContent = {
  pageTitle: string;
  pageDescription: string;
  headerMessage: string;
  headerSub: string;
  badge: string;
  panelOne: string;
  titleTop: string;
  titleSub: string;
  classes: string[];
  session: string;
  noticeLabel: string;
  noticeValue: string;
  dates: PamphletDate[];
  footnote: string;
  panelTwo: string;
  sectionLabel: string;
  enrolLabel: string;
  examTitle: string;
  examSub: string;
  guidance: string;
  subjects: string[];
  contactEyebrow: string;
  contactTitle: string;
  location: string;
  footerLead: string;
  footerAccent: string;
  portalLabel: string;
  portalUrl: string;
};

export const DEFAULT_PAMPHLET: PamphletContent = {
  pageTitle: "Sainik School Admission 2027",
  pageDescription: "Prepare for AISSEE 2027 with Edupulse Academy, Aligarh. Sainik School entrance preparation for Class VI and Class IX. Learn Smart. Lead Ahead.",
  headerMessage: "Learn Smart. Lead Ahead.",
  headerSub: "ALIGARH · ACADEMIC SESSION 2027–28",
  badge: "ADMISSIONS 2027",
  panelOne: "01 / YOUR NEXT CHAPTER",
  titleTop: "SAINIK SCHOOL",
  titleSub: "A brighter future\nstarts here.",
  classes: ["CLASS VI", "CLASS IX"],
  session: "2027–28",
  noticeLabel: "AISSEE 2027 FORMS OUT",
  noticeValue: "3 November 2026",
  dates: [
    { label: "Online applications", value: "3 November – 2 December 2026" },
    { label: "Entrance examination", value: "31 January 2027" },
  ],
  footnote: "Big ambitions. Strong foundations. Confident beginnings.",
  panelTwo: "02 / GET A HEAD START",
  sectionLabel: "PREPARE WITH EDUPULSE",
  enrolLabel: "ENROL NOW FOR",
  examTitle: "AISSEE 2027",
  examSub: "PREPARATION",
  guidance: "Expert guidance for entrance preparation.",
  subjects: ["Mathematics", "Intelligence", "Language / English", "General Knowledge", "Science", "Social Science"],
  contactEyebrow: "LET’S BUILD YOUR CHILD’S FUTURE",
  contactTitle: "Your next step starts with a call.",
  location: "Edupulse Academy, Aligarh",
  footerLead: "LEARN SMART.",
  footerAccent: "LEAD AHEAD.",
  portalLabel: "exams.nta.nic.in/sainik-school-society",
  portalUrl: "https://exams.nta.nic.in/sainik-school-society",
};

export function parsePamphlet(o: Obj | null): PamphletContent {
  const d = DEFAULT_PAMPHLET;
  if (!o) return d;
  const strings = (v: unknown, max: number, each: number, fallback: string[]) => {
    const items = list(v, max).map(x => text(x, each, "")).filter(Boolean);
    return Array.isArray(v) ? items : fallback;
  };
  const t = (k: keyof PamphletContent, max: number, allowEmpty = true) => text(o[k], max, d[k] as string, allowEmpty);
  const dates = list(o.dates, 4).filter(isObj).map(x => ({ label: text(x.label, 60, ""), value: text(x.value, 80, "") })).filter(x => x.label && x.value);
  const portalUrl = href(o.portalUrl, "", true);
  return {
    pageTitle: t("pageTitle", 80, false),
    pageDescription: t("pageDescription", 300),
    headerMessage: t("headerMessage", 60),
    headerSub: t("headerSub", 80),
    badge: t("badge", 40),
    panelOne: t("panelOne", 40),
    titleTop: t("titleTop", 40, false),
    titleSub: t("titleSub", 80),
    classes: strings(o.classes, 4, 20, d.classes),
    session: t("session", 20),
    noticeLabel: t("noticeLabel", 60),
    noticeValue: t("noticeValue", 60),
    dates: Array.isArray(o.dates) ? dates : d.dates,
    footnote: t("footnote", 120),
    panelTwo: t("panelTwo", 40),
    sectionLabel: t("sectionLabel", 40),
    enrolLabel: t("enrolLabel", 40),
    examTitle: t("examTitle", 30, false),
    examSub: t("examSub", 30),
    guidance: t("guidance", 120),
    subjects: strings(o.subjects, 10, 40, d.subjects),
    contactEyebrow: t("contactEyebrow", 60),
    contactTitle: t("contactTitle", 80),
    location: t("location", 80),
    footerLead: t("footerLead", 40),
    footerAccent: t("footerAccent", 40),
    portalLabel: t("portalLabel", 80),
    portalUrl: /^https:\/\//.test(portalUrl) ? portalUrl : (o.portalUrl === "" ? "" : d.portalUrl),
  };
}

/** A stat value split for the counter animation: "Grade 6" → { prefix: "Grade ", number: 6, suffix: "" }. */
export function splitStat(value: string): { prefix: string; number: number | null; suffix: string } {
  const m = value.match(/^(\D*?)(\d{1,7})(\D*)$/);
  return m ? { prefix: m[1], number: Number(m[2]), suffix: m[3] } : { prefix: value, number: null, suffix: "" };
}

