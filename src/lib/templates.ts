import type { Resume, SectionKey, TemplateId } from "./schema";
import { SECTION_LABELS } from "./schema";

/**
 * Design tokens shared by the HTML preview, the PDF renderer and the DOCX
 * builder, so all three outputs look the same. All layouts are single-column
 * with real text, standard headings and no tables or graphics, which keeps them ATS-safe.
 */
export interface TemplateTokens {
  id: TemplateId;
  name: string;
  description: string;
  family: "sans" | "serif";
  accent: string;
  text: string;
  muted: string;
  align: "left" | "center";
  headingCase: "upper" | "title";
  headingRule: boolean;
  nameSize: number; // pt
  bodySize: number; // pt
  headingSize: number; // pt
}

export const TEMPLATES: Record<TemplateId, TemplateTokens> = {
  modern: {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif with a navy accent",
    family: "sans",
    accent: "#1d4ed8",
    text: "#111827",
    muted: "#4b5563",
    align: "left",
    headingCase: "upper",
    headingRule: true,
    nameSize: 22,
    bodySize: 10,
    headingSize: 10.5,
  },
  classic: {
    id: "classic",
    name: "Classic",
    description: "Traditional serif, centred header",
    family: "serif",
    accent: "#111827",
    text: "#111827",
    muted: "#374151",
    align: "center",
    headingCase: "upper",
    headingRule: true,
    nameSize: 20,
    bodySize: 10.5,
    headingSize: 11,
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Understated, lots of white space",
    family: "sans",
    accent: "#0f766e",
    text: "#1f2937",
    muted: "#6b7280",
    align: "left",
    headingCase: "title",
    headingRule: false,
    nameSize: 20,
    bodySize: 10,
    headingSize: 11.5,
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export function headingText(key: SectionKey, t: TemplateTokens) {
  const label = SECTION_LABELS[key];
  return t.headingCase === "upper" ? label.toUpperCase() : label;
}

export function dateRange(start: string, end: string) {
  const s = start.trim();
  const e = end.trim();
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export function contactParts(r: Resume): { text: string; href?: string }[] {
  const c = r.contact;
  const parts: { text: string; href?: string }[] = [];
  if (c.email) parts.push({ text: c.email, href: `mailto:${c.email}` });
  if (c.phone) parts.push({ text: c.phone });
  if (c.location) parts.push({ text: c.location });
  for (const l of c.links) {
    if (!l.url) continue;
    const href = /^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`;
    parts.push({ text: l.url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), href });
  }
  return parts;
}

export const visible = <T extends { hidden?: boolean }>(xs: T[]) => xs.filter((x) => !x.hidden);

/** Sections that actually have content to render, in the user's order. */
export function renderableSections(r: Resume): SectionKey[] {
  return r.sectionOrder.filter((k) => {
    switch (k) {
      case "summary":
        return Boolean(r.summary.trim());
      case "skills":
        return r.skills.some((g) => g.items.length);
      default:
        return (r[k] as { hidden?: boolean }[]).some((x) => !x.hidden);
    }
  });
}
