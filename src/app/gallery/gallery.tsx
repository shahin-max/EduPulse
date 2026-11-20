"use client";

import { useContactInfo } from "@/lib/site-content";
import { DEFAULT_GALLERY_PAGE, isLocalVideo, youtubeThumbnail, type GalleryItem, type GalleryPageContent } from "@/lib/site-pages";
import { toEmbed } from "@/lib/video-embed";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Expand, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = GalleryItem;

/** The grid picture: a photo, a video's cover picture, or YouTube's own thumbnail. */
const coverOf = (item: Item) => item.image || (item.kind === "video" ? youtubeThumbnail(item.video) : "");

function Media({ item, preview }: { item: Item; preview?: boolean }) {
  if (item.kind === "video") {
    if (preview) {
      if (isLocalVideo(item.video)) return <video key={item.video} src={item.video} poster={item.image || undefined} controls autoPlay playsInline aria-label={item.alt} />;
      const embed = toEmbed(item.video);
      return embed ? <iframe key={embed.embedUrl} src={embed.embedUrl} title={item.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen className="gallery-embed" /> : null;
    }
    // Grid cards show the lightweight cover picture; the video itself only loads when opened.
    const cover = coverOf(item);
    return cover ? <Image src={cover} alt="" fill sizes="(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 380px" style={{ objectPosition: item.position }} /> : <span className="gallery-video-blank" aria-hidden="true"><Play size={34} /></span>;
  }
  return <Image src={item.image} alt={item.alt} fill sizes={preview ? "90vw" : "(max-width: 680px) 90vw, (max-width: 1100px) 45vw, 380px"} style={{ objectPosition: preview ? undefined : item.position }} />;
}

/** The gallery; heading, categories, photos and videos come from Admin → Website → Gallery page (page.gallery). */
export default function Gallery({ content = DEFAULT_GALLERY_PAGE }: { content?: GalleryPageContent }) {
  const items = content.items;
  // Categories in the academy's order, then any used by an item but missing from the list.
  const categories = ["All", ...new Set([...content.categories, ...items.map(i => i.category).filter(Boolean)])];
  type Category = string;
  const countFor = (category: Category) => category === "All" ? items.length : items.filter(item => item.category === category).length;
  const contact = useContactInfo();
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
    <header className="gallery-heading"><div>{content.kicker && <p className="section-kicker">{content.kicker}</p>}<h1>{content.titleLead}{content.titleAccent && <><br /><span>{content.titleAccent}</span></>}</h1></div>{content.intro && <p>{content.intro}</p>}</header>
    {content.note && <div className="gallery-sample-note"><Camera size={18} aria-hidden="true" /><p>{content.note}</p></div>}
    <div className="gallery-toolbar"><div className="gallery-filters" role="group" aria-label="Filter gallery by category">{categories.filter(c => countFor(c) > 0).map(item => <button key={item} aria-pressed={category === item} onClick={() => { setCategory(item); setSelected(null); }}>{item}<span>{countFor(item)}</span></button>)}</div><p className="gallery-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "item" : "items"}</p></div>
    {filtered.length === 0 && <p className="gallery-empty">New photos are coming soon.</p>}
    <div className="gallery-grid">{filtered.map((item, index) => <button className="gallery-card" key={`${item.image || item.video}-${index}`} onClick={() => openItem(index)} aria-label={`${item.kind === "video" ? "Play" : "View"} ${item.title}`} aria-haspopup="dialog">
      <span className="gallery-image"><Media item={item} />{item.category && <span className="gallery-badges"><span className="gallery-category">{item.category}</span></span>}<span className={item.kind === "video" ? "gallery-expand gallery-play" : "gallery-expand"}>{item.kind === "video" ? <Play size={20} aria-hidden="true" /> : <Expand size={18} aria-hidden="true" />}</span></span>
      <span className="gallery-caption"><span><strong>{item.title}</strong>{item.description && <span>{item.description}</span>}</span><ArrowRight size={19} aria-hidden="true" /></span>
    </button>)}</div>
    <div className="gallery-end"><span>New moments every week on our <a href={contact.instagram || "/contact"} target="_blank" rel="noopener noreferrer">Instagram</a> and <a href={contact.youtube || "/contact"} target="_blank" rel="noopener noreferrer">YouTube</a>.</span><Link href="/aboutus">Get to know EduPulse <ArrowRight size={16} /></Link></div>
    <dialog className="gallery-lightbox" ref={dialog} aria-labelledby="photo-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if ((event.target as HTMLElement).tagName === "VIDEO") return; if (event.key === "ArrowRight") { event.preventDefault(); change(1); } if (event.key === "ArrowLeft") { event.preventDefault(); change(-1); } }}>
      {current && <div className="gallery-preview">
        <div className="gallery-preview-top"><span>GALLERY{current.category && ` / ${current.category.toUpperCase()}`}</span><Button autoFocus variant="ghost" size="icon" aria-label="Close preview" onClick={() => dialog.current?.close()}><X /></Button></div>
        <div className="gallery-full-image"><Media item={current} preview /></div>
        <div className="gallery-preview-bottom"><div aria-live="polite"><h2 id="photo-title">{current.title}</h2><p>{current.description && <>{current.description} &middot; </>}{(selected ?? 0) + 1} of {filtered.length}</p></div><div className="gallery-preview-controls"><Button variant="outline" size="icon" aria-label="Previous item" disabled={filtered.length < 2} onClick={() => change(-1)}><ArrowLeft /></Button><Button variant="outline" size="icon" aria-label="Next item" disabled={filtered.length < 2} onClick={() => change(1)}><ArrowRight /></Button></div></div>
      </div>}
    </dialog>
  </div>;
}
