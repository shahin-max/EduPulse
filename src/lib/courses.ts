import {
  Atom, BookOpen, Brain, Calculator, ClipboardCheck, Compass, FileText, FlaskConical, Globe2, Landmark, Languages,
  Leaf, LineChart, MessagesSquare, Mic, NotebookPen, PenLine, Scale, Sigma, Target, Timer, Users, type LucideIcon,
} from "lucide-react";

export type CourseCategory = "school" | "entrance" | "university" | "english";

export const courseCategories: { id: CourseCategory | "all"; label: string }[] = [
  { id: "all", label: "All programs" },
  { id: "school", label: "School & Defence" },
  { id: "entrance", label: "Engineering & Medical" },
  { id: "university", label: "University Entrance" },
  { id: "english", label: "English & Abroad" },
];

export type CourseDetail = {
  slug: string;
  category: CourseCategory;
  tagline: [lead: string, emphasis: string];
  intro: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
  highlights: string[];
  audience: string[];
  subjects: { name: string; text: string; icon: LucideIcon }[];
  roadmap: { title: string; text: string }[];
  features: { title: string; text: string; icon: LucideIcon }[];
  faqs: { q: string; a: string }[];
};

const askTeam = "Batch timings, fees and start dates change from session to session, so please call or WhatsApp our team for the current schedule.";

const courseList: CourseDetail[] = [
  {
    slug: "foundation-classes",
    category: "school",
    tagline: ["Strong roots today,", "brighter results tomorrow."],
    intro: "Concept-first classes for Grades 6 to 10 that build strong fundamentals in Mathematics, Science and English, with regular practice and progress reviews.",
    image: "/hero/foundation.jpg",
    imageAlt: "A schoolgirl in uniform standing confidently in front of her classmates",
    imagePosition: "center 30%",
    highlights: ["Grades 6 – 10", "CBSE · ICSE · State Boards", "Progress reviews"],
    audience: [
      "Students of Grades 6 to 10 who want school concepts to finally click",
      "Learners preparing for board exams with confidence",
      "Students planning ahead for JEE, NEET or Olympiad-style thinking",
      "Parents who want regular, clear feedback on progress",
    ],
    subjects: [
      { name: "Mathematics", text: "Number sense, algebra, geometry and problem-solving built step by step.", icon: Calculator },
      { name: "Science", text: "Physics, Chemistry and Biology concepts explained through everyday examples.", icon: FlaskConical },
      { name: "English", text: "Grammar, reading comprehension and clear, confident writing.", icon: BookOpen },
    ],
    roadmap: [
      { title: "Understand", text: "Every chapter starts from the concept, not the formula, so students know why before how." },
      { title: "Practise", text: "Graded worksheets move from basic to challenging questions in each topic." },
      { title: "Review", text: "Regular tests and progress reviews show exactly where a student stands." },
      { title: "Strengthen", text: "Weak areas are revisited until they become strengths before the exam." },
    ],
    features: [
      { title: "Concept-first teaching", text: "Clarity before speed, at every grade.", icon: Brain },
      { title: "Regular practice", text: "Structured worksheets and homework support.", icon: NotebookPen },
      { title: "Progress reviews", text: "Clear feedback for students and parents.", icon: LineChart },
      { title: "Doubt support", text: "Questions are welcome, every class.", icon: MessagesSquare },
    ],
    faqs: [
      { q: "Which boards do you cover?", a: "We teach students from CBSE, ICSE and State Boards, and align practice with each student's school syllabus." },
      { q: "Will this help with competitive exams later?", a: "Yes. Strong fundamentals in Mathematics and Science are the base for JEE, NEET and other entrance exams." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "sainik-school-entrance",
    category: "school",
    tagline: ["Discipline that builds", "future leaders."],
    intro: "Focused preparation for Rashtriya Military School and Sainik School entrance exams, covering the written paper with timed practice tests.",
    image: "/hero/sainik.jpg",
    imageAlt: "Students in uniform writing at their desks while a teacher checks their work",
    imagePosition: "center 45%",
    highlights: ["AISSEE & RMS CET", "Class VI & Class IX entry", "Timed practice tests"],
    audience: [
      "Students seeking admission to Class VI or Class IX in Sainik Schools",
      "Aspirants for Rashtriya Military School entrance",
      "Children who enjoy discipline, structure and a challenge",
      "Families who want a clear, step-by-step preparation plan",
    ],
    subjects: [
      { name: "Mathematics", text: "Arithmetic, mensuration and reasoning-based maths at exam speed.", icon: Sigma },
      { name: "Intelligence", text: "Verbal and non-verbal reasoning, patterns and series.", icon: Brain },
      { name: "Language & English", text: "Grammar, vocabulary and comprehension practice.", icon: Languages },
      { name: "General Knowledge", text: "Current affairs, general awareness and, for Class IX, Science and Social Science.", icon: Globe2 },
    ],
    roadmap: [
      { title: "Know the paper", text: "Students learn the exam pattern, sections and marking so nothing is a surprise." },
      { title: "Build the basics", text: "Section-wise classes cover every topic in the written paper." },
      { title: "Beat the clock", text: "Timed practice tests build speed, accuracy and exam temperament." },
      { title: "Final revision", text: "Previous papers and full mock tests in the run-up to the exam." },
    ],
    features: [
      { title: "Exam-pattern practice", text: "Questions modelled on the real paper.", icon: ClipboardCheck },
      { title: "Timed mock tests", text: "Speed and accuracy under exam conditions.", icon: Timer },
      { title: "Section-wise focus", text: "Maths, reasoning, language and GK covered.", icon: Target },
      { title: "Personal guidance", text: "Mentors who track each child's progress.", icon: Users },
    ],
    faqs: [
      { q: "Which exams does this cover?", a: "Preparation covers the All India Sainik Schools Entrance Exam (AISSEE) and the Rashtriya Military School entrance test, for Class VI and Class IX entry." },
      { q: "Where can I see the AISSEE 2027 details?", a: "Our AISSEE 2027 pamphlet has the key dates and details; you can open it from the top banner of this site." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "jee-main-advanced",
    category: "entrance",
    tagline: ["Crack the concepts,", "clear the entrance."],
    intro: "Structured Physics, Chemistry and Mathematics preparation for JEE, with problem-solving practice and exam-pattern mock tests.",
    image: "/hero/entrance.jpg",
    imageAlt: "A teacher writing physics equations on a green chalkboard",
    imagePosition: "center 35%",
    highlights: ["JEE Main & Advanced", "Physics · Chemistry · Maths", "Exam-pattern mocks"],
    audience: [
      "Class XI and XII students aiming for engineering colleges",
      "Droppers who want a structured second attempt",
      "Students who want to balance board exams with JEE preparation",
      "Learners who enjoy solving tough problems",
    ],
    subjects: [
      { name: "Physics", text: "Mechanics to modern physics, with a strong focus on problem-solving.", icon: Atom },
      { name: "Chemistry", text: "Physical, organic and inorganic chemistry, concept by concept.", icon: FlaskConical },
      { name: "Mathematics", text: "Algebra, calculus, coordinate geometry and more, built for speed.", icon: Sigma },
    ],
    roadmap: [
      { title: "Foundations", text: "Core concepts of each chapter, connected to the board syllabus." },
      { title: "Problem-solving", text: "Graded problem sets from JEE Main level up to Advanced level." },
      { title: "Test & analyse", text: "Chapter tests and full mocks in the exam pattern, with performance analysis." },
      { title: "Peak for the exam", text: "Revision plans, previous-year papers and strategy for the final weeks." },
    ],
    features: [
      { title: "Problem-solving practice", text: "Daily practice that builds speed.", icon: PenLine },
      { title: "Exam-pattern mocks", text: "Full-length tests in the real format.", icon: ClipboardCheck },
      { title: "Performance analysis", text: "See exactly where marks are lost.", icon: LineChart },
      { title: "Doubt clearing", text: "Dedicated time for every question.", icon: MessagesSquare },
    ],
    faqs: [
      { q: "Do you prepare for both JEE Main and JEE Advanced?", a: "Yes. Classes build from JEE Main level problems up to JEE Advanced level, across Physics, Chemistry and Mathematics." },
      { q: "Will my board exam preparation suffer?", a: "No. Concepts are taught alongside the Class XI and XII syllabus so board and entrance preparation support each other." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "neet",
    category: "entrance",
    tagline: ["Prepare with purpose,", "become a doctor."],
    intro: "Physics, Chemistry and Biology preparation aligned with the NEET syllabus, with chapter tests and full-length practice papers.",
    image: "/academy-students.png",
    imageAlt: "Two students studying together at a library table",
    imagePosition: "center 30%",
    highlights: ["NEET-UG", "Physics · Chemistry · Biology", "Full-length practice papers"],
    audience: [
      "Class XI and XII students aiming for MBBS, BDS and allied courses",
      "Droppers preparing for another attempt",
      "Students who want NCERT-aligned, exam-focused teaching",
      "Learners who want regular testing and feedback",
    ],
    subjects: [
      { name: "Biology", text: "Botany and Zoology taught thoroughly, line by line from the NCERT base.", icon: Leaf },
      { name: "Chemistry", text: "Physical, organic and inorganic chemistry for medical entrance.", icon: FlaskConical },
      { name: "Physics", text: "Concepts and numericals made approachable and exam-ready.", icon: Atom },
    ],
    roadmap: [
      { title: "NCERT mastery", text: "Every chapter is built on the NCERT foundation the exam relies on." },
      { title: "Chapter tests", text: "Short tests after each chapter lock in what was learned." },
      { title: "Full-length papers", text: "Practice papers in the NEET pattern build stamina and timing." },
      { title: "Revise & refine", text: "Error analysis and focused revision before the exam." },
    ],
    features: [
      { title: "NCERT-aligned", text: "Teaching that follows the syllabus closely.", icon: BookOpen },
      { title: "Chapter tests", text: "Regular checks on every topic.", icon: ClipboardCheck },
      { title: "Practice papers", text: "Full-length tests in the exam pattern.", icon: FileText },
      { title: "Mentor support", text: "Guidance on study plans and doubts.", icon: Users },
    ],
    faqs: [
      { q: "Is the course aligned with the NEET syllabus?", a: "Yes. Physics, Chemistry and Biology are taught in line with the NEET syllabus, with NCERT as the base." },
      { q: "How often are tests held?", a: "Chapter tests run alongside classes, with full-length practice papers as preparation advances. Our team can share the current test schedule." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "cuet-clat-gate",
    category: "university",
    tagline: ["Your university,", "your direction."],
    intro: "Guided preparation for CUET, CLAT and GATE, covering aptitude, reasoning, language and subject sections.",
    image: "/hero/university.jpg",
    imageAlt: "Two students with backpacks reading a book together",
    imagePosition: "center 35%",
    highlights: ["CUET-UG · CLAT · GATE", "Aptitude & reasoning", "Subject sections"],
    audience: [
      "Class XII students targeting central universities through CUET",
      "Law aspirants preparing for CLAT",
      "Engineering graduates and final-year students preparing for GATE",
      "Students who want structured aptitude and reasoning practice",
    ],
    subjects: [
      { name: "Language & Comprehension", text: "Reading comprehension, grammar and verbal ability.", icon: Languages },
      { name: "Reasoning & Aptitude", text: "Logical reasoning, quantitative aptitude and data interpretation.", icon: Brain },
      { name: "Legal & General Awareness", text: "Current affairs and legal reasoning for CLAT.", icon: Scale },
      { name: "Domain Subjects", text: "Subject sections for CUET and GATE, matched to your stream.", icon: BookOpen },
    ],
    roadmap: [
      { title: "Choose your path", text: "We map your target exam, sections and subjects with you." },
      { title: "Build each section", text: "Aptitude, reasoning, language and subject classes, section by section." },
      { title: "Practise smart", text: "Sectional tests and previous-year questions build accuracy." },
      { title: "Mock & refine", text: "Full mock tests and strategy for exam day." },
    ],
    features: [
      { title: "Exam mapping", text: "A plan matched to your target exam.", icon: Compass },
      { title: "Sectional tests", text: "Focused practice for every section.", icon: ClipboardCheck },
      { title: "Aptitude drills", text: "Reasoning and quant at exam speed.", icon: Timer },
      { title: "Personal guidance", text: "Mentors who help you choose well.", icon: Users },
    ],
    faqs: [
      { q: "Can I prepare for more than one exam?", a: "Yes. Aptitude, reasoning and language sections overlap across these exams, and we plan subject preparation around your targets." },
      { q: "Do you cover GATE subject papers?", a: "Talk to our team about your GATE paper; we'll explain what we cover for your branch." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "amu-jmi-entrance",
    category: "university",
    tagline: ["Your seat at", "AMU & JMI awaits."],
    intro: "Targeted coaching for Aligarh Muslim University and Jamia Millia Islamia entrance tests, including previous-year paper practice.",
    image: "/courses/library.jpg", // Dollar Gill — unsplash.com/photos/qlP7MgTFwpk (Unsplash License)
    imageAlt: "A student reading a book between library shelves",
    imagePosition: "center 35%",
    highlights: ["AMU & JMI entrance tests", "School & university entry", "Previous-year papers"],
    audience: [
      "Students seeking admission to AMU and JMI schools and university programs",
      "Aligarh students who want local, focused coaching for AMU",
      "Learners who want practice with previous-year papers",
      "Students who want guidance through the admission process",
    ],
    subjects: [
      { name: "Mathematics", text: "Exam-focused maths practice matched to the entrance paper.", icon: Calculator },
      { name: "Science", text: "Physics, Chemistry and Biology for science-stream entrances.", icon: FlaskConical },
      { name: "English", text: "Grammar, vocabulary and comprehension practice.", icon: BookOpen },
      { name: "General Awareness", text: "Current affairs and general knowledge, including Indian polity and history.", icon: Landmark },
    ],
    roadmap: [
      { title: "Pick the test", text: "We identify the right entrance test for your class and course." },
      { title: "Cover the syllabus", text: "Subject classes matched to that test's paper." },
      { title: "Previous papers", text: "Regular practice with previous-year question papers." },
      { title: "Admission ready", text: "Mock tests and guidance through the admission steps." },
    ],
    features: [
      { title: "Targeted coaching", text: "Matched to the AMU or JMI test you're taking.", icon: Target },
      { title: "Previous-year papers", text: "Learn the paper by practising it.", icon: FileText },
      { title: "Mock tests", text: "Timed practice before the real test.", icon: Timer },
      { title: "Admission guidance", text: "Help understanding the process.", icon: Compass },
    ],
    faqs: [
      { q: "Do you cover both AMU and JMI entrance tests?", a: "Yes. Coaching is targeted to the Aligarh Muslim University and Jamia Millia Islamia entrance test you are applying for." },
      { q: "Which classes and courses are covered?", a: "Tell our team the class or course you're applying to and we'll confirm the matching preparation." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "spoken-english-abroad",
    category: "english",
    tagline: ["Speak with confidence,", "go global."],
    intro: "Build fluent, confident spoken English and prepare for IELTS and study-abroad applications with practical speaking sessions.",
    image: "/hero/spoken-english.jpg",
    imageAlt: "A smiling graduate in a cap and gown",
    imagePosition: "center 30%",
    highlights: ["Spoken English", "IELTS preparation", "Study-abroad guidance"],
    audience: [
      "Students and professionals who want to speak English confidently",
      "IELTS candidates preparing for study or work abroad",
      "Learners preparing for interviews and presentations",
      "Anyone who understands English but hesitates to speak it",
    ],
    subjects: [
      { name: "Speaking & Fluency", text: "Practical speaking sessions that build confidence every class.", icon: Mic },
      { name: "Grammar in Use", text: "The grammar you actually need, practised in real conversation.", icon: PenLine },
      { name: "IELTS Modules", text: "Listening, Reading, Writing and Speaking, with exam strategy.", icon: ClipboardCheck },
      { name: "Study Abroad", text: "Guidance on study-abroad applications and next steps.", icon: Globe2 },
    ],
    roadmap: [
      { title: "Find your level", text: "We start by understanding how comfortably you speak today." },
      { title: "Speak every day", text: "Practical speaking sessions, discussions and role-plays." },
      { title: "Polish & prepare", text: "Pronunciation, grammar and IELTS module practice." },
      { title: "Go global", text: "Mock speaking tests and study-abroad application guidance." },
    ],
    features: [
      { title: "Practical sessions", text: "Less theory, more speaking.", icon: Mic },
      { title: "IELTS strategy", text: "All four modules covered.", icon: ClipboardCheck },
      { title: "Interview practice", text: "Confidence for real situations.", icon: MessagesSquare },
      { title: "Abroad guidance", text: "Support with your applications.", icon: Globe2 },
    ],
    faqs: [
      { q: "I'm a complete beginner. Can I join?", a: "Yes. We start from your current level and build speaking confidence step by step." },
      { q: "Do you prepare for IELTS?", a: "Yes. IELTS preparation covers the Listening, Reading, Writing and Speaking modules with practice tests." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
];

export const courseDetails: Record<string, CourseDetail> = Object.fromEntries(courseList.map(c => [c.slug, c]));
