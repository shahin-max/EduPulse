import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Megaphone, Trophy, UserRound } from "lucide-react";
import type { ApiFaculty } from "@/lib/api";
import type { HomeResults } from "@/lib/home-content";
import { departmentId, faculty as departments } from "@/lib/team";
import { DEFAULT_FACULTY, DEFAULT_RESULTS_HEADER, formatUpdateDate, type FacultySectionText, type ResultsHeader, type UpdateItem, type UpdatesSection } from "@/lib/site-sections";

/** "Results & achievements": only rendered when the academy has published real results. */
export function ResultsSection({ results, header = DEFAULT_RESULTS_HEADER }: { results: HomeResults; header?: ResultsHeader }) {
  if (!results.achievements.length && !results.highlights.length) return null;
  return <section id="results" className="home-section page-container" aria-labelledby="results-title">
    {header.kicker && <p className="section-kicker">{header.kicker}</p>}
    <h2 id="results-title">{results.heading ?? <>Our students, <span>their milestones.</span></>}</h2>
    {header.intro && <p className="section-intro">{header.intro}</p>}

    {results.highlights.length > 0 && <dl className="results-highlights">
      {results.highlights.map(h => <div key={`${h.value}-${h.label}`}><dt>{h.label}</dt><dd>{h.value}</dd></div>)}
    </dl>}

    {results.achievements.length > 0 && <ul className="achievements-grid">
      {results.achievements.map((a, i) => <li key={`${a.name}-${i}`} className="achievement-card">
        <span className="achievement-icon" aria-hidden="true"><Trophy size={20} /></span>
        <span className="achievement-text">
          <strong>{a.name}</strong>
          <span>{a.achievement}</span>
          {a.tag && <small>{a.tag}</small>}
        </span>
      </li>)}
    </ul>}
  </section>;
}

/**
 * Teachers from their LMS profiles: the ones the academy picked in Admin → Website (in that order),
 * otherwise the first few. The subject departments until profiles are filled in.
 */
export function FacultySection({ teachers, text = DEFAULT_FACULTY }: { teachers: ApiFaculty[]; text?: FacultySectionText }) {
  const picked = text.userIds.map(id => teachers.find(t => t.user_id === id)).filter((t): t is ApiFaculty => !!t);
  const shown = (picked.length ? picked : teachers).slice(0, text.count);
  return <section id="faculty" className="home-section page-container" aria-labelledby="home-faculty-title">
    {text.kicker && <p className="section-kicker">{text.kicker}</p>}
    <h2 id="home-faculty-title">{text.title}{text.titleAccent && <> <span>{text.titleAccent}</span></>}</h2>
    {text.intro && <p className="section-intro">{text.intro}</p>}

    {shown.length > 0
      ? <ul className="home-faculty-grid">
        {shown.map(t => {
          const subjects = [...new Set(t.batch_faculty.map(b => b.subjects.name))];
          return <li key={t.user_id} className="home-teacher">
            <span className="home-teacher-photo">
              {t.users.photo_url
                ? <Image src={t.users.photo_url} alt={`Portrait of ${t.users.full_name}`} fill sizes="88px" />
                : <UserRound size={34} strokeWidth={1.4} aria-hidden="true" />}
            </span>
            <strong>{t.users.full_name}</strong>
            {t.qualification && <small>{t.qualification}</small>}
            {(t.specialization || subjects.length > 0) && <span className="home-teacher-subjects">{t.specialization ?? subjects.join(", ")}</span>}
          </li>;
        })}
      </ul>
      : <ul className="home-departments">
        {departments.map(d => <li key={d.department}>
          <Link href={`/faculty#${departmentId(d.department)}`}><d.icon size={20} aria-hidden="true" /><span>{d.department}<small>{d.subjects.slice(0, 3).join(" · ")}</small></span></Link>
        </li>)}
      </ul>}

    <p className="home-section-link"><Link className="text-link" href="/faculty"><GraduationCap size={17} /> {text.linkLabel} <ArrowRight size={17} /></Link></p>
  </section>;
}

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href);

function UpdateLink({ item }: { item: UpdateItem }) {
  if (!item.linkHref) return null;
  const label = <>{item.linkLabel || "Read more"} <ArrowRight size={16} /></>;
  return isExternal(item.linkHref)
    ? <a className="text-link" href={item.linkHref} target="_blank" rel="noopener noreferrer">{label}</a>
    : <Link className="text-link" href={item.linkHref}>{label}</Link>;
}

/** One update card: optional poster image, badge, date, summary and link. */
export function UpdateCard({ item, headingLevel = 3 }: { item: UpdateItem; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return <li className="update-card" id={item.id}>
    {item.image
      ? <span className="update-image"><Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 360px" /></span>
      : <span className="update-icon" aria-hidden="true"><Megaphone size={22} /></span>}
    <span className="update-body">
      <span className="update-meta">
        {item.badge && <span className="update-badge">{item.badge}</span>}
        {item.date && <time dateTime={item.date}><CalendarDays size={14} aria-hidden="true" /> {formatUpdateDate(item.date)}</time>}
      </span>
      <Heading className="update-title">{item.title}</Heading>
      {item.summary && <p className="update-summary">{item.summary}</p>}
      <UpdateLink item={item} />
    </span>
  </li>;
}

/** "Latest updates": hidden when the academy has no updates. */
export function UpdatesSection({ updates }: { updates: UpdatesSection }) {
  if (!updates.items.length) return null;
  const shown = updates.items.slice(0, updates.homeCount);
  return <section id="updates" className="home-section page-container" aria-labelledby="updates-title">
    {updates.kicker && <p className="section-kicker">{updates.kicker}</p>}
    <h2 id="updates-title">{updates.title}{updates.titleAccent && <> <span>{updates.titleAccent}</span></>}</h2>
    {updates.intro && <p className="section-intro">{updates.intro}</p>}
    <ul className="updates-grid">{shown.map(item => <UpdateCard key={item.id} item={item} />)}</ul>
    {updates.items.length > shown.length && <p className="home-section-link"><Link className="text-link" href="/updates">See all {updates.items.length} updates <ArrowRight size={17} /></Link></p>}
  </section>;
}
