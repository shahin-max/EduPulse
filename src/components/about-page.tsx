"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { MotionConfig, motion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowRight, Award, Heart, MapPin, Quote, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Counter, EASE, Reveal, TiltCard, Words, rise, stagger } from "@/components/motion-kit";
import { contact, mapsQuery, programs } from "@/lib/site";
import { departmentId, faculty, leaders, type Leader } from "@/lib/team";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

const values = [
  { title: "Our Mission", description: "Transforming lives through education", icon: Target },
  { title: "Our Values", description: "Excellence and student support", icon: Users },
  { title: "Our Vision", description: "Building tomorrow's leaders today", icon: Award },
  { title: "Our Commitment", description: "Dedicated to student success", icon: Heart },
];

function LeaderProfile({ leader, index }: { leader: Leader; index: number }) {
  const reverse = index % 2 === 1;
  return (
    <motion.article className={`about-leader${reverse ? " is-reverse" : ""}`} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
      <motion.div className="about-leader-portrait" variants={{ hidden: { opacity: 0, x: reverse ? 60 : -60, rotate: reverse ? 4 : -4 }, show: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.9, ease: EASE } } }}>
        <span className="about-leader-ring" aria-hidden="true" />
        <TiltCard className="about-leader-photo" max={7}>
          <Image src={leader.image} alt={leader.imageAlt} fill sizes="260px" />
        </TiltCard>
        <span className="about-leader-label">{leader.label}</span>
      </motion.div>
      <motion.div className="about-leader-body" variants={stagger}>
        <motion.p variants={rise} className="about-leader-role">{leader.role.toUpperCase()}</motion.p>
        <motion.h3 variants={rise}>{leader.name}</motion.h3>
        <motion.blockquote variants={rise}>
          <Quote className="about-quote-icon" size={30} aria-hidden="true" />
          {leader.message.map(p => <p key={p.slice(0, 24)}>{p}</p>)}
          <footer><span>Best wishes,</span><cite>{leader.name}</cite></footer>
        </motion.blockquote>
      </motion.div>
    </motion.article>
  );
}

export default function AboutPage() {
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
              <motion.p variants={rise} className="course-kicker"><span className="course-kicker-icon"><Sparkles size={16} /></span>THE PEOPLE. THE PURPOSE. THE POSSIBILITIES.</motion.p>
              <motion.h1 id="about-title" className="hero-title course-title about-title" variants={stagger}>
                <span><Words text="About EduPulse" /></span>{" "}
                <em><Words text="Academy." /></em>
              </motion.h1>
              <motion.p variants={rise} className="course-intro">EduPulse Academy is built on a strong belief: every student deserves the right guidance, the right support, and the right opportunities to shape their future.</motion.p>
              <motion.p variants={rise} className="course-intro about-intro-2">We are a team of passionate educators and counsellors driven by the goal to help students realize their academic potential and guide them to success in every step of their journey.</motion.p>
              <motion.div variants={rise} className="hero-actions">
                <Button asChild size="lg" className="hero-primary"><a href="#leadership">Meet our leadership <ArrowRight size={17} /></a></Button>
                <Link href="/faculty" className="hero-secondary">Meet our faculty <ArrowRight size={16} /></Link>
              </motion.div>
            </motion.div>

            <motion.div className="course-hero-visual" initial={{ opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.2 }}>
              <span className="hero-orbit" aria-hidden="true"><span /></span>
              <figure className="course-hero-frame about-hero-frame">
                <motion.div className="course-hero-photo" style={{ y: imageY }}>
                  <Image src="/academy-campus-student.png" alt="Illustrative academy setting with a student looking confidently toward her future" fill priority sizes="(max-width: 1000px) 100vw, 45vw" style={{ objectPosition: "65% center" }} />
                </motion.div>
                <figcaption><span>LEARN TODAY. LEAD TOMORROW.</span><strong>A stronger foundation.<br />A brighter future.</strong></figcaption>
              </figure>
              <motion.div className="hero-badge course-badge-top" initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.8 }}>
                <span className="hero-badge-inner"><span className="hero-badge-icon"><Trophy size={15} /></span>Brand Icon of the Year 2024</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="page-container about-stats-wrap" aria-label="EduPulse at a glance">
          <Reveal as="div" className="about-stats">
            <motion.div variants={rise}><strong><Counter to={programs.length} /></strong><span>Programs offered</span></motion.div>
            <motion.div variants={rise}><strong><Counter to={faculty.length} /></strong><span>Subject departments</span></motion.div>
            <motion.div variants={rise}><strong>Grade <Counter to={6} /></strong><span>Where learning begins</span></motion.div>
            <motion.div variants={rise}><strong><Counter to={2024} /></strong><span>Brand Icon of the Year</span></motion.div>
          </Reveal>
        </section>

        <section id="leadership" className="page-container course-section about-leadership" aria-labelledby="leadership-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">A SHARED VISION FOR YOUR FUTURE</motion.p>
            <motion.h2 variants={rise} id="leadership-title">A message from <span>our leadership.</span></motion.h2>
          </Reveal>
          <div className="about-leaders">
            {leaders.map((leader, i) => <LeaderProfile key={leader.name} leader={leader} index={i} />)}
          </div>
        </section>

        <section className="course-band about-faculty-teaser" aria-labelledby="faculty-teaser-title">
          <div className="page-container about-faculty-layout">
            <Reveal className="about-faculty-copy">
              <motion.p variants={rise} className="section-kicker">THE MENTORS IN THE CLASSROOM</motion.p>
              <motion.h2 variants={rise} id="faculty-teaser-title">Subject experts who <span>teach with care.</span></motion.h2>
              <motion.p variants={rise} className="course-section-intro">Our faculty is organised into six subject departments, each supporting the programs where that subject matters most, from Grade 6 foundations to entrance exams.</motion.p>
              <motion.div variants={rise}><Button asChild size="lg" className="hero-primary"><Link href="/faculty">Meet our faculty <ArrowRight size={17} /></Link></Button></motion.div>
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
        </section>

        <section className="page-container course-section" aria-labelledby="values-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">WHAT GUIDES US</motion.p>
            <motion.h2 variants={rise} id="values-title">Our purpose, <span>in everything we do.</span></motion.h2>
          </Reveal>
          <Reveal className="course-subjects count-4">
            {values.map(({ title, description, icon: Icon }, i) => (
              <TiltCard key={title} className="course-subject about-value">
                <span className="course-subject-index">{String(i + 1).padStart(2, "0")}</span>
                <span className="course-subject-icon"><Icon size={24} strokeWidth={1.6} /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </TiltCard>
            ))}
          </Reveal>
        </section>

        <section className="page-container about-recognition" aria-labelledby="recognition-title">
          <motion.div className="about-recognition-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, ease: EASE }}>
            <div className="about-recognition-photo">
              <Image src="/gallery/award-2024.jpg" alt="A member of the EduPulse team holding Brand Icon of the Year 2024 awards" fill sizes="(max-width: 1000px) 100vw, 40vw" style={{ objectPosition: "center 30%" }} />
            </div>
            <div className="about-recognition-body">
              <span className="about-recognition-icon"><Trophy size={26} /></span>
              <p className="course-cta-kicker">RECOGNITION</p>
              <h2 id="recognition-title">Brand Icon of the Year 2024</h2>
              <p>Recognition that inspires us to keep raising the bar, for our students, their families and every learner who walks through our doors.</p>
              <Button asChild size="lg" className="course-cta-primary"><Link href="/gallery">See life at EduPulse <ArrowRight size={16} /></Link></Button>
            </div>
          </motion.div>
        </section>

        <section className="page-container course-section about-learning-section" aria-labelledby="learning-title">
          <motion.div className="about-learning-photo" initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.9, ease: EASE }}>
            <Image src="/academy-students.png" alt="Two students studying together at a library table" fill sizes="(max-width: 1000px) 100vw, 45vw" />
          </motion.div>
          <Reveal>
            <motion.p variants={rise} className="section-kicker">YOUR POTENTIAL. OUR PURPOSE.</motion.p>
            <motion.h2 variants={rise} id="learning-title" className="about-learning-title">The right support <span>makes all the difference.</span></motion.h2>
            <motion.p variants={rise} className="course-section-intro">From building strong foundations to preparing for entrance examinations, our focus is on helping students learn with clarity, confidence, and purpose.</motion.p>
            <motion.div variants={rise} className="hero-actions"><Button asChild size="lg" className="hero-primary"><Link href="/courses">Explore our programs <ArrowRight size={17} /></Link></Button></motion.div>
          </Reveal>
        </section>

        <section className="page-container about-visit" aria-labelledby="visit-title">
          <Reveal className="course-section-head">
            <motion.p variants={rise} className="section-kicker">LET&apos;S START A CONVERSATION</motion.p>
            <motion.h2 variants={rise} id="visit-title">Visit <span>us.</span></motion.h2>
            <motion.p variants={rise} className="about-visit-address"><MapPin size={16} aria-hidden="true" />{contact.address}</motion.p>
          </Reveal>
          <motion.div className="about-map" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, ease: EASE }}>
            <iframe title="Map showing the EduPulse Academy address in Aligarh" src={`https://maps.google.com/maps?q=${mapsQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </motion.div>
          <div className="about-visit-actions">
            <p>We look forward to helping you plan your next chapter.</p>
            <div>
              <Button asChild variant="outline"><a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer">Open in Google Maps <ArrowRight size={16} /></a></Button>
              <Button asChild><Link href="/contact">Contact us <ArrowRight size={16} /></Link></Button>
            </div>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
