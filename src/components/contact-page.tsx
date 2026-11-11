"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MotionConfig, motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, MessagesSquare, Navigation, Phone, Send, UserCheck, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import EnquiryForm from "@/components/enquiry-form";
import { EASE, Reveal, TiltCard, Words, rise, stagger } from "@/components/motion-kit";
import { contact, mapsQuery, socials, whatsappLink } from "@/lib/site";

const HeroScene3D = dynamic(() => import("@/components/hero-scene-3d"), { ssr: false });

const quick = [
  { title: "Call us", icon: Phone, lines: contact.phones.map(p => ({ label: p.display, href: `tel:${p.tel}` })) },
  { title: "WhatsApp", icon: MessageCircle, lines: [{ label: "Chat with our team", href: whatsappLink("Hello EduPulse Academy, I would like to know more about your programs."), external: true }] },
  { title: "Email", icon: Mail, lines: [{ label: contact.email, href: `mailto:${contact.email}` }] },
  { title: "Visit", icon: MapPin, lines: [{ label: contact.address, href: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`, external: true }] },
];

const nextSteps = [
  { title: "Share your details", text: "Fill in the form with your name, number and the program you're interested in.", icon: Send },
  { title: "We receive it instantly", text: "Your enquiry reaches our admissions team straight away, with a reference number for you.", icon: MessagesSquare },
  { title: "We get back to you", text: "Our team replies with batch details and helps you choose the right starting point.", icon: UserCheck },
];

/** Reads ?program=<slug> so course pages can pre-select their program. */
function FormWithProgram() {
  const program = useSearchParams().get("program");
  return <EnquiryForm defaultProgram={program} />;
}

export default function ContactPage() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });

  return (
    <MotionConfig reducedMotion="user">
      <div className="course-page contact-page">
        <motion.div className="course-progress" style={{ scaleX: progress }} aria-hidden="true" />

        <section className="course-hero contact-hero" aria-labelledby="contact-title">
          <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
          <HeroScene3D slide={0} />
          <div className="page-container contact-hero-inner">
            <motion.div className="contact-hero-copy" variants={stagger} initial="hidden" animate="show">
              <motion.nav variants={rise} className="course-breadcrumb" aria-label="Breadcrumb">
                <Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Contact</span>
              </motion.nav>
              <motion.p variants={rise} className="course-kicker"><span className="course-kicker-icon"><MessageCircle size={17} /></span>CONTACT US</motion.p>
              <motion.h1 id="contact-title" className="hero-title course-title contact-title" variants={stagger}>
                <span><Words text="Let's talk about" /></span>{" "}
                <em><Words text="your next chapter." /></em>
              </motion.h1>
              <motion.p variants={rise} className="course-intro">Questions about a program, batch timings or admissions? Call, WhatsApp, email or visit us in Aligarh, or send an enquiry below and our team will help you choose the right path.</motion.p>
            </motion.div>
          </div>
          <Reveal className="page-container contact-quick">
            {quick.map(({ title, icon: Icon, lines }) => (
              <TiltCard key={title} className="contact-quick-card" max={6}>
                <span className="course-feature-icon"><Icon size={20} /></span>
                <h2>{title}</h2>
                {lines.map(line => (
                  <a key={line.label} href={line.href} {...("external" in line && line.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{line.label}</a>
                ))}
              </TiltCard>
            ))}
          </Reveal>
        </section>

        <section id="enquiry" className="page-container contact-main" aria-label="Enquiry form and location">
          <motion.div className="contact-form-card" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease: EASE }}>
            <span className="contact-form-glow" aria-hidden="true" />
            <p className="section-kicker">TALK TO OUR TEAM</p>
            <h2 id="enquiry-title">Request a callback.</h2>
            <p className="contact-form-intro">Share a few details and our counsellors will help you choose the right program and batch.</p>
            <Suspense fallback={<EnquiryForm />}>
              <FormWithProgram />
            </Suspense>
          </motion.div>

          <motion.aside className="contact-visit" aria-labelledby="visit-title" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}>
            <div className="contact-map">
              <iframe title="Map showing the EduPulse Academy address in Aligarh" src={`https://maps.google.com/maps?q=${mapsQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
            <div className="contact-visit-body">
              <p className="section-kicker">VISIT THE ACADEMY</p>
              <h2 id="visit-title">EduPulse Academy, Aligarh</h2>
              <ul className="contact-visit-list">
                <li><MapPin size={17} /><span>{contact.address}</span></li>
                <li><Clock size={17} /><span>Visit us or call during academy hours</span></li>
              </ul>
              <Button asChild variant="outline" className="contact-directions"><a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer"><Navigation size={16} /> Get directions</a></Button>
              <div className="contact-socials">
                <span>Follow us</span>
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on Instagram (opens in a new tab)"><Instagram size={18} /></a>
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on Facebook (opens in a new tab)"><Facebook size={18} /></a>
                <a href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on YouTube (opens in a new tab)"><Youtube size={18} /></a>
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="course-band contact-steps-band" aria-labelledby="steps-title">
          <div className="page-container">
            <Reveal className="course-section-head">
              <motion.p variants={rise} className="section-kicker">WHAT HAPPENS NEXT</motion.p>
              <motion.h2 variants={rise} id="steps-title">From enquiry to <span>your first class.</span></motion.h2>
            </Reveal>
            <Reveal as="ul" className="courses-steps-list">
              {nextSteps.map(({ title, text, icon: StepIcon }, i) => (
                <motion.li key={title} variants={rise}>
                  <span className="courses-step-icon"><StepIcon size={22} /><span>{i + 1}</span></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </motion.li>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="page-container course-cta-wrap contact-cta" aria-labelledby="contact-cta-title">
          <motion.div className="course-cta" initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.8, ease: EASE }}>
            <span className="course-cta-glow" aria-hidden="true" />
            <div>
              <p className="course-cta-kicker">STILL EXPLORING?</p>
              <h2 id="contact-cta-title">Find the program that fits your goal.</h2>
              <p>Browse all seven EduPulse programs, from Grade 6 foundations to university entrance and spoken English.</p>
            </div>
            <div className="course-cta-actions">
              <Button asChild size="lg" className="course-cta-primary"><Link href="/courses">Explore courses <ArrowRight size={16} /></Link></Button>
            </div>
          </motion.div>
        </section>
      </div>
    </MotionConfig>
  );
}
