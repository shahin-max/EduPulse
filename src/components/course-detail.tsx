"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, CalendarDays, Check, ChevronDown, MapPin, MessageCircle, Phone, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EASE, Reveal, TiltCard, Words, rise, stagger } from "@/components/motion-kit";
import { formatDate } from "@/components/admissions-page";
import type { ApiBatch } from "@/lib/api";
import { courseDetails } from "@/lib/courses";
import { contact, courseHref, programs, whatsappLink } from "@/lib/site";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

function Faq({ q, a, open, onToggle, id }: { q: string; a: string; open: boolean; onToggle: () => void; id: string }) {
  return (
    <motion.li variants={rise} className={`course-faq${open ? " is-open" : ""}`}>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span>{q}</span>
          <motion.span className="course-faq-icon" animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}><ChevronDown size={18} /></motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="course-faq-answer">
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/** `batches` are the open batches (from the LMS) of the catalogue courses this program covers. */
export default function CourseDetail({ slug, batches = [] }: { slug: string; batches?: ApiBatch[] }) {
  const course = courseDetails[slug];
  const program = programs.find(p => p.slug === slug)!;
  const others = programs.filter(p => p.slug !== slug);
  const Icon = program.icon;
  const [openFaq, setOpenFaq] = useState(0);
  const enquire = whatsappLink(`Hello EduPulse Academy, I would like to know more about: ${program.title}`);

  // Page reading progress
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  // Hero parallax
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(heroProgress, [0, 1], ["0%", "14%"]);
  const imageScale = useTransform(heroProgress, [0, 1], [1, 1.08]);
  const copyY = useTransform(heroProgress, [0, 1], ["0%", "30%"]);
  const copyOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);

  // Roadmap line draws as the section scrolls
  const roadRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: roadProgress } = useScroll({ target: roadRef, offset: ["start 75%", "end 55%"] });
  const roadLine = useSpring(roadProgress, { stiffness: 120, damping: 30 });

  return (
    <MotionConfig reducedMotion="user">
      <div className="course-page">
        <motion.div className="course-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <section ref={heroRef} className="course-hero" aria-labelledby="course-title">
          <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
          <HeroScene3D slide={0} />
          <div className="page-container course-hero-inner">
            <motion.div className="course-hero-copy" style={{ y: copyY, opacity: copyOpacity }} variants={stagger} initial="hidden" animate="show">
              <motion.nav variants={rise} className="course-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/courses">Courses</Link><span aria-hidden="true">/</span><span aria-current="page">{program.title}</span>
              </motion.nav>
              <motion.div variants={rise} className="course-kicker">
                <span className="course-kicker-icon"><Icon size={18} /></span>{program.detail.toUpperCase()}
              </motion.div>
              <motion.h1 id="course-title" className="hero-title course-title" variants={stagger}>
                <span className="course-title-name"><Words text={program.title} /></span>{" "}
                <em><Words text={`${course.tagline[0]} ${course.tagline[1]}`} /></em>
              </motion.h1>
              <motion.p variants={rise} className="course-intro">{course.intro}</motion.p>
              <motion.ul variants={rise} className="course-chips">
                {course.highlights.map(h => <li key={h}><Check size={14} />{h}</li>)}
              </motion.ul>
              <motion.div variants={rise} className="hero-actions">
                <Button asChild size="lg" className="hero-primary"><a href={enquire} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Enquire on WhatsApp</a></Button>
                <a href={`tel:${contact.phones[0].tel}`} className="hero-secondary"><Phone size={16} /> {contact.phones[0].display}</a>
              </motion.div>
            </motion.div>

            <motion.div className="course-hero-visual" initial={{ opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.2 }}>
              <span className="hero-orbit" aria-hidden="true"><span /></span>
              <div className="course-hero-frame">
                <motion.div className="course-hero-photo" style={{ y: imageY, scale: imageScale }}>
                  <Image src={course.image} alt={course.imageAlt} fill priority sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectPosition: course.imagePosition }} />
                </motion.div>
              </div>
              <motion.div className="hero-badge course-badge-top" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.7 }}>
                <span className="hero-badge-inner"><span className="hero-badge-icon"><Sparkles size={15} /></span>{course.highlights[0]}</span>
              </motion.div>
              <motion.div className="hero-badge course-badge-bottom" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.9 }}>
                <span className="hero-badge-inner"><span className="hero-badge-icon"><MapPin size={15} /></span><span><strong>Aligarh campus</strong><small>Lal Diggi, Civil Lines</small></span></span>
              </motion.div>
            </motion.div>
          </div>
          <motion.a href="#learn" className="course-scroll-cue" aria-label="Scroll to course details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
            <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><ChevronDown size={18} /></motion.span>
          </motion.a>
        </section>

        <section id="learn" className="course-section page-container" aria-labelledby="learn-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">WHAT YOU&apos;LL LEARN</motion.p>
            <motion.h2 variants={rise} id="learn-title">Everything the exam asks, <span>taught with clarity.</span></motion.h2>
          </Reveal>
          <Reveal className={`course-subjects count-${course.subjects.length}`}>
            {course.subjects.map(({ name, text, icon: SubjectIcon }, i) => (
              <TiltCard key={name} className="course-subject">
                <span className="course-subject-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="course-subject-icon"><SubjectIcon size={24} strokeWidth={1.6} /></span>
                <h3>{name}</h3>
                <p>{text}</p>
              </TiltCard>
            ))}
          </Reveal>
        </section>

        <section className="course-band" aria-labelledby="road-title">
          <div className="page-container course-road-layout">
            <Reveal className="course-section-head course-road-head">
              <motion.p variants={rise} className="section-kicker">HOW WE PREPARE YOU</motion.p>
              <motion.h2 variants={rise} id="road-title">A clear path, <span>one step at a time.</span></motion.h2>
              <motion.p variants={rise} className="course-section-intro">Every student follows the same proven rhythm: understand, practise, test and improve, with a mentor watching their progress at every stage.</motion.p>
            </Reveal>
            <div ref={roadRef} className="course-road">
              <span className="course-road-track" aria-hidden="true"><motion.span style={{ scaleY: roadLine }} /></span>
              <ol>
                {course.roadmap.map((step, i) => (
                  <motion.li key={step.title} initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, ease: EASE }}>
                    <motion.span className="course-road-dot" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}>{i + 1}</motion.span>
                    <div><h3>{step.title}</h3><p>{step.text}</p></div>
                  </motion.li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="course-section page-container course-split" aria-labelledby="audience-title">
          <Reveal className="course-audience">
            <motion.p variants={rise} className="section-kicker">WHO IT&apos;S FOR</motion.p>
            <motion.h2 variants={rise} id="audience-title">Made for students <span>like you.</span></motion.h2>
            <motion.ul variants={stagger} className="course-checklist">
              {course.audience.map(a => (
                <motion.li key={a} variants={rise}><span className="course-check"><Check size={14} strokeWidth={3} /></span>{a}</motion.li>
              ))}
            </motion.ul>
          </Reveal>
          <Reveal className="course-features">
            {course.features.map(({ title, text, icon: FeatureIcon }) => (
              <TiltCard key={title} className="course-feature">
                <span className="course-feature-icon"><FeatureIcon size={20} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </TiltCard>
            ))}
          </Reveal>
        </section>

        <section className="course-section page-container course-faq-section" aria-labelledby="faq-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">QUESTIONS, ANSWERED</motion.p>
            <motion.h2 variants={rise} id="faq-title">Frequently asked <span>questions.</span></motion.h2>
          </Reveal>
          <Reveal as="ul" className="course-faqs">
            {course.faqs.map((f, i) => <Faq key={f.q} {...f} id={`faq-${i}`} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />)}
          </Reveal>
        </section>

        {batches.length > 0 && <section className="course-section page-container course-batches" aria-labelledby="batches-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">TAKING ADMISSIONS</motion.p>
            <motion.h2 variants={rise} id="batches-title">Upcoming <span>batches.</span></motion.h2>
          </Reveal>
          <Reveal as="ul" className="course-batch-list">
            {batches.map(batch => <motion.li key={batch.id} variants={rise}>
              <strong>{batch.courses.title}</strong>
              <h3>{batch.name}</h3>
              <p>
                {formatDate(batch.start_date) && <span><CalendarDays size={15} aria-hidden="true" /> Starts {formatDate(batch.start_date)}</span>}
                {batch.branches && <span><MapPin size={15} aria-hidden="true" /> {batch.branches.name}</span>}
                {batch.seatsAvailable !== null && <span><Users size={15} aria-hidden="true" /> {batch.seatsAvailable > 0 ? `${batch.seatsAvailable} seats left` : "Waiting list"}</span>}
              </p>
              <Link className="text-link" href={`/admissions?course=${batch.courses.slug}`}>Apply for this batch <ArrowRight size={15} /></Link>
            </motion.li>)}
          </Reveal>
        </section>}

        <section className="page-container course-cta-wrap" aria-labelledby="cta-title">
          <motion.div className="course-cta" initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.8, ease: EASE }}>
            <span className="course-cta-glow" aria-hidden="true" />
            <div>
              <p className="course-cta-kicker">ADMISSIONS OPEN</p>
              <h2 id="cta-title">Ready to start {program.title}?</h2>
              <p>Talk to our team about batches, timings and the right starting point for you.</p>
            </div>
            <div className="course-cta-actions">
              <Button asChild size="lg" className="course-cta-primary"><Link href={`/admissions?program=${slug}`}>Apply for admission <ArrowRight size={16} /></Link></Button>
              <Button asChild size="lg" variant="outline" className="course-cta-secondary"><a href={enquire} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> Enquire on WhatsApp</a></Button>
            </div>
          </motion.div>
        </section>

        <section className="course-section page-container course-others" aria-labelledby="others-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">KEEP EXPLORING</motion.p>
            <motion.h2 variants={rise} id="others-title">Other programs <span>at EduPulse.</span></motion.h2>
          </Reveal>
          <Reveal className="course-other-grid">
            {others.map(p => (
              <motion.div key={p.slug} variants={rise}>
                <Link href={courseHref(p.slug)} className="course-other">
                  <span className="program-icon"><p.icon size={21} /></span>
                  <span><strong>{p.title}</strong><small>{p.detail}</small></span>
                  <ArrowRight className="course-other-arrow" size={17} />
                </Link>
              </motion.div>
            ))}
          </Reveal>
        </section>
      </div>
    </MotionConfig>
  );
}
