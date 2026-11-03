import type { CSSProperties, ReactNode } from "react";
import type { Resume, SectionKey, TemplateId } from "@/lib/schema";
import { contactParts, dateRange, headingText, renderableSections, TEMPLATES, visible } from "@/lib/templates";

/** HTML rendering of a CV on an A4 sheet. Mirrors lib/export/pdf.tsx and docx.ts. */
export function ResumeView({ resume, template }: { resume: Resume; template: TemplateId }) {
  const t = TEMPLATES[template];
  const pt = (n: number) => `${n}pt`;
  const font =
    t.family === "serif"
      ? '"Times New Roman", Times, Georgia, serif'
      : 'Helvetica, Arial, "Segoe UI", sans-serif';

  const page: CSSProperties = {
    fontFamily: font,
    color: t.text,
    fontSize: pt(t.bodySize),
    lineHeight: 1.35,
    padding: "40pt 44pt",
    background: "white",
    width: "210mm",
    minHeight: "297mm",
    boxSizing: "border-box",
  };

  const Heading = ({ k }: { k: SectionKey }) => (
    <h2
      style={{
        fontSize: pt(t.headingSize),
        fontWeight: 700,
        color: t.accent,
        letterSpacing: t.headingCase === "upper" ? "0.06em" : undefined,
        borderBottom: t.headingRule ? `0.75pt solid ${t.accent}` : undefined,
        paddingBottom: "2pt",
        margin: "12pt 0 6pt",
      }}
    >
      {headingText(k, t)}
    </h2>
  );

  const Row = ({ left, right, sub }: { left: ReactNode; right?: string; sub?: string }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12pt" }}>
        <div style={{ fontWeight: 700 }}>{left}</div>
        {right ? <div style={{ color: t.muted, whiteSpace: "nowrap" }}>{right}</div> : null}
      </div>
      {sub ? <div style={{ color: t.muted, fontStyle: "italic" }}>{sub}</div> : null}
    </div>
  );

  const Bullets = ({ items }: { items: string[] }) =>
    items.length ? (
      <ul style={{ margin: "3pt 0 0", paddingLeft: "14pt", listStyle: "disc" }}>
        {items.map((b, i) => (
          <li key={i} style={{ marginBottom: "1.5pt" }}>
            {b}
          </li>
        ))}
      </ul>
    ) : null;

  const section = (k: SectionKey) => {
    switch (k) {
      case "summary":
        return <p style={{ margin: 0 }}>{resume.summary}</p>;
      case "experience":
        return visible(resume.experience).map((e) => (
          <div key={e.id} style={{ marginBottom: "8pt" }}>
            <Row
              left={[e.role, e.company].filter(Boolean).join(" · ")}
              right={dateRange(e.startDate, e.endDate)}
              sub={e.location || undefined}
            />
            <Bullets items={e.bullets} />
          </div>
        ));
      case "skills":
        return resume.skills
          .filter((g) => g.items.length)
          .map((g) => (
            <div key={g.id} style={{ marginBottom: "2pt" }}>
              {resume.skills.length > 1 || g.category !== "Skills" ? <strong>{g.category}: </strong> : null}
              {g.items.join(", ")}
            </div>
          ));
      case "projects":
        return visible(resume.projects).map((p) => (
          <div key={p.id} style={{ marginBottom: "7pt" }}>
            <Row left={[p.name, p.role].filter(Boolean).join(" · ")} right={p.date} sub={p.link || undefined} />
            {p.description ? <div style={{ marginTop: "2pt" }}>{p.description}</div> : null}
            <Bullets items={p.bullets} />
            {p.technologies.length ? (
              <div style={{ color: t.muted, marginTop: "2pt" }}>
                <em>Technologies:</em> {p.technologies.join(", ")}
              </div>
            ) : null}
          </div>
        ));
      case "education":
        return visible(resume.education).map((e) => (
          <div key={e.id} style={{ marginBottom: "6pt" }}>
            <Row
              left={[e.degree, e.field].filter(Boolean).join(", ") || e.institution}
              right={dateRange(e.startDate, e.endDate)}
              sub={[e.degree || e.field ? e.institution : "", e.location].filter(Boolean).join(", ") || undefined}
            />
            <Bullets items={e.details} />
          </div>
        ));
      case "certifications":
        return (
          <ul style={{ margin: 0, paddingLeft: "14pt", listStyle: "disc" }}>
            {visible(resume.certifications).map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                {c.issuer ? `, ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </li>
            ))}
          </ul>
        );
      case "achievements":
        return <Bullets items={visible(resume.achievements).map((a) => a.text)} />;
    }
  };

  const contacts = contactParts(resume);

  return (
    <article style={page} className="resume-sheet">
      <header style={{ textAlign: t.align }}>
        <h1 style={{ fontSize: pt(t.nameSize), fontWeight: 700, margin: 0, color: t.align === "center" ? t.text : t.accent, lineHeight: 1.15 }}>
          {resume.contact.name || "Your Name"}
        </h1>
        {resume.contact.headline ? (
          <div style={{ fontSize: pt(t.bodySize + 1.5), color: t.muted, marginTop: "3pt" }}>{resume.contact.headline}</div>
        ) : null}
        {contacts.length ? (
          <div style={{ color: t.muted, marginTop: "5pt" }}>
            {contacts.map((c, i) => (
              <span key={i}>
                {i > 0 ? "  |  " : ""}
                {c.href ? (
                  <a href={c.href} style={{ color: "inherit", textDecoration: "none" }}>
                    {c.text}
                  </a>
                ) : (
                  c.text
                )}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      {renderableSections(resume).map((k) => (
        <section key={k}>
          <Heading k={k} />
          {section(k)}
        </section>
      ))}
    </article>
  );
}
