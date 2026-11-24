"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Award, Brain, ClipboardCheck, GraduationCap, LineChart, MessagesSquare, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE, Reveal, TiltCard, Words, rise, stagger } from "@/components/motion-kit";
import { departmentId, faculty, leaders } from "@/lib/team";
import { teacherSubjects, type ApiFaculty } from "@/lib/api";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

const principles = [
  { title: "Concept-first teaching", text: "Every topic starts from the idea behind it, so students understand why before how.", icon: Brain },
  { title: "Regular practice & tests", text: "Worksheets, chapter tests and mock papers keep learning active and exam-ready.", icon: ClipboardCheck },
  { title: "Doubt support", text: "Questions are welcome in every class. No student is left with an unanswered doubt.", icon: MessagesSquare },
  { title: "Progress reviews", text: "Clear feedback for students and parents on where they stand and what comes next.", icon: LineChart },
];

/** "Ayesha Khan" → "AK", for a teacher without a photo. */
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("");

/** Introductions longer than this start collapsed, with "Read more". */
const LONG_BIO = 220;

/** A teacher's profile from the LMS: portrait, specialisation, qualification, introduction and subjects. */
function TeacherCard({ teacher }: { teacher: ApiFaculty }) {
  const [open, setOpen] = useState(false);
  const subjects = teacherSubjects(teacher);
  const name = teacher.users.full_name;
  const bio = teacher.biography?.trim() ?? "";
  const long = bio.length > LONG_BIO;
  return (
    <article className="teacher-card">
      <div className="teacher-photo">
        {teacher.users.photo_url
          ? <Image src={teacher.users.photo_url} alt={`Portrait of ${name}`} fill sizes="(max-width: 640px) 100vw, 360px" />
          : <span className="teacher-initials" aria-hidden="true">{initials(name) || <UserRound size={48} strokeWidth={1.4} />}</span>}
      </div>
      <div className="teacher-body">
        <h3>{name}</h3>
        {teacher.specialization && <p className="teacher-role">{teacher.specialization}</p>}
        {teacher.qualification && <p className="teacher-qual"><Award size={15} aria-hidden="true" />{teacher.qualification}</p>}
        {bio && <>
          <p className={`teacher-bio${long && !open ? " is-clamped" : ""}`}>{bio}</p>
          {long && <button type="button" className="teacher-more" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? "Show less" : "Read more"}</button>}
        </>}
        {subjects.length > 0 && <ul className="teacher-chips" aria-label="Subjects">{subjects.map(s => <li key={s}>{s}</li>)}</ul>}
      </div>
    </article>
  );
}

export default function FacultyPage({ teachers = [] }: { teachers?: ApiFaculty[] }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  // Filter teachers by subject once there are enough of them for it to help.
  const subjectOptions = [...new Set(teachers.flatMap(teacherSubjects))];
  const showFilter = teachers.length >= 4 && subjectOptions.length >= 2;
  const [subject, setSubject] = useState("all");
  const shown = subject === "all" ? teachers : teachers.filter(t => teacherSubjects(t).includes(subject));

  return (
    <MotionConfig reducedMotion="user">
      <div className="course-page faculty-page">
        <motion.div className="course-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <section className="course-hero faculty-hero" aria-labelledby="faculty-title">
          <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
          <HeroScene3D slide={0} />
          <div className="page-container course-hero-inner">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.nav variants={rise} className="course-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Faculty</span>
              </motion.nav>
              <motion.p variants={rise} className="course-kicker"><span className="course-kicker-icon"><GraduationCap size={17} /></span>OUR FACULTY</motion.p>
              <motion.h1 id="faculty-title" className="hero-title course-title faculty-title" variants={stagger}>
                <span><Words text="The mentors behind" /></span>{" "}
                <em><Words text="every milestone." /></em>
              </motion.h1>
              <motion.p variants={rise} className="course-intro">Six subject departments, one shared approach: concept-first teaching, regular practice and personal attention for every student, from Grade 6 foundations to entrance exams.</motion.p>
              <motion.ul variants={rise} className="course-chips faculty-hero-chips">
                {faculty.map(f => <li key={f.department}><a href={`#${departmentId(f.department)}`}><f.icon size={14} />{f.department}</a></li>)}
              </motion.ul>
            </motion.div>

            <div className="faculty-orbit" aria-hidden="true">
              <span className="faculty-orbit-ring ring-a" />
              <span className="faculty-orbit-ring ring-b" />
              <motion.span className="faculty-orbit-core" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.3 }}>
                <GraduationCap size={54} strokeWidth={1.4} />
              </motion.span>
              {faculty.map((f, i) => {
                const angle = (i / faculty.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <motion.span
                    key={f.department}
                    className="faculty-orbit-node"
                    style={{ left: `${50 + Math.cos(angle) * 40}%`, top: `${50 + Math.sin(angle) * 40}%` }}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
                    transition={{ opacity: { delay: 0.45 + i * 0.1 }, scale: { type: "spring", stiffness: 220, damping: 14, delay: 0.45 + i * 0.1 }, y: { duration: 4 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 } }}
                  >
                    <f.icon size={22} />
                    <small>{f.department.split(" ")[0]}</small>
                  </motion.span>
                );
              })}
            </div>
          </div>
        </section>

        {teachers.length > 0 && <section id="teachers" className="page-container faculty-section" aria-labelledby="teachers-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">OUR TEACHERS</motion.p>
            <motion.h2 variants={rise} id="teachers-title">Meet the people <span>who teach you.</span></motion.h2>
          </Reveal>
          {showFilter && <div className="teacher-filter" role="group" aria-label="Filter teachers by subject">
            {["all", ...subjectOptions].map(s => (
              <button key={s} type="button" className={subject === s ? "is-active" : undefined} aria-pressed={subject === s} onClick={() => setSubject(s)}>
                {s === "all" ? "All subjects" : s}
              </button>
            ))}
          </div>}
          <ul className="teacher-grid">
            {shown.map((teacher, i) => (
              <motion.li key={teacher.user_id} id={`teacher-${teacher.user_id}`} className="faculty-teacher-anchor"
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.5, ease: EASE, delay: Math.min(i, 5) * 0.05 }}>
                <TeacherCard teacher={teacher} />
              </motion.li>
            ))}
          </ul>
        </section>}

        <section id="departments" className={`page-container faculty-section${teachers.length > 0 ? " has-divider" : ""}`} aria-labelledby="departments-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">DEPARTMENTS</motion.p>
            <motion.h2 variants={rise} id="departments-title">Subjects <span>we teach.</span></motion.h2>
          </Reveal>
          <ul className="dept-grid">
            {faculty.map(d => (
              <li key={d.department} id={departmentId(d.department)} className="dept-tile">
                <span className="dept-icon" aria-hidden="true"><d.icon size={22} strokeWidth={1.7} /></span>
                <span className="dept-text">
                  <strong>{d.department}</strong>
                  <small>{d.subjects.join(" · ")}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="course-band" aria-labelledby="approach-title">
          <div className="page-container">
            <Reveal className="course-section-head">
              <motion.p variants={rise} className="section-kicker">HOW OUR FACULTY TEACH</motion.p>
              <motion.h2 variants={rise} id="approach-title">One approach, <span>every classroom.</span></motion.h2>
            </Reveal>
            <Reveal className="course-subjects count-4">
              {principles.map(({ title, text, icon: Icon }, i) => (
                <TiltCard key={title} className="course-subject">
                  <span className="course-subject-index">{String(i + 1).padStart(2, "0")}</span>
                  <span className="course-subject-icon"><Icon size={24} strokeWidth={1.6} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </TiltCard>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="page-container course-section faculty-leaders" aria-labelledby="faculty-leaders-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">LEADERSHIP</motion.p>
            <motion.h2 variants={rise} id="faculty-leaders-title">Guided by <span>our leadership.</span></motion.h2>
          </Reveal>
          <Reveal className="faculty-leader-grid">
            {leaders.map(leader => (
              <TiltCard key={leader.name} className="faculty-leader" max={5}>
                <span className="faculty-leader-photo"><Image src={leader.image} alt={leader.imageAlt} fill sizes="96px" /></span>
                <span className="faculty-leader-text">
                  <small>{leader.role.toUpperCase()}</small>
                  <strong>{leader.name}</strong>
                  <Link href="/aboutus#leadership">Read their message <ArrowRight size={14} /></Link>
                </span>
              </TiltCard>
            ))}
          </Reveal>
        </section>

        <section className="page-container course-cta-wrap" aria-labelledby="faculty-cta-title">
          <motion.div className="course-cta" initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.8, ease: EASE }}>
            <span className="course-cta-glow" aria-hidden="true" />
            <div>
              <p className="course-cta-kicker"><Sparkles size={12} /> LEARN WITH THE RIGHT MENTORS</p>
              <h2 id="faculty-cta-title">Find your program and meet your mentors.</h2>
              <p>Explore our programs or talk to our team about batches, timings and the right starting point.</p>
            </div>
            <div className="course-cta-actions">
              <Button asChild size="lg" className="course-cta-primary"><Link href="/courses">Explore courses <ArrowRight size={16} /></Link></Button>
              <Button asChild size="lg" variant="outline" className="course-cta-secondary"><Link href="/contact">Talk to our team <ArrowRight size={16} /></Link></Button>
            </div>
          </motion.div>
        </section>
      </div>
    </MotionConfig>
  );
}
