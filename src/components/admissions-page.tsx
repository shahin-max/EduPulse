"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, ChevronDown, ClipboardList, FileText, GraduationCap, KeyRound, Loader2, MapPin, MessageCircle, PhoneCall, Send, Sparkles, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandSelect } from "@/components/brand-select";
import { BranchField, PHONE_PATTERN, usePublicBranches } from "@/components/enquiry-form";
import { publicApi, type ApiBatch, type ApiCourse } from "@/lib/api";
import { programs } from "@/lib/site";
import { useContactInfo, whatsappHref } from "@/lib/site-content";
import { trackEvent } from "@/components/analytics";

const NOT_SURE = "Not sure yet - need guidance";
const ANY_BATCH = "Any batch / help me choose";

const steps = [
  { title: "Apply online", text: "Fill in this form. It reaches our admissions team straight away.", icon: Send },
  { title: "Counselling call", text: "We call you to understand the student's goals and suggest the right course and batch.", icon: PhoneCall },
  { title: "Confirm & pay fees", text: "Visit the academy or confirm by phone, then complete the fee for the chosen batch.", icon: Wallet },
  { title: "Start learning", text: "The student gets a portal login for classes, study material, tests and results.", icon: KeyRound },
];

export const formatDate = (iso: string | null) => iso
  ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
  : null;

function batchLabel(batch: ApiBatch) {
  const start = formatDate(batch.start_date);
  return [batch.name, start && `starts ${start}`, batch.branches?.name].filter(Boolean).join(" · ");
}

type Result = { kind: "saved"; id: number } | { kind: "failed"; message: string; whatsapp: string };

type FormProps = { courses: ApiCourse[]; batches: ApiBatch[] };

/** Pre-selects the course from ?course=<catalogue slug> or ?program=<website program slug>. */
function AdmissionFormFromUrl(props: FormProps) {
  const params = useSearchParams();
  const course = params.get("course"), program = params.get("program");
  return <AdmissionForm key={`${course}|${program}`} {...props} course={course} program={program} />;
}

function AdmissionForm({ courses, batches, course: courseSlug, program: programSlug }: FormProps & { course?: string | null; program?: string | null }) {
  const contact = useContactInfo();
  // Course choices come from the LMS catalogue; if the API is unreachable, from the website programs.
  const options = courses.length ? courses.map(c => c.title) : programs.map(p => p.title);
  const preselected = courses.find(c => c.slug === courseSlug)?.title
    ?? (() => {
      const program = programs.find(p => p.slug === programSlug);
      if (!program) return undefined;
      return courses.find(c => program.courseSlugs.includes(c.slug))?.title ?? (courses.length ? undefined : program.title);
    })();
  const [courseTitle, setCourseTitle] = useState(preselected ?? options[0] ?? NOT_SURE);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const branches = usePublicBranches();

  const course = courses.find(c => c.title === courseTitle);
  const courseBatches = useMemo(() => batches.filter(b => b.courses.id === course?.id), [batches, course]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (key: string) => String(data.get(key) ?? "").trim();
    const batch = get("batch");
    const branchId = branches.branchIdFor(get("branch"));
    const message = [
      "Admission application (website)",
      `Course: ${get("course")}`,
      branchId && `Preferred branch: ${get("branch")}`,
      batch && batch !== ANY_BATCH && `Preferred batch: ${batch}`,
      `Class / grade: ${get("grade")}`,
      get("school") && `School: ${get("school")}`,
      `Parent / guardian: ${get("guardian")}`,
      get("notes") && `Notes: ${get("notes")}`,
    ].filter(Boolean).join("\n");

    setBusy(true);
    try {
      const enquiry = await publicApi.enquire({
        studentName: get("student"),
        mobile: get("mobile").replace(/[\s-]/g, ""),
        email: get("email") || undefined,
        interestedCourseId: course?.id,
        message,
        source: "WEBSITE_ADMISSION",
        branchId,
      });
      trackEvent("generate_lead", { form: "admission", program: course?.title });
      setResult({ kind: "saved", id: enquiry.id });
    } catch (e) {
      setResult({
        kind: "failed",
        message: e instanceof Error ? e.message : "Could not submit the application.",
        whatsapp: whatsappHref(contact, `Hello EduPulse Academy, I would like to apply for admission.\nStudent: ${get("student")}\nMobile: ${get("mobile")}\n${message}`),
      });
    } finally {
      setBusy(false);
    }
  }

  if (result?.kind === "saved") return <div className="enquiry-form enquiry-done" role="status">
    <CheckCircle2 size={34} className="enquiry-done-icon" aria-hidden="true" />
    <h3>Application received.</h3>
    <p>Thank you. Our admissions team will call the number you gave to discuss the course, batch and fees. Your application number is <strong>#{result.id}</strong>; please mention it when you call or visit.</p>
    <div className="enquiry-done-actions">
      <Button asChild><Link href="/courses">Explore courses <ArrowRight /></Link></Button>
      <Button variant="ghost" onClick={() => setResult(null)}>Submit another application</Button>
    </div>
  </div>;

  return <form className="enquiry-form" onSubmit={submit}>
    <div className="enquiry-row">
      <label>Student&apos;s name<input name="student" required autoComplete="name" minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Class / grade<input name="grade" required maxLength={30} placeholder="e.g. 5, 8 or 12 (PCB)" /></label>
    </div>
    <div className="enquiry-row">
      <label>Parent / guardian name<input name="guardian" required minLength={2} maxLength={160} placeholder="Full name" /></label>
      <label>Mobile number<input name="mobile" required type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title="Enter a valid 10-digit mobile number" placeholder="10-digit mobile" /></label>
    </div>
    <div className="enquiry-row">
      <label><span className="label-text">Email <span>(optional)</span></span><input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" /></label>
      <label><span className="label-text">School <span>(optional)</span></span><input name="school" minLength={2} maxLength={160} placeholder="Current school" /></label>
    </div>
    <div className="enquiry-field"><span id="course-label" className="enquiry-label">Course</span><BrandSelect name="course" aria-labelledby="course-label" options={[...options, NOT_SURE]} defaultValue={courseTitle} onValueChange={setCourseTitle} /></div>
    <BranchField branches={branches} />
    {courseBatches.length > 0 && <div className="enquiry-field"><span id="batch-label" className="enquiry-label">Preferred batch</span><BrandSelect key={course?.id} name="batch" aria-labelledby="batch-label" options={[ANY_BATCH, ...courseBatches.map(batchLabel)]} /></div>}
    <label><span className="label-text">Anything we should know? <span>(optional)</span></span><textarea name="notes" rows={3} maxLength={1000} placeholder="Preferred timings, previous coaching, questions about fees..." /></label>
    {result?.kind === "failed" && <div className="enquiry-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{result.message} You can send the same details on WhatsApp instead: <a href={result.whatsapp} target="_blank" rel="noopener noreferrer">open WhatsApp</a>.</span>
    </div>}
    <Button type="submit" size="lg" className="enquiry-submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" /> Submitting...</> : <>Submit application <Send /></>}</Button>
    <p className="enquiry-hint">Submitting this form does not commit you to anything; it only asks our team to call you.</p>
  </form>;
}

const keepReady = [
  "Student's latest report card or marksheet",
  "Student's Aadhaar card (or birth certificate)",
  "Two recent passport-size photographs",
  "Parent / guardian's mobile number and Aadhaar",
];

const faqsFor = (address: string) => [
  { q: "Is there any fee to apply?", a: "No. Submitting the application only asks our admissions team to call you. Fees are paid only after you choose a course and batch." },
  { q: "We are not sure which course is right. Can we still apply?", a: `Yes. Choose "${NOT_SURE}" in the course list. On the counselling call we look at the student's class, goals and school, and suggest a course.` },
  { q: "How are fees decided?", a: "Fees depend on the course and the batch. Our team shares the fee plan and payment options on the counselling call, before you commit to anything." },
  { q: "What if no batch is open for our course?", a: "Apply anyway. New batches are scheduled through the year, and we call you as soon as the next batch for your course opens." },
  { q: "Can we visit the academy before deciding?", a: `Of course. We are at ${address}. Call or WhatsApp us to fix a convenient time.` },
];

function ProgramPicker({ active }: { active?: string | null }) {
  return <ul className="admissions-programs" aria-label="Choose a program">
    {programs.map(({ slug, title, detail, icon: Icon }) => <li key={slug}>
      <Link href={`/admissions?program=${slug}#apply`} scroll={false} aria-current={active === slug ? "true" : undefined} className="admissions-program">
        <span className="admissions-program-icon"><Icon size={18} /></span>
        <span><strong>{title}</strong><small>{detail}</small></span>
      </Link>
    </li>)}
  </ul>;
}

function ProgramPickerFromUrl() {
  return <ProgramPicker active={useSearchParams().get("program")} />;
}

export default function AdmissionsPage({ courses, batches }: { courses: ApiCourse[]; batches: ApiBatch[] }) {
  const contact = useContactInfo();
  const seats = batches.reduce((sum, b) => sum + (b.seatsAvailable ?? 0), 0);
  const phone = contact.phones[0];
  return <div className="course-page admissions-page">
    <section className="course-hero admissions-hero" aria-labelledby="admissions-title">
      <div className="course-hero-backdrop" aria-hidden="true"><span className="hero-blob hero-blob-a" /><span className="hero-blob hero-blob-b" /><span className="hero-grid" /></div>
      <div className="page-container admissions-hero-inner">
        <div className="admissions-hero-copy">
          <nav className="course-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Admissions</span></nav>
          <p className="course-kicker"><span className="course-kicker-icon"><GraduationCap size={17} /></span>ADMISSIONS OPEN</p>
          <h1 id="admissions-title" className="hero-title course-title admissions-title"><span>Apply for admission</span> <em>in a few minutes.</em></h1>
          <p className="course-intro">Tell us about the student and the course you are interested in. Our admissions team will call you to recommend the right batch and walk you through fees and timings.</p>
          <div className="admissions-hero-actions">
            <Button asChild size="lg"><a href="#apply">Start application <ArrowRight /></a></Button>
            <Button asChild size="lg" variant="outline"><a href={`tel:${phone.tel}`}><PhoneCall /> Talk to admissions</a></Button>
          </div>
        </div>

        <aside className="admissions-pass" aria-label="Admissions at a glance">
          <div className="admissions-pass-head">
            <span className="admissions-pass-badge"><Sparkles size={14} /> Admissions open</span>
            <span className="admissions-pass-place"><MapPin size={14} /> Aligarh</span>
          </div>
          <dl className="admissions-pass-stats">
            <div><dt>Programs</dt><dd>{programs.length}</dd></div>
            {/* With no batch scheduled yet, "0 batches" would read as closed; show the catalogue instead. */}
            {batches.length ? <>
              <div><dt>Open batches</dt><dd>{batches.length}</dd></div>
              <div><dt>Seats left</dt><dd>{seats || "Open"}</dd></div>
            </> : <>
              <div><dt>Courses</dt><dd>{courses.length || programs.length}</dd></div>
              <div><dt>Counselling</dt><dd>Free</dd></div>
            </>}
          </dl>
          <ul className="admissions-pass-list">
            <li><CheckCircle2 size={16} /> No fee to apply, free counselling call</li>
            <li><CheckCircle2 size={16} /> Guidance on the right course and batch</li>
            <li><CheckCircle2 size={16} /> Portal login for classes, material and tests</li>
          </ul>
          <Link href="/pamphlet" className="admissions-pass-link"><FileText size={18} /><span>Sainik School Admission 2027<small>View the pamphlet</small></span><ArrowRight size={16} /></Link>
        </aside>
      </div>
    </section>

    <section className="page-container admissions-pick" aria-labelledby="pick-title">
      <div className="admissions-pick-head">
        <p className="section-kicker">STEP 1 · CHOOSE A PROGRAM</p>
        <h2 id="pick-title">What is the student <span>preparing for?</span></h2>
        <p>Pick a program to pre-fill the form below, or skip this and choose it in the form.</p>
      </div>
      <Suspense fallback={<ProgramPicker />}><ProgramPickerFromUrl /></Suspense>
    </section>

    <section id="apply" className="page-container admissions-main" aria-label="Admission form and open batches">
      <div className="admissions-form-card">
        <span className="admissions-form-glow" aria-hidden="true" />
        <p className="section-kicker">STEP 2 · ADMISSION FORM</p>
        <h2>Student details.</h2>
        <p className="admissions-form-intro">Fields marked optional can be left empty. Everything else helps us place the student in the right batch.</p>
        {/* The prerendered HTML has the form without a pre-selected course; the URL is read once the page loads. */}
        <Suspense fallback={<AdmissionForm courses={courses} batches={batches} />}>
          <AdmissionFormFromUrl courses={courses} batches={batches} />
        </Suspense>
      </div>

      <div className="admissions-side">
        <aside className="admissions-card" aria-labelledby="batches-title">
          <p className="section-kicker">OPEN BATCHES</p>
          <h2 id="batches-title">Batches taking admissions</h2>
          {batches.length ? <ul className="admissions-batch-list">
            {batches.map(batch => <li key={batch.id}>
              <strong>{batch.courses.title}</strong>
              <span>{batch.name}</span>
              <small>
                {formatDate(batch.start_date) && <span><CalendarDays size={14} aria-hidden="true" /> Starts {formatDate(batch.start_date)}</span>}
                {batch.branches && <span><MapPin size={14} aria-hidden="true" /> {batch.branches.name}</span>}
                {batch.seatsAvailable !== null && <span><Users size={14} aria-hidden="true" /> {batch.seatsAvailable > 0 ? `${batch.seatsAvailable} seats left` : "Waiting list"}</span>}
              </small>
            </li>)}
          </ul> : <div className="admissions-empty">
            <span className="admissions-empty-icon"><ClipboardList size={22} aria-hidden="true" /></span>
            <p><strong>New batches are being scheduled.</strong> Apply now and we will call you as soon as the next batch for your course opens.</p>
          </div>}
        </aside>

        <aside className="admissions-card" aria-labelledby="ready-title">
          <p className="section-kicker">FOR THE ADMISSION VISIT</p>
          <h2 id="ready-title">Keep these ready</h2>
          <ul className="admissions-ready">
            {keepReady.map(item => <li key={item}><FileText size={16} aria-hidden="true" /> {item}</li>)}
          </ul>
          <p className="admissions-note">Not needed to apply online, only when you confirm the admission.</p>
        </aside>

        <aside className="admissions-card admissions-help" aria-label="Questions before applying">
          <p>Questions before applying?</p>
          {contact.phones.map(p => <a key={p.tel} href={`tel:${p.tel}`}><PhoneCall size={15} /> {p.display}</a>)}
          <a href={whatsappHref(contact, "Hello EduPulse Academy, I have a question about admissions.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp us</a>
        </aside>
      </div>
    </section>

    <section className="course-band admissions-steps-band" aria-labelledby="steps-title">
      <div className="page-container">
        <div className="course-section-head">
          <p className="section-kicker">HOW ADMISSION WORKS</p>
          <h2 id="steps-title">From application to <span>your first class.</span></h2>
        </div>
        <ol className="admissions-timeline">
          {steps.map(({ title, text, icon: StepIcon }, i) => <li key={title}>
            <span className="courses-step-icon"><StepIcon size={22} /><span>{i + 1}</span></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="page-container admissions-faq" aria-labelledby="faq-title">
      <div className="admissions-faq-head">
        <p className="section-kicker">ADMISSION FAQ</p>
        <h2 id="faq-title">Questions parents <span>often ask.</span></h2>
        <p>Can&apos;t find your answer? Call us on <a href={`tel:${phone.tel}`}>{phone.display}</a>.</p>
      </div>
      <div className="admissions-faq-list">
        {faqsFor(contact.address).map(({ q, a }) => <details key={q}>
          <summary>{q}<ChevronDown size={18} aria-hidden="true" /></summary>
          <p>{a}</p>
        </details>)}
      </div>
    </section>

    <section className="page-container course-cta-wrap admissions-cta" aria-labelledby="admissions-cta-title">
      <div className="course-cta">
        <span className="course-cta-glow" aria-hidden="true" />
        <div>
          <p className="course-cta-kicker">PREFER TO TALK FIRST?</p>
          <h2 id="admissions-cta-title">Speak to our admissions team today.</h2>
          <p>Call or WhatsApp us and we will help you pick the right course and batch for the student.</p>
        </div>
        <div className="course-cta-actions">
          <Button asChild size="lg" className="course-cta-primary"><a href={`tel:${phone.tel}`}><PhoneCall size={16} /> Call {phone.display}</a></Button>
          <Button asChild size="lg" className="admissions-cta-wa"><a href={whatsappHref(contact, "Hello EduPulse Academy, I would like to know about admissions.")} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> WhatsApp</a></Button>
        </div>
      </div>
    </section>
  </div>;
}

