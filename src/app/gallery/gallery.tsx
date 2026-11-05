"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Expand, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = ["All", "Achievements", "Campus", "Learning", "Events"] as const;
type Category = typeof categories[number];
type Item = { src: string; title: string; category: Exclude<Category, "All">; description: string; alt: string; position: string; type?: "video"; sample?: boolean };

const items: Item[] = [
  { src: "/gallery/award-2024.jpg", title: "Brand Icon of the Year 2024", category: "Achievements", description: "Recognition that inspires us to keep raising the bar.", alt: "A member of the EduPulse team holding Brand Icon of the Year 2024 awards", position: "center 35%" },
  { src: "/academy-campus-student.png", title: "A world of possibilities", category: "Campus", description: "A confident start to the next chapter.", alt: "Sample image of a student with books outside a modern academy building", position: "60% center", sample: true },
  { src: "/gallery/classroom.png", title: "Where curiosity comes alive", category: "Learning", description: "New ideas begin with the right questions.", alt: "Sample image of a teacher leading a classroom discussion", position: "center", sample: true },
  { src: "/academy-students.png", title: "Better, together", category: "Learning", description: "Sharing ideas. Building understanding.", alt: "Sample image of two students studying together in a library", position: "center 40%", sample: true },
  { src: "/gallery/science-exhibition.png", title: "Ideas beyond the classroom", category: "Events", description: "Making space for discovery and collaboration.", alt: "Sample image of students presenting a science model to their teacher", position: "center", sample: true },
];
const countFor = (category: Category) => category === "All" ? items.length : items.filter(item => item.category === category).length;

function Media({ item, preview }: { item: Item; preview?: boolean }) {
  if (item.type === "video") {
    return preview
      ? <video key={item.src} src={item.src} controls autoPlay playsInline aria-label={item.alt} />
      : <video src={`${item.src}#t=0.5`} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} style={{ objectPosition: item.position }} />;
  }
  return <Image src={item.src} alt={item.alt} fill sizes={preview ? "90vw" : "(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 380px"} style={{ objectPosition: preview ? undefined : item.position }} />;
}

export default function Gallery() {
  const [category, setCategory] = useState<Category>("All");
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = category === "All" ? items : items.filter(item => item.category === category);
  const current = selected === null ? null : filtered[selected];

  function openItem(index: number) {
    setSelected(index);
    if (!dialog.current?.open) dialog.current?.showModal();
  }
  function change(direction: number) {
    setSelected(index => index === null ? null : (index + direction + filtered.length) % filtered.length);
  }

  return <div className="gallery-page page-container">
    <nav className="gallery-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Gallery</span></nav>
    <header className="gallery-heading"><div><p className="section-kicker">LIFE AT EDUPULSE</p><h1>Little moments.<br /><span>Limitless possibilities.</span></h1></div><p>A glimpse into learning, discovery, achievements, and the connections that make an academy feel like a community.</p></header>
    <div className="gallery-sample-note"><Camera size={18} aria-hidden="true" /><p><strong>More moments coming soon.</strong> Images marked &ldquo;Sample&rdquo; are illustrative and will be replaced with academy photos.</p></div>
    <div className="gallery-toolbar"><div className="gallery-filters" role="group" aria-label="Filter gallery by category">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => { setCategory(item); setSelected(null); }}>{item}<span>{countFor(item)}</span></button>)}</div><p className="gallery-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "item" : "items"}</p></div>
    <div className="gallery-grid">{filtered.map((item, index) => <button className="gallery-card" key={item.src} onClick={() => openItem(index)} aria-label={`${item.type === "video" ? "Play" : "View"} ${item.title}`} aria-haspopup="dialog">
      <span className="gallery-image"><Media item={item} /><span className="gallery-badges"><span className="gallery-category">{item.category}</span>{item.sample && <span className="gallery-category gallery-sample">Sample</span>}</span><span className={item.type === "video" ? "gallery-expand gallery-play" : "gallery-expand"}>{item.type === "video" ? <Play size={20} aria-hidden="true" /> : <Expand size={18} aria-hidden="true" />}</span></span>
      <span className="gallery-caption"><span><strong>{item.title}</strong><span>{item.description}</span></span><ArrowRight size={19} aria-hidden="true" /></span>
    </button>)}</div>
    <div className="gallery-end"><span>More stories. More discoveries. Coming soon.</span><Link href="/aboutus">Get to know EduPulse <ArrowRight size={16} /></Link></div>
    <dialog className="gallery-lightbox" ref={dialog} aria-labelledby="photo-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if ((event.target as HTMLElement).tagName === "VIDEO") return; if (event.key === "ArrowRight") { event.preventDefault(); change(1); } if (event.key === "ArrowLeft") { event.preventDefault(); change(-1); } }}>
      {current && <div className="gallery-preview">
        <div className="gallery-preview-top"><span>GALLERY / {current.category.toUpperCase()}</span><Button autoFocus variant="ghost" size="icon" aria-label="Close preview" onClick={() => dialog.current?.close()}><X /></Button></div>
        <div className="gallery-full-image"><Media item={current} preview /></div>
        <div className="gallery-preview-bottom"><div aria-live="polite"><h2 id="photo-title">{current.title}</h2><p>{current.sample ? "Sample image" : current.description} &middot; {(selected ?? 0) + 1} of {filtered.length}</p></div><div className="gallery-preview-controls"><Button variant="outline" size="icon" aria-label="Previous item" disabled={filtered.length < 2} onClick={() => change(-1)}><ArrowLeft /></Button><Button variant="outline" size="icon" aria-label="Next item" disabled={filtered.length < 2} onClick={() => change(1)}><ArrowRight /></Button></div></div>
      </div>}
    </dialog>
  </div>;
}
