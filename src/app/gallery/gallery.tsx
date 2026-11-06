"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Expand, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = ["All", "Activities", "Outings", "Celebrations", "Achievements"] as const;
type Category = typeof categories[number];
type Item = { src: string; title: string; category: Exclude<Category, "All">; description: string; alt: string; position: string; type?: "video"; poster?: string };

const photo = (n: number, ext = "jpg") => `/gallery/${n}.${ext}`;
const video = (n: number) => ({ src: `/gallery/${n}.mp4`, poster: `/gallery/${n}-poster.jpg`, type: "video" as const });

const items: Item[] = [
  { src: photo(1), title: "Together under the trees", category: "Outings", description: "Students and mentors on an EduPulse day out in the park.", alt: "EduPulse students in white T-shirts kneeling in front of three mentors in a park", position: "center 55%" },
  { ...video(6), title: "Lemon-and-spoon race", category: "Activities", description: "Steady hands and steady steps at our games day.", alt: "Video of EduPulse students lined up with spoons and lemons in their mouths for a lemon-and-spoon race", position: "center 30%" },
  { src: photo(12), title: "Ready, set, go!", category: "Activities", description: "On your marks for the park race.", alt: "Students crouched at the start line of a race in a park", position: "center 40%" },
  { ...video(18), title: "The race is on", category: "Activities", description: "Every step counts.", alt: "Video of students starting a race in the park", position: "center 40%" },
  { src: photo(15), title: "Waiting for our turn", category: "Activities", description: "Teamwork, patience and plenty of smiles.", alt: "Students in white T-shirts standing in a line on the grass", position: "center 25%" },
  { ...video(19), title: "Racing to the finish", category: "Activities", description: "Fun, fitness and friendly competition.", alt: "Video of students racing in the park", position: "center 45%" },
  { src: photo(5, "jpeg"), title: "Time out on the lawn", category: "Outings", description: "Catching our breath between games.", alt: "Students sitting together on a lawn in a park", position: "center" },
  { src: photo(2), title: "A day out together", category: "Outings", description: "Learning happens outside the classroom too.", alt: "EduPulse students with backpacks posing together in a shopping mall", position: "center 45%" },
  { src: photo(8), title: "Exploring the city", category: "Outings", description: "New places, new conversations.", alt: "Students and a mentor standing in a row inside a mall", position: "center 50%" },
  { src: photo(16), title: "Dinner together", category: "Celebrations", description: "Sharing a meal and stories after a busy day.", alt: "Students sitting on the floor sharing a meal from steel plates", position: "center" },
  { src: photo(3), title: "A birthday to remember", category: "Celebrations", description: "Friends who celebrate together, stay together.", alt: "A student feeding birthday cake to a friend", position: "center 25%" },
  { src: photo(9), title: "Cake time!", category: "Celebrations", description: "No birthday is complete without cake.", alt: "Students sharing cake at a birthday celebration", position: "center 40%" },
  { src: photo(13), title: "Sweet surprises", category: "Celebrations", description: "A little cake, a lot of laughter.", alt: "A student putting cake on a friend's face at a birthday celebration", position: "center 25%" },
  { src: photo(10), title: "Celebrating friendship", category: "Celebrations", description: "Good friends make every day special.", alt: "Friends sharing birthday cake together", position: "center 30%" },
  { src: photo(17), title: "Big smiles, little moments", category: "Celebrations", description: "Celebrating together as one family.", alt: "A younger student offering cake to a smiling friend", position: "center 35%" },
  { src: photo(14), title: "The birthday star", category: "Celebrations", description: "Cake on the cheeks, joy in the heart.", alt: "A smiling student with cake on his face", position: "center 25%" },
  { src: "/gallery/award-2024.jpg", title: "Brand Icon of the Year 2024", category: "Achievements", description: "Recognition that inspires us to keep raising the bar.", alt: "A member of the EduPulse team holding Brand Icon of the Year 2024 awards", position: "center 35%" },
];
const countFor = (category: Category) => category === "All" ? items.length : items.filter(item => item.category === category).length;

function Media({ item, preview }: { item: Item; preview?: boolean }) {
  if (item.type === "video") {
    if (preview) return <video key={item.src} src={item.src} poster={item.poster} controls autoPlay playsInline aria-label={item.alt} />;
    // Grid cards show the lightweight poster frame; the video itself only loads when opened.
    return <Image src={item.poster!} alt="" fill sizes="(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 380px" style={{ objectPosition: item.position }} />;
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
    <div className="gallery-sample-note"><Camera size={18} aria-hidden="true" /><p><strong>Real moments from EduPulse:</strong> games days, outings, celebrations and achievements.</p></div>
    <div className="gallery-toolbar"><div className="gallery-filters" role="group" aria-label="Filter gallery by category">{categories.map(item => <button key={item} aria-pressed={category === item} onClick={() => { setCategory(item); setSelected(null); }}>{item}<span>{countFor(item)}</span></button>)}</div><p className="gallery-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "item" : "items"}</p></div>
    <div className="gallery-grid">{filtered.map((item, index) => <button className="gallery-card" key={item.src} onClick={() => openItem(index)} aria-label={`${item.type === "video" ? "Play" : "View"} ${item.title}`} aria-haspopup="dialog">
      <span className="gallery-image"><Media item={item} /><span className="gallery-badges"><span className="gallery-category">{item.category}</span></span><span className={item.type === "video" ? "gallery-expand gallery-play" : "gallery-expand"}>{item.type === "video" ? <Play size={20} aria-hidden="true" /> : <Expand size={18} aria-hidden="true" />}</span></span>
      <span className="gallery-caption"><span><strong>{item.title}</strong><span>{item.description}</span></span><ArrowRight size={19} aria-hidden="true" /></span>
    </button>)}</div>
    <div className="gallery-end"><span>More stories. More discoveries. Coming soon.</span><Link href="/aboutus">Get to know EduPulse <ArrowRight size={16} /></Link></div>
    <dialog className="gallery-lightbox" ref={dialog} aria-labelledby="photo-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if ((event.target as HTMLElement).tagName === "VIDEO") return; if (event.key === "ArrowRight") { event.preventDefault(); change(1); } if (event.key === "ArrowLeft") { event.preventDefault(); change(-1); } }}>
      {current && <div className="gallery-preview">
        <div className="gallery-preview-top"><span>GALLERY / {current.category.toUpperCase()}</span><Button autoFocus variant="ghost" size="icon" aria-label="Close preview" onClick={() => dialog.current?.close()}><X /></Button></div>
        <div className="gallery-full-image"><Media item={current} preview /></div>
        <div className="gallery-preview-bottom"><div aria-live="polite"><h2 id="photo-title">{current.title}</h2><p>{current.description} &middot; {(selected ?? 0) + 1} of {filtered.length}</p></div><div className="gallery-preview-controls"><Button variant="outline" size="icon" aria-label="Previous item" disabled={filtered.length < 2} onClick={() => change(-1)}><ArrowLeft /></Button><Button variant="outline" size="icon" aria-label="Next item" disabled={filtered.length < 2} onClick={() => change(1)}><ArrowRight /></Button></div></div>
      </div>}
    </dialog>
  </div>;
}
