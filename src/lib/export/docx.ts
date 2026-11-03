"use client";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  type IParagraphOptions,
  type ParagraphChild,
} from "docx";
import type { Resume, SectionKey, TemplateId } from "../schema";
import { contactParts, dateRange, headingText, renderableSections, TEMPLATES, visible, type TemplateTokens } from "../templates";

/**
 * Native Word document (real paragraphs, bullets and headings, no text boxes
 * or tables) so ATS parsers and Word users both get clean, editable text.
 */

const PAGE_W = 11906; // A4 in twips
const MARGIN_X = 880; // 44pt
const MARGIN_Y = 800; // 40pt
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const hex = (c: string) => c.replace("#", "");
const half = (pt: number) => Math.round(pt * 2);

export function buildDocx(r: Resume, template: TemplateId): Document {
  const t: TemplateTokens = TEMPLATES[template];
  const font = t.family === "serif" ? "Times New Roman" : "Arial";
  const body = half(t.bodySize);

  const run = (text: string, o: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) =>
    new TextRun({ text, font, size: o.size ?? body, bold: o.bold, italics: o.italics, color: hex(o.color ?? t.text) });

  const para = (children: ParagraphChild[], o: Partial<IParagraphOptions> = {}) =>
    new Paragraph({ children, spacing: { after: 40, line: 264 }, ...o });

  const bullet = (text: string) => para([run(text)], { bullet: { level: 0 }, spacing: { after: 30, line: 264 } });

  const heading = (k: SectionKey) =>
    new Paragraph({
      children: [run(headingText(k, t), { bold: true, color: t.accent, size: half(t.headingSize) })],
      spacing: { before: 240, after: 100 },
      keepNext: true,
      border: t.headingRule ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(t.accent), space: 2 } } : undefined,
    });

  /** Bold title on the left, muted date right-aligned via a tab stop (ATS-safe, no tables). */
  const titleRow = (left: string, right?: string) =>
    para([run(left, { bold: true }), ...(right ? [run(`\t${right}`, { color: t.muted })] : [])], {
      tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
      keepNext: true,
      spacing: { before: 80, after: 20 },
    });

  const subRow = (text: string) => para([run(text, { italics: true, color: t.muted })], { keepNext: true, spacing: { after: 30 } });

  const sectionBody = (k: SectionKey): Paragraph[] => {
    switch (k) {
      case "summary":
        return [para([run(r.summary)])];
      case "experience":
        return visible(r.experience).flatMap((e) => [
          titleRow([e.role, e.company].filter(Boolean).join(" · "), dateRange(e.startDate, e.endDate)),
          ...(e.location ? [subRow(e.location)] : []),
          ...e.bullets.map(bullet),
        ]);
      case "skills":
        return r.skills
          .filter((g) => g.items.length)
          .map((g) =>
            para([
              ...(r.skills.length > 1 || g.category !== "Skills" ? [run(`${g.category}: `, { bold: true })] : []),
              run(g.items.join(", ")),
            ]),
          );
      case "projects":
        return visible(r.projects).flatMap((p) => [
          titleRow([p.name, p.role].filter(Boolean).join(" · "), p.date),
          ...(p.link ? [subRow(p.link)] : []),
          ...(p.description ? [para([run(p.description)])] : []),
          ...p.bullets.map(bullet),
          ...(p.technologies.length
            ? [para([run("Technologies: ", { italics: true, color: t.muted }), run(p.technologies.join(", "), { color: t.muted })])]
            : []),
        ]);
      case "education":
        return visible(r.education).flatMap((e) => {
          const sub = [e.degree || e.field ? e.institution : "", e.location].filter(Boolean).join(", ");
          return [
            titleRow([e.degree, e.field].filter(Boolean).join(", ") || e.institution, dateRange(e.startDate, e.endDate)),
            ...(sub ? [subRow(sub)] : []),
            ...e.details.map(bullet),
          ];
        });
      case "certifications":
        return visible(r.certifications).map((c) =>
          para([run(c.name, { bold: true }), run(`${c.issuer ? `, ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`)], {
            bullet: { level: 0 },
          }),
        );
      case "achievements":
        return visible(r.achievements).map((a) => bullet(a.text));
    }
  };

  const contacts = contactParts(r);
  const contactChildren: ParagraphChild[] = contacts.flatMap((c, i) => {
    const sep = i > 0 ? [run("  |  ", { color: t.muted })] : [];
    const node = c.href
      ? new ExternalHyperlink({ link: c.href, children: [run(c.text, { color: t.muted })] })
      : run(c.text, { color: t.muted });
    return [...sep, node];
  });
  const align = t.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const children: Paragraph[] = [
    new Paragraph({
      alignment: align,
      children: [run(r.contact.name || "Your Name", { bold: true, size: half(t.nameSize), color: t.align === "center" ? t.text : t.accent })],
      spacing: { after: 40 },
    }),
    ...(r.contact.headline
      ? [new Paragraph({ alignment: align, children: [run(r.contact.headline, { color: t.muted, size: half(t.bodySize + 1.5) })], spacing: { after: 60 } })]
      : []),
    ...(contactChildren.length ? [new Paragraph({ alignment: align, children: contactChildren, spacing: { after: 60 } })] : []),
    ...renderableSections(r).flatMap((k) => [heading(k), ...sectionBody(k)]),
  ];

  return new Document({
    creator: "CV Tailor",
    title: `${r.contact.name || "CV"} - CV`,
    styles: { default: { document: { run: { font, size: body, color: hex(t.text) } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: 16838 },
            margin: { top: MARGIN_Y, bottom: MARGIN_Y, left: MARGIN_X, right: MARGIN_X },
          },
        },
        children,
      },
    ],
  });
}

export async function resumeToDocxBlob(resume: Resume, template: TemplateId): Promise<Blob> {
  return Packer.toBlob(buildDocx(resume, template));
}
