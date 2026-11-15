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
    slug: "aissee-class-6",
    category: "school",
    tagline: ["The first step into", "a Sainik School."],
    intro: "Complete preparation for the All India Sainik Schools Entrance Exam (AISSEE) for Class VI entry, and for the Rashtriya Military School entrance test, with chapter-wise classes and OMR-style timed practice.",
    image: "/hero/sainik.jpg",
    imageAlt: "Students in uniform writing at their desks while a teacher checks their work",
    imagePosition: "center 45%",
    highlights: ["AISSEE Class VI & RMS CET", "OMR-style mock tests", "Small batches, personal attention"],
    audience: [
      "Students in Class 5 applying for Class VI in a Sainik School",
      "Aspirants for Rashtriya Military School entrance",
      "Girls and boys who enjoy discipline, structure and a challenge",
      "Families who want a clear, step-by-step preparation plan",
    ],
    subjects: [
      { name: "Mathematics", text: "The highest-weighted section: arithmetic, geometry, mensuration and word problems at exam speed.", icon: Sigma },
      { name: "Intelligence", text: "Verbal and non-verbal reasoning, series, analogies and pattern questions.", icon: Brain },
      { name: "Language", text: "Grammar, vocabulary and comprehension in the language chosen for the paper.", icon: Languages },
      { name: "General Knowledge", text: "Science, social studies and current-affairs basics expected of a Class 5 student.", icon: Globe2 },
    ],
    roadmap: [
      { title: "Know the paper", text: "Students learn the sections, marking scheme and OMR answer sheet so nothing is a surprise." },
      { title: "Build the basics", text: "Section-wise classes cover every topic, with extra time on Mathematics." },
      { title: "Beat the clock", text: "Weekly timed tests on OMR sheets build speed, accuracy and exam temperament." },
      { title: "Final revision", text: "Previous-year papers and full-length mocks in the run-up to the exam." },
    ],
    features: [
      { title: "OMR practice", text: "Every mock is marked on an OMR-style sheet.", icon: ClipboardCheck },
      { title: "Timed mock tests", text: "Full papers under real exam timing.", icon: Timer },
      { title: "Maths focus", text: "The section that decides most results.", icon: Target },
      { title: "Parent updates", text: "Regular progress reviews with families.", icon: Users },
    ],
    faqs: [
      { q: "Who conducts AISSEE?", a: "The All India Sainik Schools Entrance Exam is conducted by the National Testing Agency (NTA). Always check the current NTA notice for eligibility, age limits and dates." },
      { q: "What does the Class VI paper cover?", a: "Recent papers have had Language, Mathematics, Intelligence and General Knowledge sections, with Mathematics carrying the most marks. We follow the latest official pattern each session." },
      { q: "Where can I see the AISSEE 2027 details?", a: "Our AISSEE 2027 pamphlet has the key dates and details; you can open it from the top banner of this site." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "aissee-class-9",
    category: "school",
    tagline: ["Class IX entry,", "prepared the disciplined way."],
    intro: "Focused preparation for the All India Sainik Schools Entrance Exam (AISSEE) for Class IX entry, covering Mathematics, Intelligence, English, General Science and Social Science with regular timed tests.",
    image: "/hero/sainik.jpg",
    imageAlt: "Students in uniform writing at their desks while a teacher checks their work",
    imagePosition: "center 30%",
    highlights: ["AISSEE Class IX", "Five-section coverage", "OMR-style mock tests"],
    audience: [
      "Students in Class 8 applying for Class IX in a Sainik School",
      "Students who want a structured, exam-focused routine",
      "Aspirants aiming for a career in the armed forces",
      "Families who want regular progress updates",
    ],
    subjects: [
      { name: "Mathematics", text: "The largest section: algebra, geometry, mensuration and data handling at exam speed.", icon: Sigma },
      { name: "Intelligence", text: "Logical and analytical reasoning, series, coding and figures.", icon: Brain },
      { name: "English", text: "Grammar, vocabulary, comprehension and usage.", icon: Languages },
      { name: "General Science", text: "Physics, Chemistry and Biology concepts up to Class 8.", icon: FlaskConical },
      { name: "Social Science", text: "History, Geography and Civics up to Class 8.", icon: Landmark },
    ],
    roadmap: [
      { title: "Know the paper", text: "Sections, marking and the OMR answer sheet, explained from day one." },
      { title: "Section-wise classes", text: "All five sections covered, with extra practice in Mathematics." },
      { title: "Timed practice", text: "Weekly OMR-style tests build speed and accuracy." },
      { title: "Final revision", text: "Previous-year papers and full mocks before the exam." },
    ],
    features: [
      { title: "OMR practice", text: "Mocks marked on OMR-style sheets.", icon: ClipboardCheck },
      { title: "Timed mock tests", text: "Full papers under real exam timing.", icon: Timer },
      { title: "Doubt sessions", text: "Every question answered in class.", icon: MessagesSquare },
      { title: "Progress reviews", text: "Clear feedback for students and parents.", icon: LineChart },
    ],
    faqs: [
      { q: "Who conducts AISSEE?", a: "The National Testing Agency (NTA). Always check the current NTA notice for eligibility, age limits and dates." },
      { q: "What does the Class IX paper cover?", a: "Recent papers have had Mathematics, Intelligence, English, General Science and Social Science, with Mathematics carrying the most marks. We follow the latest official pattern each session." },
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
  {
    slug: "nda-cds",
    category: "school",
    tagline: ["Your path to the", "armed forces starts here."],
    intro: "Preparation for the UPSC National Defence Academy (NDA) and Combined Defence Services (CDS) written exams, with guidance for the SSB interview that follows.",
    image: "/hero/sainik.jpg",
    imageAlt: "Students in uniform writing at their desks while a teacher checks their work",
    imagePosition: "center 60%",
    highlights: ["NDA & CDS written exams", "SSB interview guidance", "Full-length mock papers"],
    audience: [
      "Class 12 students and passouts aiming for NDA",
      "Graduates and final-year students preparing for CDS",
      "Aspirants who want a disciplined, test-driven routine",
      "Candidates preparing for the SSB interview",
    ],
    subjects: [
      { name: "Mathematics", text: "NDA Mathematics and CDS Elementary Mathematics, from algebra and trigonometry to calculus and statistics.", icon: Calculator },
      { name: "English", text: "Grammar, vocabulary, comprehension and usage for both exams.", icon: Languages },
      { name: "General Knowledge", text: "Physics, Chemistry, General Science, History, Geography and current affairs.", icon: Globe2 },
      { name: "SSB preparation", text: "Officer-like qualities, group tasks, psychology tests and the personal interview.", icon: Compass },
    ],
    roadmap: [
      { title: "Know the exams", text: "The written papers, marking and the SSB stage, explained clearly." },
      { title: "Build the basics", text: "Mathematics, English and GK covered topic by topic." },
      { title: "Practise under time", text: "Sectional and full-length mock papers with analysis." },
      { title: "Get SSB-ready", text: "Interview practice, group discussions and personality guidance." },
    ],
    features: [
      { title: "Mock papers", text: "Full papers in the real exam pattern.", icon: FileText },
      { title: "Current affairs", text: "Regular GK and news updates.", icon: Globe2 },
      { title: "SSB guidance", text: "Interview and group-task practice.", icon: Users },
      { title: "Progress tracking", text: "Test-wise analysis of every attempt.", icon: LineChart },
    ],
    faqs: [
      { q: "Who conducts NDA and CDS?", a: "Both are conducted by the Union Public Service Commission (UPSC), usually twice a year. Always check the current UPSC notice for eligibility, age limits and dates." },
      { q: "What is the difference between NDA and CDS?", a: "NDA is for candidates after Class 12; CDS is for graduates. NDA has Mathematics and a General Ability Test; CDS has English, General Knowledge and Elementary Mathematics (the OTA entry has English and GK only)." },
      { q: "Do you help with the SSB interview?", a: "Yes. Students who clear the written exam get guidance and practice for the SSB interview." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
  {
    slug: "imu-cet",
    category: "entrance",
    tagline: ["Set sail for a", "career at sea."],
    intro: "Preparation for the Indian Maritime University Common Entrance Test (IMU-CET), the gateway to marine engineering, nautical science and other maritime programmes.",
    image: "/hero/entrance.jpg",
    imageAlt: "A teacher writing physics equations on a green chalkboard",
    highlights: ["IMU-CET (UG)", "PCM + aptitude coverage", "Exam-pattern mock tests"],
    audience: [
      "Class 12 PCM students aiming for marine engineering or nautical science",
      "Students exploring a career in the merchant navy",
      "Aspirants who want structured practice in PCM and aptitude",
      "Students preparing alongside JEE who want a maritime option",
    ],
    subjects: [
      { name: "Physics", text: "Mechanics, electricity, optics and modern physics at entrance level.", icon: Atom },
      { name: "Chemistry", text: "Physical, organic and inorganic chemistry essentials.", icon: FlaskConical },
      { name: "Mathematics", text: "Algebra, calculus, trigonometry and coordinate geometry.", icon: Sigma },
      { name: "English & Aptitude", text: "English usage, general aptitude, reasoning and general knowledge.", icon: Brain },
    ],
    roadmap: [
      { title: "Know the test", text: "Sections, marking and the computer-based format, explained." },
      { title: "Cover the syllabus", text: "Physics, Chemistry and Mathematics alongside aptitude and English." },
      { title: "Practise online", text: "Timed computer-based mock tests like the real exam." },
      { title: "Final revision", text: "Previous papers and full mocks before the test." },
    ],
    features: [
      { title: "Online mock tests", text: "Practise in the computer-based format.", icon: ClipboardCheck },
      { title: "PCM depth", text: "Concepts taught for problem solving.", icon: Atom },
      { title: "Aptitude practice", text: "Reasoning and English drills.", icon: Brain },
      { title: "Career guidance", text: "Help choosing the right maritime course.", icon: Compass },
    ],
    faqs: [
      { q: "Who conducts IMU-CET?", a: "The Indian Maritime University. Always check the current IMU notice for eligibility (including the PCM and English marks required), medical standards and dates." },
      { q: "Which courses does IMU-CET lead to?", a: "Undergraduate maritime programmes such as B.Tech Marine Engineering and B.Sc Nautical Science, among others offered by IMU and affiliated institutes." },
      { q: "What are the batch timings and fees?", a: askTeam },
    ],
  },
];

export const courseDetails: Record<string, CourseDetail> = Object.fromEntries(courseList.map(c => [c.slug, c]));
