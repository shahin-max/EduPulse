import { Award, BookOpen, GraduationCap, Medal, Microscope, Plane, Shield, Ship, Stethoscope, Swords, type LucideIcon } from "lucide-react";

export const contact = {
  // Same numbers as the Sainik School pamphlet (/pamphlet). The first one is also used for WhatsApp.
  phones: [
    { display: "+91 70156 28794", tel: "+917015628794" },
    { display: "+91 96272 32324", tel: "+919627232324" },
  ],
  whatsapp: "917015628794",
  email: "edupulsea@gmail.com",
  address: "Lal Diggi, Civil Lines, Grand Bazar, Aligarh",
};

export const mapsQuery = encodeURIComponent(contact.address);

export const socials = {
  instagram: "https://www.instagram.com/edupulsealigarh",
  facebook: "https://www.facebook.com/share/1ECs9udonF/",
  youtube: "https://www.youtube.com/@edupulse2423",
};

export function whatsappLink(message: string) {
  return `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
}

/**
 * A program as marketed on the website. `courseSlugs` links it to courses in the LMS catalogue
 * (GET /courses), which is where batches, enquiries and enrollments live. A program with no matching
 * published course simply shows no batches.
 */
export type Program = { slug: string; title: string; detail: string; summary: string; icon: LucideIcon; courseSlugs: string[] };

export const courseHref = (slug: string) => `/courses/${slug}`;

export const programs: Program[] = [
  { slug: "aissee-class-6", courseSlugs: ["aissee-class-6"], title: "AISSEE Class 6", detail: "Sainik School & RMS Entry", icon: Shield, summary: "Complete preparation for the All India Sainik Schools Entrance Exam for Class VI, and the RMS entrance test, with OMR-style timed practice." },
  { slug: "aissee-class-9", courseSlugs: ["aissee-class-9"], title: "AISSEE Class 9", detail: "Sainik School Entry", icon: Medal, summary: "Focused preparation for the All India Sainik Schools Entrance Exam for Class IX, covering all five sections with regular mock tests." },
  { slug: "amu-jmi-entrance", courseSlugs: ["amu-entrance"], title: "AMU & JMI Entrance", detail: "University Entrance Exams", icon: GraduationCap, summary: "Targeted coaching for Aligarh Muslim University and Jamia Millia Islamia entrance tests, including previous-year paper practice." },
  { slug: "cuet-clat-gate", courseSlugs: ["cuet"], title: "CUET / CLAT & GATE", detail: "Central Universities & Law", icon: Award, summary: "Guided preparation for CUET, CLAT and GATE, covering aptitude, reasoning, language and subject sections." },
  { slug: "nda-cds", courseSlugs: ["nda-cds"], title: "NDA / CDS", detail: "Defence Services Entrance", icon: Swords, summary: "Preparation for the UPSC NDA and CDS written exams, with mock papers and guidance for the SSB interview." },
  { slug: "jee-main-advanced", courseSlugs: ["jee"], title: "JEE Main & Advanced", detail: "Engineering Entrance", icon: Microscope, summary: "Structured Physics, Chemistry and Mathematics preparation for JEE, with problem-solving practice and exam-pattern mock tests." },
  { slug: "neet", courseSlugs: ["neet"], title: "Medical Entrance (NEET)", detail: "Medical Entrance Exam", icon: Stethoscope, summary: "Physics, Chemistry and Biology preparation aligned with the NEET syllabus, with chapter tests and full-length practice papers." },
  { slug: "imu-cet", courseSlugs: ["imu-cet"], title: "IMU-CET", detail: "Merchant Navy & Maritime", icon: Ship, summary: "Preparation for the Indian Maritime University entrance test: Physics, Chemistry, Mathematics, English and aptitude, with online mock tests." },
  { slug: "foundation-classes", courseSlugs: ["school-tuition"], title: "School Tuition (Classes 6 - 10)", detail: "CBSE, ICSE & State Boards", icon: BookOpen, summary: "Concept-first classes for Grades 6 to 10 that build strong fundamentals in Mathematics, Science and English, with regular practice and progress reviews." },
  { slug: "spoken-english-abroad", courseSlugs: [], title: "Spoken English & Abroad", detail: "Global Study & IELTS Prep", icon: Plane, summary: "Build fluent, confident spoken English and prepare for IELTS and study-abroad applications with practical speaking sessions." },
];

/** Catalogue courses that no website program covers, listed separately on /courses. */
export function unlinkedCourses<T extends { slug: string }>(courses: T[]): T[] {
  const linked = new Set(programs.flatMap(p => p.courseSlugs));
  return courses.filter(c => !linked.has(c.slug));
}
