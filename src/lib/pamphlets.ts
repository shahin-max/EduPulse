import type { UpdateItem } from "@/lib/site-sections";
import type { SiteIconName } from "@/lib/site-icons";

/**
 * Course pamphlets kept as images in public/gallery, and the narrated programmes video. Used by the
 * /pamphlet carousel, the top banner, the Latest updates carousel and the home page "Watch video" button.
 * The Sainik School pamphlet is not here: it is the editable page at /pamphlet (Admin → Website → Pamphlet).
 */
export type ImagePamphlet = {
  id: string;
  /** Short name for tabs and the banner. */
  name: string;
  title: string;
  summary: string;
  /** One line for the scrolling top banner. */
  ticker: string;
  badge: string;
  /** Icon on its Latest updates card. */
  icon: SiteIconName;
  src: string;
  alt: string;
  /** File name when downloaded. */
  file: string;
  width: number;
  height: number;
};

export const IMAGE_PAMPHLETS: ImagePamphlet[] = [
  {
    id: "nda-imu-cet",
    name: "NDA & IMU-CET",
    title: "NDA & IMU-CET Entrance Preparation",
    summary: "Defence and merchant navy careers: NDA (Mathematics, GAT, English & GK, mock tests, SSB interview guidance) and IMU-CET (Maths, Physics, Chemistry, English & aptitude, previous-year questions).",
    ticker: "NDA & IMU-CET – defence & merchant navy entrance, SSB interview guidance",
    badge: "Admissions open",
    icon: "Shield",
    src: "/gallery/d.jpeg",
    alt: "EduPulse pamphlet for NDA and IMU-CET entrance exam preparation, with army and navy cadets",
    file: "edupulse-nda-imu-cet.jpeg",
    width: 1024,
    height: 1536,
  },
  {
    id: "study-in-germany",
    name: "Study in Germany",
    title: "Study in Germany: Ausbildung Programme",
    summary: "Learn while you work and earn during your training in Germany. We help with programme details, eligibility, application, documents, interview preparation and admission.",
    ticker: "STUDY IN GERMANY – Ausbildung: learn while you work, earn while you train",
    badge: "Study abroad",
    icon: "Plane",
    src: "/gallery/a.jpeg",
    alt: "EduPulse pamphlet for the Ausbildung vocational training programme in Germany",
    file: "edupulse-study-in-germany.jpeg",
    width: 1199,
    height: 1312,
  },
  {
    id: "amu-jmi-entrance",
    name: "AMU & JMI",
    title: "AMU & JMI Entrance Preparation",
    summary: "Crack the Aligarh Muslim University and Jamia Millia Islamia entrance exams with expert faculty, complete syllabus coverage, regular mock tests and personal mentorship.",
    ticker: "AMU & JMI ENTRANCE – expert faculty, full syllabus, regular mock tests",
    badge: "Enrol now",
    icon: "GraduationCap",
    src: "/gallery/b.jpeg",
    alt: "EduPulse pamphlet for AMU and JMI entrance exam preparation",
    file: "edupulse-amu-jmi-entrance.jpeg",
    width: 1199,
    height: 1312,
  },
  {
    id: "learn-german",
    name: "German A1 & A2",
    title: "Learn German A1 & A2, get a job in Germany",
    summary: "German language classes with interview preparation and complete visa assistance. Nursing jobs: men and women can both apply. Online and offline classes.",
    ticker: "LEARN GERMAN A1 & A2 – nursing jobs in Germany, interview prep & visa assistance",
    badge: "Jobs abroad",
    icon: "Languages",
    src: "/gallery/c.jpeg",
    alt: "EduPulse pamphlet for German A1 and A2 classes and nursing jobs in Germany",
    file: "edupulse-learn-german.jpeg",
    width: 1024,
    height: 1536,
  },
];

export const PROGRAMMES_VIDEO = {
  src: "/gallery/courses-ad.mp4",
  poster: "/gallery/courses-ad-poster.jpg",
  title: "Our programmes, explained",
  summary: "Sainik School, RMS and RIMC entrance, NDA and IMU-CET, AMU & JMI entrance, Study in Germany (Ausbildung) and German A1–A2 with jobs in Germany, in a short video with voice-over.",
  file: "EduPulse-Programmes.mp4",
};

/** The pamphlets as Latest updates cards (shown after the academy's own updates). */
export const PAMPHLET_UPDATES: UpdateItem[] = IMAGE_PAMPHLETS.map(p => ({
  id: `pamphlet-${p.id}`,
  title: p.title,
  date: "",
  summary: p.summary,
  badge: p.badge,
  image: "",
  imageAlt: "",
  icon: p.icon,
  linkLabel: "View the pamphlet",
  linkHref: `/pamphlet#${p.id}`,
}));

/**
 * Adds the pamphlet cards to the academy's updates, skipping any the academy already lists. An update that
 * points at the Sainik School pamphlet (/pamphlet) and has no icon of its own gets the school icon.
 */
export function withPamphletUpdates(items: UpdateItem[]): UpdateItem[] {
  const ids = new Set(items.map(i => i.id));
  const own = items.map(i => !i.icon && i.linkHref === "/pamphlet" ? { ...i, icon: "School" as const } : i);
  return [...own, ...PAMPHLET_UPDATES.filter(p => !ids.has(p.id))];
}
