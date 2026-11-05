import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, Heart, MapPin, Target, Users } from "lucide-react";
import AcademySite from "@/components/academy-site";
import { Button } from "@/components/ui/button";
import { contact, mapsQuery } from "@/lib/site";
import "./aboutus.css";

export const metadata: Metadata = {
  title: "About Us",
  description: "Meet the people and purpose behind EduPulse Academy. Discover our mission, values, vision, and commitment to students in Aligarh.",
};

const values = [
  { title: "Our Mission", description: "Transforming lives through education", icon: Target },
  { title: "Our Values", description: "Excellence and student support", icon: Users },
  { title: "Our Vision", description: "Building tomorrow's leaders today", icon: Award },
  { title: "Our Commitment", description: "Dedicated to student success", icon: Heart },
];
const address = contact.address;


export default function AboutUs() {
  return <AcademySite>
    <div className="about-page">
      <section className="about-intro page-container" aria-labelledby="about-title">
        <div className="about-intro-copy">
          <nav className="about-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">About Us</span></nav>
          <p className="section-kicker">THE PEOPLE. THE PURPOSE. THE POSSIBILITIES.</p>
          <h1 id="about-title">About EduPulse<br /><span>Academy.</span></h1>
          <p>EduPulse Academy is built on a strong belief &mdash; every student deserves the right guidance, the right support, and the right opportunities to shape their future.</p>
          <p>We are a team of passionate educators and counsellors driven by the goal to help students realize their academic potential and guide them to success in every step of their journey.</p>
          <a className="text-link" href="#leadership">Meet our leadership <ArrowRight size={17} /></a>
        </div>
        <figure className="about-campus">
          <Image src="/academy-campus-student.png" alt="Illustrative academy setting with a student looking confidently toward her future" fill sizes="(max-width: 760px) 90vw, 45vw" priority />
          <figcaption><span>LEARN TODAY. LEAD TOMORROW.</span><strong>A stronger foundation.<br />A brighter future.</strong></figcaption>
        </figure>
      </section>

      <section id="leadership" className="about-leadership page-container" aria-labelledby="leadership-title">
        <div className="about-section-heading"><p className="section-kicker">A SHARED VISION FOR YOUR FUTURE</p><h2 id="leadership-title">A message from our leadership.</h2></div>
        <article className="leader-row">
          <div className="leader-portrait-wrap"><div className="leader-portrait"><Image src="/about/gopal-kaur.png" alt="Portrait of Gopal Kaur, Business Investor" width={190} height={211} /></div><span className="leader-photo-label">THE PEOPLE BEHIND EDUPULSE</span></div>
          <div className="leader-message"><h3>Gopal Kaur</h3><p className="leader-role">BUSINESS INVESTOR</p><blockquote><span className="quote-mark" aria-hidden="true">&ldquo;</span><p>Dear Directors, Employees, and Members of the Edupulse Family,</p><p>It is a privilege to be associated with Edupulse, an organization committed to excellence in hospitality, aviation, and professional education. Together, let us continue to uphold the values of integrity, respect, teamwork, and excellence. I wish every member of the Edupulse family continued success and look forward to achieving greater milestones together.</p><footer><span>Best wishes,</span><cite>Gopal Kaur</cite></footer></blockquote></div>
        </article>
        <article className="leader-row leader-row-reverse">
          <div className="leader-portrait-wrap"><div className="leader-portrait"><Image src="/about/priyansh-mittal.png" alt="Portrait of Priyansh Mittal, Co-founder and Director" width={191} height={213} /></div><span className="leader-photo-label">GUIDANCE WITH PURPOSE</span></div>
          <div className="leader-message"><h3>Priyansh Mittal</h3><p className="leader-role">CO-FOUNDER &amp; DIRECTOR</p><blockquote><span className="quote-mark" aria-hidden="true">&ldquo;</span><p>Success is never achieved by chance, it is through discipline, consistency, and the willingness to learn every single day. At Edupulse, our focus is to ensure that every student receives industry-oriented guidance and develops the professional standards expected by leading organizations. We look forward to witnessing your growth and celebrating your success.</p><footer><span>Best wishes,</span><cite>Priyansh Mittal</cite></footer></blockquote></div>
        </article>
      </section>

      <section className="about-values" aria-labelledby="values-title"><div className="page-container"><div className="about-section-heading"><p className="section-kicker">WHAT GUIDES US</p><h2 id="values-title">Our purpose, in everything we do.</h2></div><div className="about-values-grid">{values.map(({ title, description, icon: Icon }) => <article key={title} className="about-value-card"><span><Icon size={25} strokeWidth={1.6} /></span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

      <section className="about-learning page-container" aria-labelledby="learning-title"><div className="about-learning-photo"><Image src="/academy-students.png" alt="Illustration of students collaborating over their books in a library" fill sizes="(max-width: 760px) 90vw, 45vw" /></div><div><p className="section-kicker">YOUR POTENTIAL. OUR PURPOSE.</p><h2 id="learning-title">The right support<br /><span>makes all the difference.</span></h2><p>From building strong foundations to preparing for entrance examinations, our focus is on helping students learn with clarity, confidence, and purpose.</p><Button asChild size="lg"><Link href="/#courses">Explore our programs <ArrowRight size={17} /></Link></Button></div></section>

      <section className="about-visit page-container" aria-labelledby="visit-title"><div className="about-section-heading"><p className="section-kicker">LET&apos;S START A CONVERSATION</p><h2 id="visit-title">Visit us.</h2><p><MapPin size={16} aria-hidden="true" />{address}</p></div><div className="about-map"><iframe title="Map showing the EduPulse Academy address in Aligarh" src={`https://maps.google.com/maps?q=${mapsQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div><div className="about-visit-actions"><p>We look forward to helping you plan your next chapter.</p><Button asChild variant="outline"><a href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`} target="_blank" rel="noopener noreferrer">Open in Google Maps <ArrowRight size={16} /></a></Button></div></section>
    </div>
  </AcademySite>;
}
