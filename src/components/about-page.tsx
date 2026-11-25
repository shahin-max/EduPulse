"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { MotionConfig, motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, MapPin, Quote, Sparkles, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Counter, EASE, Reveal, TiltCard, Words, rise, stagger } from "@/components/motion-kit";
import { useContactInfo } from "@/lib/site-content";
import { departmentId, faculty } from "@/lib/team";
import { siteIcon } from "@/lib/site-icons";
import { DEFAULT_ABOUT, splitStat, type AboutLeader, type AboutPageContent } from "@/lib/site-pages";
import { MAP_EMBED_URL, MAPS_URL } from "@/lib/site";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

/** Text with line breaks ("A stronger foundation.\nA brighter future.") as React lines. */
function Lines({ text }: { text: string }) {
  const lines = text.split("\n");
  return lines.map((line, i) => <span key={i}>{line}{i < lines.length - 1 && <br />}</span>);
}

function Stat({ value }: { value: string }) {
  const { prefix, number, suffix } = splitStat(value);
  return number === null ? <>{value}</> : <><>{prefix}</><Counter to={number} /><>{suffix}</></>;
}

function LeaderProfile({ leader, index }: { leader: AboutLeader; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <motion.article className={`about-leader${reverse ? " is-reverse" : ""}`} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
      <motion.div className="about-leader-portrait" variants={{ hidden: { opacity: 0, x: reverse ? 60 : -60, rotate: reverse ? 4 : -4 }, show: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } } }}>
        <span className="about-leader-ring" aria-hidden="true" />
        <TiltCard className="about-leader-photo" max={7}>
          {leader.image && <Image src={leader.image} alt={leader.imageAlt} fill sizes="260px" />}
        </TiltCard>
        {leader.label && <span className="about-leader-label">{leader.label}</span>}
      </motion.div>
      <motion.div className="about-leader-body" variants={stagger}>
        {leader.role && <motion.p variants={rise} className="about-leader-role">{leader.role.toUpperCase()}</motion.p>}
        <motion.h3 variants={rise}>{leader.name}</motion.h3>
        <motion.blockquote variants={rise}>
          <Quote className="about-quote-icon" size={30} aria-hidden="true" />
          {leader.message.map((p, i) => <p key={i}>{p}</p>)}
          <footer><span>Best wishes,</span><cite>{leader.name}</cite></footer>
        </motion.blockquote>
      </motion.div>
    </motion.article>
  );
}

/** The About page; every text and photo comes from Admin → Website → About page (page.about). */
export default function AboutPage({ content = DEFAULT_ABOUT }: { content?: AboutPageContent }) {
  const { hero, leadership, faculty: facultyText, values, recognition, learning, visit } = content;
  const shown = (id: AboutPageContent["hidden"][number]) => !content.hidden.includes(id);
  const contact = useContactInfo();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(heroProgress, [0, 1], ["0%", "12%"]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="course-page about-page">
        <motion.div className="course-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <section ref={heroRef} className="course-hero about-hero" aria-labelledby="about-title">
          <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
          <HeroScene3D slide={0} />
          <div className="page-container course-hero-inner">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.nav variants={rise} className="course-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">About Us</span>
              </motion.nav>
              {hero.kicker && <motion.p variants={rise} className="course-kicker"><span className="course-kicker-icon"><Sparkles size={16} /></span>{hero.kicker}</motion.p>}
              <motion.h1 id="about-title" className="hero-title course-title about-title" variants={stagger}>
                <span><Words text={hero.titleLead} /></span>{" "}
                {hero.titleEmphasis && <em><Words text={hero.titleEmphasis} /></em>}
              </motion.h1>
              {hero.intro && <motion.p variants={rise} className="course-intro">{hero.intro}</motion.p>}
              {hero.intro2 && <motion.p variants={rise} className="course-intro about-intro-2">{hero.intro2}</motion.p>}
              <motion.div variants={rise} className="hero-actions">
                {hero.primaryLabel && shown("leadership") && <Button asChild size="lg" className="hero-primary"><a href="#leadership">{hero.primaryLabel} <ArrowRight size={17} /></a></Button>}
                {hero.secondaryLabel && <Link href="/faculty" className="hero-secondary">{hero.secondaryLabel} <ArrowRight size={16} /></Link>}
              </motion.div>
            </motion.div>

            <motion.div className="course-hero-visual" initial={{ opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.2 }}>
              <span className="hero-orbit" aria-hidden="true"><span /></span>
              <figure className="course-hero-frame about-hero-frame">
                <motion.div className="course-hero-photo" style={{ y: imageY }}>
                  <Image src={hero.image} alt={hero.imageAlt} fill priority sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectPosition: "65% center" }} />
                </motion.div>
                {(hero.captionSmall || hero.captionTitle) && <figcaption>{hero.captionSmall && <span>{hero.captionSmall}</span>}{hero.captionTitle && <strong><Lines text={hero.captionTitle} /></strong>}</figcaption>}
              </figure>
              {hero.badge && <motion.div className="hero-badge course-badge-top" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.8 }}>
                <span className="hero-badge-inner"><span className="hero-badge-icon"><Trophy size={15} /></span>{hero.badge}</span>
              </motion.div>}
            </motion.div>
          </div>
        </section>

        {shown("stats") && content.stats.length > 0 && <section className="page-container about-stats-wrap" aria-label="EduPulse at a glance">
          <Reveal as="div" className="about-stats">
            {content.stats.map((stat, i) => <motion.div key={i} variants={rise}><strong><Stat value={stat.value} /></strong><span>{stat.label}</span></motion.div>)}
          </Reveal>
        </section>}

        {shown("leadership") && leadership.leaders.length > 0 && <section id="leadership" className="page-container course-section about-leadership" aria-labelledby="leadership-title">
          <Reveal className="course-section-head">
            {leadership.kicker && <motion.p variants={rise} className="section-kicker">{leadership.kicker}</motion.p>}
            <motion.h2 variants={rise} id="leadership-title">{leadership.title}{leadership.titleAccent && <> <span>{leadership.titleAccent}</span></>}</motion.h2>
          </Reveal>
          <div className="about-leaders">
            {leadership.leaders.map((leader, i) => <LeaderProfile key={`${leader.name}-${i}`} leader={leader} index={i} />)}
          </div>
        </section>}

        {shown("faculty") && <section className="course-band about-faculty-teaser" aria-labelledby="faculty-teaser-title">
          <div className="page-container about-faculty-layout">
            <Reveal className="about-faculty-copy">
              {facultyText.kicker && <motion.p variants={rise} className="section-kicker">{facultyText.kicker}</motion.p>}
              <motion.h2 variants={rise} id="faculty-teaser-title">{facultyText.title}{facultyText.titleAccent && <> <span>{facultyText.titleAccent}</span></>}</motion.h2>
              {facultyText.intro && <motion.p variants={rise} className="course-section-intro">{facultyText.intro}</motion.p>}
              <motion.div variants={rise}><Button asChild size="lg" className="hero-primary"><Link href="/faculty">{facultyText.buttonLabel} <ArrowRight size={17} /></Link></Button></motion.div>
            </Reveal>
            <Reveal as="ul" className="about-departments">
              {faculty.map(({ department, icon: Icon, subjects }) => (
                <motion.li key={department} variants={rise} whileHover={{ y: -6 }}>
                  <Link href={`/faculty#${departmentId(department)}`}>
                    <span className="course-feature-icon"><Icon size={20} /></span>
                    <strong>{department}</strong>
                    <small>{subjects.slice(0, 3).join(" · ")}</small>
                  </Link>
                </motion.li>
              ))}
            </Reveal>
          </div>
        </section>}

        {shown("values") && values.items.length > 0 && <section className="page-container course-section" aria-labelledby="values-title">
          <Reveal className="course-section-head">
            {values.kicker && <motion.p variants={rise} className="section-kicker">{values.kicker}</motion.p>}
            <motion.h2 variants={rise} id="values-title">{values.title}{values.titleAccent && <> <span>{values.titleAccent}</span></>}</motion.h2>
          </Reveal>
          <Reveal className={`course-subjects${values.items.length >= 4 ? " count-4" : ""}`}>
            {values.items.map(({ title, description, icon }, i) => {
              const Icon = siteIcon(icon, Star);
              return <TiltCard key={`${title}-${i}`} className="course-subject about-value">
                <span className="course-subject-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="course-subject-icon"><Icon size={24} strokeWidth={1.6} /></span>
                <h3>{title}</h3>
                {description && <p>{description}</p>}
              </TiltCard>;
            })}
          </Reveal>
        </section>}

        {shown("recognition") && <section className="page-container about-recognition" aria-labelledby="recognition-title">
          <motion.div className="about-recognition-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, ease: EASE }}>
            {recognition.image && <div className="about-recognition-photo">
              <Image src={recognition.image} alt={recognition.imageAlt} fill sizes="(max-width: 1000px) 100vw, 40vw" style={{ objectPosition: "center 30%" }} />
            </div>}
            <div className="about-recognition-body">
              <span className="about-recognition-icon"><Trophy size={26} /></span>
              {recognition.kicker && <p className="course-cta-kicker">{recognition.kicker}</p>}
              <h2 id="recognition-title">{recognition.title}</h2>
              {recognition.text && <p>{recognition.text}</p>}
              {recognition.buttonLabel && <Button asChild size="lg" className="course-cta-primary"><Link href="/gallery">{recognition.buttonLabel} <ArrowRight size={16} /></Link></Button>}
            </div>
          </motion.div>
        </section>}

        {shown("learning") && <section className="page-container course-section about-learning-section" aria-labelledby="learning-title">
          {learning.image && <motion.div className="about-learning-photo" initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, ease: EASE }}>
            <Image src={learning.image} alt={learning.imageAlt} fill sizes="(max-width: 1000px) 100vw, 45vw" />
          </motion.div>}
          <Reveal>
            {learning.kicker && <motion.p variants={rise} className="section-kicker">{learning.kicker}</motion.p>}
            <motion.h2 variants={rise} id="learning-title" className="about-learning-title">{learning.title}{learning.titleAccent && <> <span>{learning.titleAccent}</span></>}</motion.h2>
            {learning.intro && <motion.p variants={rise} className="course-section-intro">{learning.intro}</motion.p>}
            {learning.buttonLabel && <motion.div variants={rise} className="hero-actions"><Button asChild size="lg" className="hero-primary"><Link href="/courses">{learning.buttonLabel} <ArrowRight size={17} /></Link></Button></motion.div>}
          </Reveal>
        </section>}

        {shown("visit") && <section className="page-container about-visit" aria-labelledby="visit-title">
          <Reveal className="course-section-head">
            {visit.kicker && <motion.p variants={rise} className="section-kicker">{visit.kicker}</motion.p>}
            <motion.h2 variants={rise} id="visit-title">{visit.title}{visit.titleAccent && <> <span>{visit.titleAccent}</span></>}</motion.h2>
            <motion.p variants={rise} className="about-visit-address"><MapPin size={16} aria-hidden="true" />{contact.address}</motion.p>
          </Reveal>
          <motion.div className="about-map" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, ease: EASE }}>
            <iframe title="Map showing the EduPulse Academy address in Aligarh" src={MAP_EMBED_URL} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </motion.div>
          <div className="about-visit-actions">
            {visit.closing && <p>{visit.closing}</p>}
            <div>
              <Button asChild variant="outline"><a href={MAPS_URL} target="_blank" rel="noopener noreferrer">Open in Google Maps <ArrowRight size={16} /></a></Button>
              <Button asChild><Link href="/contact">Contact us <ArrowRight size={16} /></Link></Button>
            </div>
          </div>
        </section>}
      </div>
    </MotionConfig>
  );
}
