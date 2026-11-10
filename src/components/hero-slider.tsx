"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, MotionConfig, motion, useMotionValue, useSpring, useTransform, type Variants } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Pause, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { courseHref, programs } from "@/lib/site";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

type Slide = {
  eyebrow: string;
  title: [lead: string, emphasis: string];
  subtitle: string;
  cta: { label: string; href: string };
  image: string;
  alt: string;
  position: string;
  badge: string;
  /** Indexes into `programs` that this slide is about; highlighted in the dock. */
  programs: number[];
};

// Photos: Unsplash License (free for commercial use, attribution not required). Credits kept for reference.
const slides: Slide[] = [
  {
    eyebrow: "FOUNDATION CLASSES · GRADES 6–10",
    title: ["Strong roots today,", "brighter results tomorrow."],
    subtitle: "Concept-first classes in Mathematics, Science and English that turn everyday doubts into lasting understanding.",
    cta: { label: "Explore programs", href: "/courses" },
    image: "/hero/foundation.jpg", // Raj Rana — unsplash.com/photos/nWpTGnP_jWE
    alt: "A schoolgirl in uniform standing confidently in front of her classmates",
    position: "center 30%",
    badge: "CBSE · ICSE · State Boards",
    programs: [0],
  },
  {
    eyebrow: "ENGINEERING & MEDICAL ENTRANCE",
    title: ["Crack the concepts,", "clear the entrance."],
    subtitle: "Structured Physics, Chemistry, Mathematics and Biology preparation with chapter tests and full-length mock papers.",
    cta: { label: "View JEE & NEET", href: "/courses" },
    image: "/hero/entrance.jpg", // Tra Nguyen — unsplash.com/photos/TVSRWmnW8Us
    alt: "A teacher writing physics equations on a green chalkboard",
    position: "center 35%",
    badge: "JEE Main · Advanced · NEET",
    programs: [2, 3],
  },
  {
    eyebrow: "RMS & SAINIK SCHOOL ENTRANCE",
    title: ["Discipline that builds", "future leaders."],
    subtitle: "Focused preparation for Rashtriya Military School and Sainik School entrance exams, with timed practice tests.",
    cta: { label: "See AISSEE 2027 details", href: "/pamphlet" },
    image: "/hero/sainik.jpg", // CIMT HOOGHLY — unsplash.com/photos/I4lLt9g8i3k
    alt: "Students in uniform writing at their desks while a teacher checks their work",
    position: "center 45%",
    badge: "AISSEE 2027 preparation",
    programs: [1],
  },
  {
    eyebrow: "CUET · CLAT · AMU · JMI",
    title: ["Your university,", "your direction."],
    subtitle: "Guided preparation for CUET, CLAT, GATE and the AMU & JMI entrance tests, including previous-year paper practice.",
    cta: { label: "View university programs", href: "/courses" },
    image: "/hero/university.jpg", // Fotos — unsplash.com/photos/Xdh_J4xW1QE
    alt: "Two students with backpacks reading a book together",
    position: "center 35%",
    badge: "Previous-year paper practice",
    programs: [4, 5],
  },
  {
    eyebrow: "SPOKEN ENGLISH & STUDY ABROAD",
    title: ["Speak with confidence,", "go global."],
    subtitle: "Build fluent spoken English and prepare for IELTS and study-abroad applications with practical speaking sessions.",
    cta: { label: "Enquire now", href: "/contact" },
    image: "/hero/spoken-english.jpg", // Muhammad Rizwan — unsplash.com/photos/VnydpKiCDaY
    alt: "A smiling graduate in a cap and gown",
    position: "center 30%",
    badge: "IELTS & study-abroad guidance",
    programs: [6],
  },
];

const INTERVAL_MS = 7000;
const SWIPE_PX = 50;
const EASE = [0.2, 0.7, 0.2, 1] as const;

const copyVariants: Variants = {
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  hide: { opacity: 0, transition: { duration: 0.35 } },
};
const lineVariants: Variants = {
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
  hide: { opacity: 0, y: 16, filter: "blur(6px)", transition: { duration: 0.3 } },
};
const titleVariants: Variants = {
  show: { transition: { staggerChildren: 0.045 } },
  hide: {},
};
const wordVariants: Variants = {
  show: { y: "0%", rotate: 0, transition: { duration: 0.8, ease: EASE } },
  hide: { y: "110%", rotate: 4, transition: { duration: 0.3 } },
};
const photoVariants: Variants = {
  active: { clipPath: "circle(150% at 78% 40%)", zIndex: 2, transition: { duration: 1.25, ease: [0.65, 0, 0.35, 1] } },
  previous: { clipPath: "circle(150% at 78% 40%)", zIndex: 1, transition: { duration: 0 } },
  idle: { clipPath: "circle(0% at 78% 40%)", zIndex: 0, transition: { duration: 0 } },
};
const kenBurnsVariants: Variants = {
  active: { scale: 1, x: "0%", transition: { duration: INTERVAL_MS / 1000 + 2, ease: "easeOut" } },
  previous: { scale: 1 },
  idle: { scale: 1.18, x: "2%", transition: { duration: 0 } },
};

function Words({ text }: { text: string }) {
  const words = text.split(" ");
  return words.map((word, i) => (
    <Fragment key={i}><span className="hero-word"><motion.span variants={wordVariants}>{word}</motion.span></span>{i < words.length - 1 ? " " : null}</Fragment>
  ));
}

export default function HeroSlider() {
  const [{ index, previous }, setSlide] = useState({ index: 0, previous: -1 });
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const touchX = useRef<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const count = slides.length;
  const slide = slides[index];
  const go = useCallback((next: number) => setSlide(s => {
    const target = ((next % count) + count) % count;
    return target === s.index ? s : { index: target, previous: s.index };
  }), [count]);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => { if (media.matches) setUserPaused(true); };
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => { media.removeEventListener("change", syncMotion); document.removeEventListener("visibilitychange", syncVisibility); };
  }, []);

  const paused = userPaused || hovered || focused || hidden;

  // 3D tilt of the photo card, following the pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), { stiffness: 120, damping: 18 });
  const shineX = useTransform(px, [-0.5, 0.5], ["0%", "100%"]);
  const shine = useTransform(shineX, x => `radial-gradient(circle at ${x} 20%, #ffffff38, transparent 55%)`);

  function onTabKey(event: React.KeyboardEvent, i: number) {
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: count - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = ((keys[event.key] % count) + count) % count;
    go(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="hero-stage hero-slider"
        role="region"
        aria-roledescription="carousel"
        aria-label="EduPulse highlights"
        data-paused={paused || undefined}
        style={{ "--hero-interval": `${INTERVAL_MS}ms` } as CSSProperties}
        onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div className="hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
        <HeroScene3D slide={index} />

        <div className="page-container hero-inner">
          <div
            className="hero-copy"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}
          >
            <div className="hero-slides" aria-live={paused ? "polite" : "off"}>
              {slides.map((s, i) => {
                const active = i === index;
                const Title = active ? motion.h1 : motion.p;
                return (
                  <motion.div
                    key={s.image}
                    id={`hero-slide-${i}`}
                    className={`hero-slide-copy${active ? " is-active" : ""}`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} of ${count}`}
                    aria-hidden={!active}
                    inert={!active}
                    variants={copyVariants}
                    initial={i === 0 ? "hide" : false}
                    animate={active ? "show" : "hide"}
                  >
                    <motion.div variants={lineVariants} className="hero-eyebrow"><span aria-hidden="true" /> {s.eyebrow}</motion.div>
                    <Title variants={titleVariants} id={active ? "hero-title" : undefined} className="hero-title">
                      <span className="hero-title-lead"><Words text={s.title[0]} /></span>{" "}
                      <em><Words text={s.title[1]} /></em>
                    </Title>
                    <motion.p variants={lineVariants} className="hero-subtitle">{s.subtitle}</motion.p>
                    <motion.div variants={lineVariants} className="hero-actions">
                      <Button asChild size="lg" className="hero-primary">
                        {s.cta.href.startsWith("#") ? <a href={s.cta.href}>{s.cta.label} <ArrowRight size={17} /></a> : <Link href={s.cta.href}>{s.cta.label} <ArrowRight size={17} /></Link>}
                      </Button>
                      <Link href="/contact" className="hero-secondary">Talk to our team <ArrowRight size={16} /></Link>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            <div className="hero-controls">
              <div className="hero-counter" aria-hidden="true">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.strong key={index} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>{String(index + 1).padStart(2, "0")}</motion.strong>
                </AnimatePresence>
                <span>/ {String(count).padStart(2, "0")}</span>
              </div>
              <div className="hero-tabs" role="tablist" aria-label="Choose a slide">
                {slides.map((s, i) => (
                  <button
                    key={s.image}
                    ref={el => { tabRefs.current[i] = el; }}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-controls={`hero-slide-${i}`}
                    aria-label={`Slide ${i + 1}: ${s.title.join(" ")}`}
                    tabIndex={i === index ? 0 : -1}
                    className="hero-tab"
                    onClick={() => go(i)}
                    onKeyDown={e => onTabKey(e, i)}
                  >
                    <span className="hero-tab-track">
                      {i === index && <span key={index} className="hero-tab-fill" onAnimationEnd={() => go(index + 1)} />}
                      {i < index && <span className="hero-tab-fill is-done" />}
                    </span>
                  </button>
                ))}
              </div>
              <div className="hero-buttons">
                <button type="button" className="hero-icon-button" onClick={() => go(index - 1)} aria-label="Previous slide"><ChevronLeft size={18} /></button>
                <button type="button" className="hero-icon-button" onClick={() => setUserPaused(p => !p)} aria-label={userPaused ? "Play slideshow" : "Pause slideshow"} aria-pressed={userPaused}>{userPaused ? <Play size={15} /> : <Pause size={15} />}</button>
                <button type="button" className="hero-icon-button" onClick={() => go(index + 1)} aria-label="Next slide"><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            onPointerMove={e => {
              const r = e.currentTarget.getBoundingClientRect();
              px.set((e.clientX - r.left) / r.width - 0.5);
              py.set((e.clientY - r.top) / r.height - 0.5);
            }}
            onPointerLeave={() => { px.set(0); py.set(0); }}
          >
            <span className="hero-orbit" aria-hidden="true"><span /></span>
            <motion.div className="hero-card" style={{ rotateX, rotateY }}>
              <div className="hero-frame">
                {slides.map((s, i) => {
                  const state = i === index ? "active" : i === previous ? "previous" : "idle";
                  return (
                    <motion.div key={s.image} className="hero-photo" variants={photoVariants} initial={i === 0 ? "active" : "idle"} animate={state} aria-hidden={i !== index}>
                      <motion.div className="hero-photo-inner" variants={kenBurnsVariants}>
                        <Image src={s.image} alt={i === index ? s.alt : ""} fill sizes="(max-width: 1000px) 100vw, 50vw" priority={i === 0} style={{ objectPosition: s.position }} />
                      </motion.div>
                    </motion.div>
                  );
                })}
                <motion.span className="hero-shine" style={{ background: shine }} aria-hidden="true" />
              </div>

              <div className="hero-badge hero-badge-top" aria-hidden="true">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={index} className="hero-badge-inner" initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.35 }}>
                    <span className="hero-badge-icon"><Sparkles size={15} /></span>{slide.badge}
                  </motion.span>
                </AnimatePresence>
              </div>
              <div className="hero-badge hero-badge-bottom" aria-hidden="true">
                <span className="hero-badge-inner"><span className="hero-badge-icon"><MapPin size={15} /></span><span><strong>Proudly based in Aligarh</strong><small>Lal Diggi, Civil Lines</small></span></span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div className="page-container">
          <motion.aside className="hero-dock" aria-labelledby="hero-programs-title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}>
            <div className="hero-dock-head">
              <p className="hero-programs-kicker">FIND YOUR DIRECTION</p>
              <h2 id="hero-programs-title">Our programs</h2>
            </div>
            <ul className="hero-dock-list">
              {programs.map((program, i) => {
                const current = slide.programs.includes(i);
                return (
                  <li key={program.title}>
                    <Link href={courseHref(program.slug)} className={`hero-dock-item${current ? " is-current" : ""}`}>
                      <program.icon size={17} strokeWidth={1.7} />
                      <span>{program.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/courses" className="hero-dock-link" aria-label="Explore all programs">All programs <ArrowRight size={15} /></Link>
          </motion.aside>
        </div>
      </div>
    </MotionConfig>
  );
}
