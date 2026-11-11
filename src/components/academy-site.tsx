"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Award, Camera, ChevronRight, Clock, Facebook, GraduationCap, Instagram, Mail, MapPin, Menu, MessageCircle, Moon, Phone, Star, Sun, Target, UserRound, Users, X, Youtube } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import PromoTicker from "@/components/promo-ticker";
import HeroSlider from "@/components/hero-slider";
import { contact, courseHref, programs, socials, whatsappLink } from "@/lib/site";

const links = [["Home", "home"], ["About Us", "about"], ["Courses", "courses"], ["Faculty", "faculty"], ["Gallery", "gallery"], ["Contact", "contact"]] as const;
const features = [
  { title: "Expert Faculty", detail: "Learn from highly qualified and experienced teachers.", icon: Users },
  { title: "Smart Learning", detail: "Build understanding with technology-assisted learning.", icon: Award },
  { title: "Exam Oriented", detail: "Focused preparation for your next big milestone.", icon: Target },
  { title: "Your Growth First", detail: "Guidance that keeps your learning moving forward.", icon: GraduationCap },
];
const infoModals = {
  "Scholarship Test": "Scholarship test dates and registration details will be announced soon. Message our team to be notified first.",
};
type Modal = { kind: "info"; title: keyof typeof infoModals } | null;

function navHref(id: string) {
  return id === "about" ? "/aboutus" : id === "gallery" ? "/gallery" : id === "courses" ? "/courses" : id === "contact" ? "/contact" : id === "faculty" ? "/faculty" : `/#${id}`;
}

function Brand({ priority = false }: { priority?: boolean }) {
  return <Link href="/" aria-label="EduPulse Academy home" className="brand">
    <span className="brand-mark"><Image src="/logo-mark.png" alt="" width={46} height={46} priority={priority} /></span>
    <span className="brand-name">EDU<span>PULSE</span><small>ACADEMY</small></span>
  </Link>;
}

export default function AcademySite({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState("home");
  const [modal, setModal] = useState<Modal>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const isCurrent = (id: string) => pathname === "/aboutus" ? id === "about" : pathname === "/gallery" ? id === "gallery" : pathname === "/courses" || pathname.startsWith("/courses/") ? id === "courses" : pathname === "/contact" ? id === "contact" : pathname === "/faculty" ? id === "faculty" : pathname === "/" && active === id;

  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem("edupulse-theme"); } catch {}
      if (!saved) { document.documentElement.classList.toggle("dark", media.matches); sync(); }
    };
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
    document.querySelectorAll("main section[id], footer[id]").forEach(section => observer.observe(section));
    return () => { media.removeEventListener("change", update); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!mobile) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobile(false); };
    const onResize = () => { if (window.innerWidth > 1023) setMobile(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [mobile]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("edupulse-theme", next ? "dark" : "light"); } catch {}
  }
  function open(next: Exclude<Modal, null>) {
    setModal(next);
    setMobile(false);
    if (!dialog.current?.open) dialog.current?.showModal();
  }
  const openInfo = (title: keyof typeof infoModals) => open({ kind: "info", title });

  const modalTitle = modal?.title ?? "";

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <PromoTicker />
      <div className="nav-container">
        <Brand priority />
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([label, id]) => <Link key={id} href={navHref(id)} aria-current={isCurrent(id) ? "page" : undefined}>{label}</Link>)}
        </nav>
        <div className="nav-actions">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className="theme-button"><Sun className="dark-sun" /><Moon className="light-moon" /></Button>
          <Button className="scholarship-button" onClick={() => openInfo("Scholarship Test")}><Star className="fill-current" /> <span>Scholarship Test</span></Button>
          {status === "authenticated" ? <Button asChild className="desktop-auth signup-button"><Link href="/dashboard"><UserRound /> {user?.full_name.split(" ")[0] ?? "My account"}</Link></Button> : <>
            <Button asChild variant="ghost" className="desktop-auth login-button"><Link href="/login">Login</Link></Button>
            <Button asChild className="desktop-auth signup-button"><Link href="/register">Sign Up <ArrowRight /></Link></Button>
          </>}
          <Button variant="ghost" size="icon" className="mobile-toggle" aria-expanded={mobile} aria-controls="mobile-navigation" aria-label={mobile ? "Close navigation" : "Open navigation"} onClick={() => setMobile(!mobile)}>{mobile ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {mobile && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-nav">
        {links.map(([label, id]) => <Link key={id} href={navHref(id)} aria-current={isCurrent(id) ? "page" : undefined} onClick={() => setMobile(false)}>{label}<ChevronRight size={16} /></Link>)}
        <div className="mobile-auth">{status === "authenticated"
          ? <><Button asChild variant="outline"><Link href="/dashboard" onClick={() => setMobile(false)}>My account</Link></Button><Button onClick={() => { setMobile(false); void logout(); }}>Log out</Button></>
          : <><Button asChild variant="outline"><Link href="/login" onClick={() => setMobile(false)}>Login</Link></Button><Button asChild><Link href="/register" onClick={() => setMobile(false)}>Sign Up</Link></Button></>}</div>
      </nav>}
    </header>

    <main id="main">{children ?? <>
      <section id="home" className="hero" aria-labelledby="hero-title">
        <HeroSlider />
        <div className="hero-benefits"><div className="page-container feature-grid">{features.map(({ title, detail, icon: Icon }) => <div className="feature-card" key={title}><Icon size={23} strokeWidth={1.5} /><div><h3>{title}</h3><p>{detail}</p></div></div>)}</div></div>
      </section>

      <section id="courses" className="programs-section page-container" aria-labelledby="courses-title">
        <p className="section-kicker">FIND YOUR NEXT CHAPTER</p>
        <h2 id="courses-title">Explore top programs.<br /><span>Designed for your success.</span></h2>
        <p className="section-intro">From strong foundations to ambitious futures, find the right path for you.</p>
        <div className="program-grid">{programs.map(program => <Link className="program-card" key={program.slug} href={courseHref(program.slug)}><span className="program-icon"><program.icon size={23} /></span><span><strong>{program.title}</strong><small>{program.detail}</small></span><ChevronRight className="program-arrow" size={18} /></Link>)}</div>
      </section>

      <div className="page-container upcoming-grid">
        <section id="gallery" className="upcoming-card gallery-teaser" aria-labelledby="gallery-teaser-title">
          <div className="gallery-teaser-image"><Image src="/gallery/award-2024.jpg" alt="A member of the EduPulse team holding Brand Icon of the Year 2024 awards" fill sizes="(max-width: 640px) 90vw, 40vw" /></div>
          <Camera size={25} /><p className="section-kicker">LIFE AT EDUPULSE</p><h2 id="gallery-teaser-title">Moments that inspire us.</h2>
          <p>Explore campus life, classroom discoveries, achievements, and student experiences.</p>
          <Link className="text-link" href="/gallery">Explore the gallery <ArrowRight size={17} /></Link>
        </section>
        <section id="talk" className="upcoming-card home-contact-card" aria-labelledby="talk-title">
          <MessageCircle size={25} /><p className="section-kicker">TALK TO OUR TEAM</p><h2 id="talk-title">Request a callback.</h2>
          <p>Share a few details and our counsellors will help you choose the right program and batch.</p>
          <div className="home-contact-list">
            {contact.phones.map(phone => <a key={phone.tel} href={`tel:${phone.tel}`}><Phone size={18} /><span>{phone.display}<small>Call the academy</small></span><ChevronRight size={16} /></a>)}
            <a href={whatsappLink("Hello EduPulse Academy, I would like to know more about your programs.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /><span>Chat on WhatsApp<small>Quick replies from our team</small></span><ChevronRight size={16} /></a>
            <a href={`mailto:${contact.email}`}><Mail size={18} /><span>{contact.email}<small>Email us anytime</small></span><ChevronRight size={16} /></a>
          </div>
          <div className="home-contact-actions">
            <Button asChild size="lg"><Link href="/contact">Open the enquiry form <ArrowRight size={16} /></Link></Button>
          </div>
        </section>
      </div>
    </>}</main>

    <footer id="contact" className="site-footer"><div className="page-container"><div className="footer-grid">
      <div><Brand /><p className="footer-motto">Learn Today. Lead Tomorrow.</p><p>Empowering students through<br />quality education and guidance.</p>
        <nav className="footer-socials" aria-label="Social media">
          <a href={socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on Instagram (opens in a new tab)" title="Instagram"><Instagram size={19} aria-hidden="true" /></a>
          <a href={socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on Facebook (opens in a new tab)" title="Facebook"><Facebook size={19} aria-hidden="true" /></a>
          <a href={socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="EduPulse on YouTube (opens in a new tab)" title="YouTube"><Youtube size={19} aria-hidden="true" /></a>
        </nav>
      </div>
      <div><h2>Quick Links</h2><ul>{links.map(([label, id]) => <li key={id}><Link href={navHref(id)}>{label}</Link></li>)}</ul></div>
      <div><h2>Our Courses</h2><ul>{programs.map(program => <li key={program.slug}><Link href={courseHref(program.slug)}>{program.title}</Link></li>)}</ul></div>
      <div><h2>Contact Us</h2><ul className="contact-list">
        <li><MapPin size={17} /><span>{contact.address}</span></li>
        <li><Phone size={17} /><span>{contact.phones.map((phone, i) => <span key={phone.tel}>{i > 0 && " / "}<a href={`tel:${phone.tel}`}>{phone.display}</a></span>)}</span></li>
        <li><MessageCircle size={17} /><a href={whatsappLink("Hello EduPulse Academy, I would like to know more about your programs.")} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></li>
        <li><Mail size={17} /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>
        <li><Clock size={17} /><span>Visit us or call during academy hours</span></li>
      </ul></div>
    </div><div className="footer-bottom"><p>&copy; {new Date().getFullYear()} EduPulse Academy, Aligarh. All rights reserved.</p><span>Built for brighter futures.</span></div></div></footer>

    <a className="whatsapp-fab" href={whatsappLink("Hello EduPulse Academy, I would like to know more about your programs.")} target="_blank" rel="noopener noreferrer" aria-label="Chat with EduPulse on WhatsApp (opens in a new tab)"><MessageCircle aria-hidden="true" /><span>Chat with us</span></a>

    <dialog ref={dialog} aria-labelledby="dialog-title" className="info-dialog" onClose={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {modal && <div className="dialog-content">
        <Button variant="ghost" size="icon" className="dialog-close" aria-label="Close dialog" onClick={() => dialog.current?.close()}><X /></Button>
        <span className="program-icon"><GraduationCap size={27} /></span>
        <p className="section-kicker">EDUPULSE ACADEMY</p>
        <h2 id="dialog-title">{modalTitle}</h2>
        <p>{infoModals[modal.title]}</p>
        <div className="dialog-actions">
          <Button asChild><a href={whatsappLink(`Hello EduPulse Academy, I would like to know more about: ${modalTitle}`)} target="_blank" rel="noopener noreferrer">Enquire on WhatsApp <ArrowRight /></a></Button>
          {contact.phones.map(phone => <Button key={phone.tel} asChild variant="outline"><a href={`tel:${phone.tel}`}><Phone /> Call {phone.display}</a></Button>)}
        </div>
        <a className="dialog-email" href={`mailto:${contact.email}?subject=${encodeURIComponent(modalTitle + " enquiry")}`}>Or email {contact.email}</a>
      </div>}
    </dialog>
  </>;
}
