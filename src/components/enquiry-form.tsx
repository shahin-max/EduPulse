"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contact, programs, whatsappLink } from "@/lib/site";

export default function EnquiryForm() {
  const [sent, setSent] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const lines = [
      "Hello EduPulse Academy, I would like to know more.",
      `Name: ${get("name")}`,
      `Phone: ${get("phone")}`,
      `Interested in: ${get("program")}`,
      get("message") && `Message: ${get("message")}`,
    ].filter(Boolean);
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
    setSent(true);
  }

  return <form className="enquiry-form" onSubmit={submit}>
    <div className="enquiry-row">
      <label>Your name<input name="name" required autoComplete="name" maxLength={60} placeholder="Full name" /></label>
      <label>Phone number<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" pattern="[+0-9 ]{10,15}" title="Enter a valid 10-digit phone number" placeholder="10-digit mobile" /></label>
    </div>
    <label>Program of interest<select name="program" defaultValue={programs[0].title}>{programs.map(p => <option key={p.title}>{p.title}</option>)}<option>Not sure yet - need guidance</option></select></label>
    <label><span className="label-text">Message <span>(optional)</span></span><textarea name="message" rows={3} maxLength={400} placeholder="Class, preferred timing, or any question" /></label>
    <Button type="submit" size="lg" className="enquiry-submit">Send enquiry on WhatsApp <Send /></Button>
    {sent ? <p className="enquiry-status" role="status"><CheckCircle2 size={16} aria-hidden="true" /> WhatsApp opened with your details. Tap send there and our team will get back to you.</p>
      : <p className="enquiry-hint">Prefer to call? <a href={`tel:${contact.phone}`}>{contact.phoneDisplay}</a></p>}
  </form>;
}
