"use client";
import { Document, Link, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Resume, SectionKey, TemplateId } from "../schema";
import { contactParts, dateRange, headingText, renderableSections, TEMPLATES, visible, type TemplateTokens } from "../templates";

/**
 * PDF output with real, selectable text (ATS-readable). Uses the PDF
 * standard fonts (Helvetica / Times), which support Latin scripts. Register a
 * Unicode font with Font.register() before adding Bangla output.
 */

function makeStyles(t: TemplateTokens) {
  const regular = t.family === "serif" ? "Times-Roman" : "Helvetica";
  const bold = t.family === "serif" ? "Times-Bold" : "Helvetica-Bold";
  const italic = t.family === "serif" ? "Times-Italic" : "Helvetica-Oblique";
  return {
    fonts: { regular, bold, italic },
    s: StyleSheet.create({
      page: { fontFamily: regular, fontSize: t.bodySize, color: t.text, lineHeight: 1.35, paddingVertical: 40, paddingHorizontal: 44 },
      name: { fontFamily: bold, fontSize: t.nameSize, color: t.align === "center" ? t.text : t.accent, textAlign: t.align, lineHeight: 1.15 },
      headline: { fontSize: t.bodySize + 1.5, color: t.muted, marginTop: 3, textAlign: t.align },
      contact: { color: t.muted, marginTop: 5, textAlign: t.align },
      link: { color: t.muted, textDecoration: "none" },
      heading: {
        fontFamily: bold,
        fontSize: t.headingSize,
        color: t.accent,
        letterSpacing: t.headingCase === "upper" ? 0.6 : 0,
        marginTop: 12,
        marginBottom: 6,
        paddingBottom: 2,
        borderBottomWidth: t.headingRule ? 0.75 : 0,
        borderBottomColor: t.accent,
      },
      row: { flexDirection: "row", justifyContent: "space-between" },
      bold: { fontFamily: bold },
      right: { color: t.muted, marginLeft: 12 },
      sub: { fontFamily: italic, color: t.muted },
      muted: { color: t.muted },
      bulletRow: { flexDirection: "row", marginTop: 1.5 },
      bulletDot: { width: 10, paddingLeft: 2 },
      bulletText: { flex: 1 },
      block: { marginBottom: 7 },
    }),
  };
}

type Styles = ReturnType<typeof makeStyles>["s"];

function Bullets({ items, s }: { items: string[]; s: Styles }) {
  return (
    <View style={{ marginTop: 2 }}>
      {items.map((b, i) => (
        <View key={i} style={s.bulletRow} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function Row({ left, right, sub, s }: { left: string; right?: string; sub?: string; s: Styles }) {
  return (
    <View>
      <View style={s.row}>
        <Text style={[s.bold, { flex: 1 }]}>{left}</Text>
        {right ? <Text style={s.right}>{right}</Text> : null}
      </View>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

function Section({ k, r, s, t }: { k: SectionKey; r: Resume; s: Styles; t: TemplateTokens }) {
  let body: React.ReactNode = null;
  switch (k) {
    case "summary":
      body = <Text>{r.summary}</Text>;
      break;
    case "experience":
      body = visible(r.experience).map((e) => (
        <View key={e.id} style={s.block}>
          <Row s={s} left={[e.role, e.company].filter(Boolean).join(" · ")} right={dateRange(e.startDate, e.endDate)} sub={e.location || undefined} />
          <Bullets s={s} items={e.bullets} />
        </View>
      ));
      break;
    case "skills":
      body = r.skills
        .filter((g) => g.items.length)
        .map((g) => (
          <Text key={g.id} style={{ marginBottom: 2 }}>
            {r.skills.length > 1 || g.category !== "Skills" ? <Text style={s.bold}>{g.category}: </Text> : null}
            {g.items.join(", ")}
          </Text>
        ));
      break;
    case "projects":
      body = visible(r.projects).map((p) => (
        <View key={p.id} style={s.block}>
          <Row s={s} left={[p.name, p.role].filter(Boolean).join(" · ")} right={p.date} sub={p.link || undefined} />
          {p.description ? <Text style={{ marginTop: 2 }}>{p.description}</Text> : null}
          <Bullets s={s} items={p.bullets} />
          {p.technologies.length ? <Text style={[s.muted, { marginTop: 2 }]}>Technologies: {p.technologies.join(", ")}</Text> : null}
        </View>
      ));
      break;
    case "education":
      body = visible(r.education).map((e) => (
        <View key={e.id} style={{ marginBottom: 6 }}>
          <Row
            s={s}
            left={[e.degree, e.field].filter(Boolean).join(", ") || e.institution}
            right={dateRange(e.startDate, e.endDate)}
            sub={[e.degree || e.field ? e.institution : "", e.location].filter(Boolean).join(", ") || undefined}
          />
          <Bullets s={s} items={e.details} />
        </View>
      ));
      break;
    case "certifications":
      body = visible(r.certifications).map((c) => (
        <View key={c.id} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>
            <Text style={s.bold}>{c.name}</Text>
            {c.issuer ? `, ${c.issuer}` : ""}
            {c.date ? ` (${c.date})` : ""}
          </Text>
        </View>
      ));
      break;
    case "achievements":
      body = <Bullets s={s} items={visible(r.achievements).map((a) => a.text)} />;
      break;
  }
  return (
    <View>
      {/* minPresenceAhead keeps a heading from being stranded at the bottom of a page */}
      <Text style={s.heading} minPresenceAhead={40}>
        {headingText(k, t)}
      </Text>
      {body}
    </View>
  );
}

export function ResumePdf({ resume, template }: { resume: Resume; template: TemplateId }) {
  const t = TEMPLATES[template];
  const { s } = makeStyles(t);
  const contacts = contactParts(resume);
  return (
    <Document title={`${resume.contact.name || "CV"} - CV`} author={resume.contact.name} creator="CV Tailor" producer="CV Tailor">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{resume.contact.name || "Your Name"}</Text>
        {resume.contact.headline ? <Text style={s.headline}>{resume.contact.headline}</Text> : null}
        {contacts.length ? (
          <Text style={s.contact}>
            {contacts.map((c, i) => (
              <Text key={i}>
                {i > 0 ? "  |  " : ""}
                {c.href ? (
                  <Link src={c.href} style={s.link}>
                    {c.text}
                  </Link>
                ) : (
                  c.text
                )}
              </Text>
            ))}
          </Text>
        ) : null}
        {renderableSections(resume).map((k) => (
          <Section key={k} k={k} r={resume} s={s} t={t} />
        ))}
      </Page>
    </Document>
  );
}

export async function resumeToPdfBlob(resume: Resume, template: TemplateId): Promise<Blob> {
  return pdf(<ResumePdf resume={resume} template={template} />).toBlob();
}
