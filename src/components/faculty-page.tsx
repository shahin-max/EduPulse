"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Brain, ClipboardCheck, GraduationCap, LineChart, MessagesSquare, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE, Reveal, TiltCard, Words, rise, stagger } from "@/components/motion-kit";
import { courseHref, programs } from "@/lib/site";
import { departmentId, faculty, leaders, type FacultyMember } from "@/lib/team";
import type { ApiFaculty } from "@/lib/api";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

const programTitle = Object.fromEntries(programs.map(p => [p.slug, p.title]));

const principles = [
  { title: "Concept-first teaching", text: "Every topic starts from the idea behind it, so students understand why before how.", icon: Brain },
  { title: "Regular practice & tests", text: "Worksheets, chapter tests and mock papers keep learning active and exam-ready.", icon: ClipboardCheck },
  { title: "Doubt support", text: "Questions are welcome in every class. No student is left with an unanswered doubt.", icon: MessagesSquare },
  { title: "Progress reviews", text: "Clear feedback for students and parents on where they stand and what comes next.", icon: LineChart },
];

function FacultyCard({ member }: { member: FacultyMember }) {
  const Icon = member.icon;
  const published = Boolean(member.name);
  return (
    <article className={`faculty-card${published ? "" : " is-pending"}`}>
      <div className="faculty-card-top">
        <span className="faculty-card-pattern" aria-hidden="true"><Icon size={120} strokeWidth={1} /></span>
        <span className="faculty-dept"><Icon size={14} />{member.department}</span>
        <div className="faculty-avatar">
          {member.image ? <Image src={member.image} alt={`Portrait of ${member.name}`} fill sizes="104px" /> : <span aria-hidden="true">{published ? <UserRound size={42} strokeWidth={1.4} /> : <Icon size={40} strokeWidth={1.4} />}</span>}
        </div>
      </div>
      <div className="faculty-card-body">
        <h3>{member.name ?? `${member.department} Faculty`}</h3>
        {published
          ? <p className="faculty-meta">{[member.qualification, member.experience].filter(Boolean).join(" · ")}</p>
          : <p className="faculty-pending"><span aria-hidden="true" />Full profile coming soon</p>}
        {member.bio && <p className="faculty-bio">{member.bio}</p>}
        <div className="faculty-block">
          <span className="faculty-block-label">Subjects</span>
          <ul className="faculty-chips">{member.subjects.map(s => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="faculty-block">
          <span className="faculty-block-label">Teaches for</span>
          <ul className="faculty-programs">
            {member.programs.map(slug => <li key={slug}><Link href={courseHref(slug)}>{programTitle[slug]}<ArrowRight size={13} /></Link></li>)}
          </ul>
        </div>
      </div>
    </article>
  );
}

/** A teacher's own profile from the LMS: photo, qualification, introduction and the subjects they teach. */
function TeacherCard({ teacher }: { teacher: ApiFaculty }) {
  const subjects = [...new Set(teacher.batch_faculty.map(b => b.subjects.name))];
  const name = teacher.users.full_name;
  return (
    <article className="faculty-card">
      <div className="faculty-card-top">
        <span className="faculty-card-pattern" aria-hidden="true"><GraduationCap size={120} strokeWidth={1} /></span>
        {teacher.specialization && <span className="faculty-dept"><GraduationCap size={14} />{teacher.specialization}</span>}
        <div className="faculty-avatar">
          {teacher.users.photo_url
            ? <Image src={teacher.users.photo_url} alt={`Portrait of ${name}`} fill sizes="104px" />
            : <span aria-hidden="true"><UserRound size={42} strokeWidth={1.4} /></span>}
        </div>
      </div>
      <div className="faculty-card-body">
        <h3>{name}</h3>
        {teacher.qualification && <p className="faculty-meta">{teacher.qualification}</p>}
        {teacher.biography && <p className="faculty-bio">{teacher.biography}</p>}
        {subjects.length > 0 && <div className="faculty-block">
          <span className="faculty-block-label">Teaches</span>
          <ul className="faculty-chips">{subjects.map(s => <li key={s}>{s}</li>)}</ul>
        </div>}
      </div>
    </article>
  );
}

export default function FacultyPage({ teachers = [] }: { teachers?: ApiFaculty[] }) {
  const [filter, setFilter] = useState<string>("all");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  // Deep links like /faculty#physics select that department.
  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const match = faculty.find(f => departmentId(f.department) === id);
      if (match) { setFilter(match.department); document.getElementById("departments")?.scrollIntoView({ behavior: "smooth" }); }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const visible = filter === "all" ? faculty : faculty.filter(f => f.department === filter);

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

        <section id="departments" className="page-container faculty-browse" aria-labelledby="departments-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">DEPARTMENTS</motion.p>
            <motion.h2 variants={rise} id="departments-title">Meet the faculty <span>by subject.</span></motion.h2>
          </Reveal>
          <div className="courses-toolbar faculty-toolbar">
            <div className="courses-tabs" role="group" aria-label="Filter faculty by department">
              {["all", ...faculty.map(f => f.department)].map(d => (
                <button key={d} type="button" className={`courses-tab${filter === d ? " is-active" : ""}`} aria-pressed={filter === d} onClick={() => setFilter(d)}>
                  {d === "all" ? "All departments" : d}
                </button>
              ))}
            </div>
          </div>
          <motion.ul layout className="faculty-grid">
            <AnimatePresence mode="popLayout">
              {visible.map((member, i) => (
                <motion.li
                  key={member.department}
                  id={departmentId(member.department)}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE, delay: Math.min(i, 5) * 0.06 } }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
                  whileHover={{ y: -8 }}
                >
                  <FacultyCard member={member} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </section>

        {teachers.length > 0 && <section className="page-container faculty-browse" aria-labelledby="teachers-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">OUR TEACHERS</motion.p>
            <motion.h2 variants={rise} id="teachers-title">Meet the people <span>who teach you.</span></motion.h2>
          </Reveal>
          <ul className="faculty-grid">
            {teachers.map((teacher, i) => (
              <motion.li key={teacher.user_id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, ease: EASE, delay: Math.min(i, 5) * 0.06 }} whileHover={{ y: -8 }}>
                <TeacherCard teacher={teacher} />
              </motion.li>
            ))}
          </ul>
        </section>}

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
