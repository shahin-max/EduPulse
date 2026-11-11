"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, ChevronRight, Compass, MessageCircle, MessagesSquare, Rocket, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Counter, EASE, Reveal, Words, rise, stagger } from "@/components/motion-kit";
import type { ApiCourse } from "@/lib/api";
import { courseCategories, courseDetails, type CourseCategory } from "@/lib/courses";
import { courseHref, programs, whatsappLink } from "@/lib/site";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

const courses = programs.map(program => ({ program, detail: courseDetails[program.slug] }));
const categoryLabel = Object.fromEntries(courseCategories.map(c => [c.id, c.label])) as Record<CourseCategory, string>;
const collage = ["foundation-classes", "jee-main-advanced", "amu-jmi-entrance", "spoken-english-abroad"].map(slug => courseDetails[slug]);

const steps = [
  { title: "Tell us your goal", text: "Board exams, an entrance test, a university seat or confident English: start with where you want to go.", icon: Compass },
  { title: "Talk to our team", text: "Our counsellors help you choose the right program and the right starting point.", icon: MessagesSquare },
  { title: "Start learning", text: "Join a batch and follow a clear plan with regular practice, tests and feedback.", icon: Rocket },
];

/** `moreCourses`: LMS catalogue courses that no program page covers (e.g. NDA / CDS, IMU-CET). */
export default function CoursesIndex({ moreCourses = [] }: { moreCourses?: ApiCourse[] }) {
  const [category, setCategory] = useState<CourseCategory | "all">("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return courses.filter(({ program, detail }) =>
      (category === "all" || detail.category === category) &&
      (!q || [program.title, program.detail, program.summary, ...detail.highlights, ...detail.subjects.map(s => s.name)].join(" ").toLowerCase().includes(q)));
  }, [category, deferredQuery]);

  const counts = useMemo(() => Object.fromEntries(courseCategories.map(c => [c.id, c.id === "all" ? courses.length : courses.filter(x => x.detail.category === c.id).length])), []);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const collageY = useTransform(heroProgress, [0, 1], ["0%", "-12%"]);
  const collageY2 = useTransform(heroProgress, [0, 1], ["0%", "10%"]);

  const pathRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: pathProgress } = useScroll({ target: pathRef, offset: ["start 80%", "end 60%"] });
  const pathLine = useSpring(pathProgress, { stiffness: 120, damping: 30 });

  return (
    <MotionConfig reducedMotion="user">
      <div className="course-page courses-index">
        <motion.div className="course-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <section ref={heroRef} className="course-hero courses-hero" aria-labelledby="courses-title">
          <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
          <HeroScene3D slide={0} />
          <div className="page-container courses-hero-inner">
            <motion.div className="courses-hero-copy" variants={stagger} initial="hidden" animate="show">
              <motion.nav variants={rise} className="course-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Courses</span>
              </motion.nav>
              <motion.p variants={rise} className="course-kicker"><span className="course-kicker-icon"><Compass size={17} /></span>OUR PROGRAMS</motion.p>
              <motion.h1 id="courses-title" className="hero-title course-title courses-title" variants={stagger}>
                <span><Words text="Find the program" /></span>{" "}
                <em><Words text="that fits your goal." /></em>
              </motion.h1>
              <motion.p variants={rise} className="course-intro">From Grade 6 foundations to engineering, medical and university entrance, and confident spoken English, every EduPulse program is built around one thing: your next big milestone.</motion.p>
              <motion.dl variants={rise} className="courses-stats">
                <div><dt>Programs</dt><dd><Counter to={courses.length} /></dd></div>
                <div><dt>Pathways</dt><dd><Counter to={courseCategories.length - 1} /></dd></div>
                <div><dt>Starting from</dt><dd>Grade <Counter to={6} /></dd></div>
              </motion.dl>
              <motion.div variants={rise} className="hero-actions">
                <Button asChild size="lg" className="hero-primary"><a href="#all-programs">Browse programs <ArrowRight size={17} /></a></Button>
                <a href="#choose" className="hero-secondary">Not sure where to start? <ArrowRight size={16} /></a>
              </motion.div>
            </motion.div>

            <div className="courses-collage" aria-hidden="true">
              <span className="hero-orbit"><span /></span>
              {collage.map((c, i) => (
                <motion.div
                  key={c.slug}
                  className={`courses-collage-item item-${i}`}
                  style={{ y: i % 2 ? collageY2 : collageY }}
                  initial={{ opacity: 0, scale: 0.85, rotate: i % 2 ? 6 : -6 }}
                  animate={{ opacity: 1, scale: 1, rotate: i % 2 ? 2 : -2 }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.12 }}
                >
                  <Image src={c.image} alt="" fill sizes="(max-width: 1000px) 45vw, 22vw" style={{ objectPosition: c.imagePosition }} priority={i < 2} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="all-programs" className="page-container courses-browse" aria-labelledby="browse-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">BROWSE BY PATHWAY</motion.p>
            <motion.h2 variants={rise} id="browse-title">Seven programs, <span>one clear direction.</span></motion.h2>
          </Reveal>

          <div className="courses-toolbar">
            <div className="courses-tabs" role="group" aria-label="Filter programs by pathway">
              {courseCategories.map(c => (
                <button key={c.id} type="button" className={`courses-tab${category === c.id ? " is-active" : ""}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  {c.label}<span>{counts[c.id]}</span>
                </button>
              ))}
            </div>
            <label className="courses-search">
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search programs</span>
              <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search e.g. Biology, IELTS, Class IX" />
              {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}
            </label>
          </div>
          <p className="courses-result" aria-live="polite">Showing {visible.length} of {courses.length} programs</p>

          <motion.ul layout className="courses-grid">
            <AnimatePresence mode="popLayout">
              {visible.map(({ program, detail }, i) => (
                <motion.li
                  key={program.slug}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE, delay: Math.min(i, 6) * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
                  whileHover={{ y: -8 }}
                  className="courses-card-wrap"
                >
                  <Link href={courseHref(program.slug)} className="courses-card">
                    <span className="courses-card-media">
                      <span className="courses-card-photo"><Image src={detail.image} alt="" fill sizes="(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 380px" style={{ objectPosition: detail.imagePosition }} /></span>
                      <span className="courses-card-tag">{categoryLabel[detail.category]}</span>
                      <span className="courses-card-icon"><program.icon size={22} strokeWidth={1.7} /></span>
                    </span>
                    <span className="courses-card-body">
                      <small>{program.detail}</small>
                      <strong>{program.title}</strong>
                      <span className="courses-card-summary">{program.summary}</span>
                      <span className="courses-card-chips">{detail.highlights.slice(0, 2).map(h => <span key={h}>{h}</span>)}</span>
                      <span className="courses-card-cta">Explore course <ArrowRight size={16} /></span>
                    </span>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          <AnimatePresence>
            {visible.length === 0 && (
              <motion.div className="courses-empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <p>No programs match &ldquo;{query}&rdquo;.</p>
                <Button variant="outline" onClick={() => { setQuery(""); setCategory("all"); }}>Show all programs</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {moreCourses.length > 0 && <section id="more-programs" className="page-container course-section" aria-labelledby="more-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">ALSO OFFERED</motion.p>
            <motion.h2 variants={rise} id="more-title">More programs <span>at EduPulse.</span></motion.h2>
            <motion.p variants={rise} className="course-section-intro">Ask our team for the syllabus, batch timings and fees of these programs.</motion.p>
          </Reveal>
          <Reveal as="ul" className="courses-more-list">
            {moreCourses.map(course => <motion.li key={course.id} variants={rise}>
              <Link href={`/admissions?course=${course.slug}`}><span>{course.title}<small>{course.description ?? "Apply or ask about batches"}</small></span><ChevronRight size={18} aria-hidden="true" /></Link>
            </motion.li>)}
          </Reveal>
        </section>}

        <section id="choose" className="course-band" aria-labelledby="choose-title">
          <div className="page-container">
            <Reveal className="course-section-head">
              <motion.p variants={rise} className="section-kicker">NOT SURE WHERE TO START?</motion.p>
              <motion.h2 variants={rise} id="choose-title">Three steps to <span>the right program.</span></motion.h2>
            </Reveal>
            <div ref={pathRef} className="courses-steps">
              <span className="courses-steps-track" aria-hidden="true"><motion.span style={{ scaleX: pathLine }} /></span>
              <Reveal as="ul" className="courses-steps-list">
                {steps.map(({ title, text, icon: StepIcon }, i) => (
                  <motion.li key={title} variants={rise}>
                    <span className="courses-step-icon"><StepIcon size={22} /><span>{i + 1}</span></span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </motion.li>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        <section className="page-container course-section courses-glance" aria-labelledby="glance-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">AT A GLANCE</motion.p>
            <motion.h2 variants={rise} id="glance-title">Compare programs <span>side by side.</span></motion.h2>
          </Reveal>
          <Reveal className="courses-table" as="div">
            <motion.div variants={rise} className="courses-table-row courses-table-head" aria-hidden="true">
              <span>Program</span><span>Best for</span><span>Focus</span><span />
            </motion.div>
            {courses.map(({ program, detail }) => (
              <motion.div variants={rise} key={program.slug}>
                <Link href={courseHref(program.slug)} className="courses-table-row">
                  <span className="courses-table-program"><span className="program-icon"><program.icon size={19} /></span><strong>{program.title}</strong></span>
                  <span><em className="courses-table-label">Best for: </em>{detail.audience[0]}</span>
                  <span><em className="courses-table-label">Focus: </em>{detail.highlights.join(" · ")}</span>
                  <span className="courses-table-go" aria-hidden="true"><ArrowRight size={17} /></span>
                </Link>
              </motion.div>
            ))}
          </Reveal>
        </section>

        <section className="page-container course-cta-wrap" aria-labelledby="courses-cta-title">
          <motion.div className="course-cta" initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.8, ease: EASE }}>
            <span className="course-cta-glow" aria-hidden="true" />
            <div>
              <p className="course-cta-kicker">ADMISSIONS OPEN</p>
              <h2 id="courses-cta-title">Still deciding? Let&apos;s talk.</h2>
              <p>Tell us your goal and our team will help you choose the right program and batch.</p>
            </div>
            <div className="course-cta-actions">
              <Button asChild size="lg" className="course-cta-primary"><a href={whatsappLink("Hello EduPulse Academy, I need help choosing the right program.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Ask on WhatsApp</a></Button>
              <Button asChild size="lg" variant="outline" className="course-cta-secondary"><Link href="/admissions">Apply for admission <ArrowRight size={16} /></Link></Button>
            </div>
          </motion.div>
        </section>
      </div>
    </MotionConfig>
  );
}
