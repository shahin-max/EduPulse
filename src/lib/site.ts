import { Award, BookOpen, GraduationCap, Microscope, Plane, Shield, Stethoscope, type LucideIcon } from "lucide-react";

export const contact = {
  // Same numbers as the Sainik School pamphlet (/pamphlet). The first one is also used for WhatsApp.
  phones: [
    { display: "+91 70156 28794", tel: "+917015628794" },
    { display: "+91 96272 32324", tel: "+919627232324" },
  ],
  whatsapp: "917015628794",
  email: "edupulsea@gmail.com",
  address: "3/105 Marris Road, Infront of Baby land School, Aligarh - 202001",
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

export type Program = { title: string; detail: string; summary: string; icon: LucideIcon };

export const programs: Program[] = [
  { title: "Foundation Classes 6 - 10", detail: "CBSE, ICSE & State Boards", icon: BookOpen, summary: "Concept-first classes for Grades 6 to 10 that build strong fundamentals in Mathematics, Science and English, with regular practice and progress reviews." },
  { title: "RMS / Sainik School Entrance", detail: "Defence School Preparation", icon: Shield, summary: "Focused preparation for Rashtriya Military School and Sainik School entrance exams, covering the written paper with timed practice tests." },
  { title: "JEE Main & Advanced", detail: "Engineering Entrance", icon: Microscope, summary: "Structured Physics, Chemistry and Mathematics preparation for JEE, with problem-solving practice and exam-pattern mock tests." },
  { title: "Medical Entrance (NEET)", detail: "Medical Entrance Exam", icon: Stethoscope, summary: "Physics, Chemistry and Biology preparation aligned with the NEET syllabus, with chapter tests and full-length practice papers." },
  { title: "CUET / CLAT & GATE", detail: "Central Universities & Law", icon: Award, summary: "Guided preparation for CUET, CLAT and GATE, covering aptitude, reasoning, language and subject sections." },
  { title: "AMU & JMI Entrance", detail: "University Entrance Exams", icon: GraduationCap, summary: "Targeted coaching for Aligarh Muslim University and Jamia Millia Islamia entrance tests, including previous-year paper practice." },
  { title: "Spoken English & Abroad", detail: "Global Study & IELTS Prep", icon: Plane, summary: "Build fluent, confident spoken English and prepare for IELTS and study-abroad applications with practical speaking sessions." },
];
