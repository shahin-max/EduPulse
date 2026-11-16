"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSelect } from "@/components/brand-select";
import { PHONE_PATTERN } from "@/components/enquiry-form";
import { publicApi } from "@/lib/api";
import { whatsappLink } from "@/lib/site";

const CLASSES = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Passed Class 12"];

type Sent = { kind: "saved"; id: number; whatsapp: string } | { kind: "failed"; message: string; whatsapp: string };

/**
 * Scholarship Test registration. Saved as an admission enquiry with source SCHOLARSHIP_TEST, so the
 * office sees it in Admin → Enquiries (filter or search) and calls back with the date and syllabus.
 * WhatsApp is the fallback when the API can't be reached.
 */
export default function ScholarshipForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const whatsapp = whatsappLink([
      "Hello EduPulse Academy, I would like to register for the Scholarship Test.",
      `Name: ${get("name")}`,
      `Phone: ${get("phone")}`,
      `Class: ${get("grade")}`,
    ].join("\n"));
    setBusy(true);
    try {
      const enquiry = await publicApi.enquire({
        studentName: get("name"),
        mobile: get("phone").replace(/[\s-]/g, ""),
        email: get("email") || undefined,
        message: `Scholarship Test registration\nClass: ${get("grade")}`,
        source: "SCHOLARSHIP_TEST",
      });
      setSent({ kind: "saved", id: enquiry.id, whatsapp });
    } catch (e) {
      setSent({ kind: "failed", message: e instanceof Error ? e.message : "Could not send the registration.", whatsapp });
    } finally {
      setBusy(false);
    }
  }

  if (sent?.kind === "saved") return <div className="enquiry-form enquiry-done" role="status">
    <CheckCircle2 size={34} className="enquiry-done-icon" aria-hidden="true" />
    <h3>You are registered.</h3>
    <p>Our team will call you with the test date, syllabus and details. Your reference number is <strong>#{sent.id}</strong>.</p>
    <div className="enquiry-done-actions">
      <Button asChild variant="outline"><a href={sent.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle /> Also message us on WhatsApp</a></Button>
    </div>
  </div>;

  return <form className="enquiry-form scholarship-form" onSubmit={submit}>
    <div className="enquiry-row">
      <label>Student name<input name="name" required autoComplete="name" minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Phone number<input name="phone" required type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter a valid 10-digit mobile number" placeholder="10-digit mobile" /></label>
    </div>
    <div className="enquiry-row">
      <div className="enquiry-field"><span id="grade-label" className="enquiry-label">Current class</span><BrandSelect name="grade" aria-labelledby="grade-label" options={CLASSES} defaultValue="Class 5" /></div>
      <label><span className="label-text">Email <span>(optional)</span></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
    </div>
    {sent?.kind === "failed" && <div className="enquiry-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{sent.message} You can send the same details on WhatsApp instead: <a href={sent.whatsapp} target="_blank" rel="noopener noreferrer">open WhatsApp</a>.</span>
    </div>}
    <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Registering...</> : <>Register for the test <Send /></>}</Button>
  </form>;
}
