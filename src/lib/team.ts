import { Atom, BookOpen, Brain, Calculator, FlaskConical, Leaf, type LucideIcon } from "lucide-react";

/** People shown on /aboutus and /faculty. Only add real people with their permission. */

export type Leader = {
  name: string;
  role: string;
  image: string;
  imageAlt: string;
  label: string;
  message: string[];
};

export const leaders: Leader[] = [
  {
    name: "Gopal Kaur",
    role: "Business Investor",
    image: "/about/gopal-kaur.png",
    imageAlt: "Portrait of Gopal Kaur, Business Investor",
    label: "THE PEOPLE BEHIND EDUPULSE",
    message: [
      "Dear Directors, Employees, and Members of the Edupulse Family,",
      "It is a privilege to be associated with Edupulse, an organization committed to excellence in hospitality, aviation, and professional education. Together, let us continue to uphold the values of integrity, respect, teamwork, and excellence. I wish every member of the Edupulse family continued success and look forward to achieving greater milestones together.",
    ],
  },
  {
    name: "Priyansh Mittal",
    role: "Co-Founder & Director",
    image: "/about/priyansh-mittal.png",
    imageAlt: "Portrait of Priyansh Mittal, Co-founder and Director",
    label: "GUIDANCE WITH PURPOSE",
    message: [
      "Success is never achieved by chance, it is through discipline, consistency, and the willingness to learn every single day. At Edupulse, our focus is to ensure that every student receives industry-oriented guidance and develops the professional standards expected by leading organizations. We look forward to witnessing your growth and celebrating your success.",
    ],
  },
];

/**
 * Faculty, grouped by department. A member without `name` renders as a "profile coming soon" card.
 * To publish a real profile, fill in the optional fields:
 *   name, qualification (e.g. "M.Sc. Physics"), experience (e.g. "8 years teaching"),
 *   image (put the photo in /public/faculty/), and bio (one or two sentences).
 */
export type FacultyMember = {
  department: string;
  icon: LucideIcon;
  subjects: string[];
  /** Course slugs from src/lib/site.ts this faculty teaches for. */
  programs: string[];
  name?: string;
  qualification?: string;
  experience?: string;
  image?: string;
  bio?: string;
};

export const faculty: FacultyMember[] = [
  { department: "Mathematics", icon: Calculator, subjects: ["Algebra", "Geometry", "Calculus", "Arithmetic"], programs: ["foundation-classes", "sainik-school-entrance", "jee-main-advanced", "amu-jmi-entrance"] },
  { department: "Physics", icon: Atom, subjects: ["Mechanics", "Electricity", "Optics", "Modern Physics"], programs: ["foundation-classes", "jee-main-advanced", "neet"] },
  { department: "Chemistry", icon: FlaskConical, subjects: ["Physical", "Organic", "Inorganic"], programs: ["foundation-classes", "jee-main-advanced", "neet"] },
  { department: "Biology", icon: Leaf, subjects: ["Botany", "Zoology", "Human Physiology"], programs: ["foundation-classes", "neet"] },
  { department: "English & Communication", icon: BookOpen, subjects: ["Grammar", "Spoken English", "IELTS"], programs: ["foundation-classes", "spoken-english-abroad", "cuet-clat-gate"] },
  { department: "Reasoning & General Awareness", icon: Brain, subjects: ["Logical Reasoning", "Aptitude", "General Knowledge"], programs: ["sainik-school-entrance", "cuet-clat-gate", "amu-jmi-entrance"] },
];

export const departments = faculty.map(f => f.department);

/** Anchor id for a department, e.g. "English & Communication" → "english-communication". */
export const departmentId = (department: string) => department.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
