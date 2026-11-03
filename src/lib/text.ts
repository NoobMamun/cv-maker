/** Lowercase, unify punctuation and whitespace so term lookups are forgiving. */
export function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[‐-―]/g, "-")
    .replace(/[^\p{L}\p{N}+#./-]+/gu, " ")
    // drop punctuation hanging off token edges ("react." / "-node") but keep "node.js", "c++"
    .replace(/[./-]+(?=\s|$)/g, "")
    .replace(/(^|\s)[./-]+/g, "$1")
    .replace(/\s+/g, " ")
    .trim()} `;
}

const ALIASES: Record<string, string[]> = {
  javascript: ["js"],
  typescript: ["ts"],
  "node.js": ["node", "nodejs"],
  "react.js": ["react", "reactjs"],
  "next.js": ["next", "nextjs"],
  "vue.js": ["vue", "vuejs"],
  postgresql: ["postgres", "psql"],
  kubernetes: ["k8s"],
  "amazon web services": ["aws"],
  "google cloud platform": ["gcp", "google cloud"],
  "continuous integration": ["ci/cd", "ci"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "user experience": ["ux"],
  "user interface": ["ui"],
};

function variants(term: string): string[] {
  const n = normalize(term).trim();
  const out = new Set([n]);
  for (const [canon, alts] of Object.entries(ALIASES)) {
    if (n === canon || alts.includes(n)) {
      out.add(canon);
      alts.forEach((a) => out.add(a));
    }
  }
  // "react.js" ~ "reactjs" ~ "react js"
  out.add(n.replace(/\./g, ""));
  out.add(n.replace(/\./g, " "));
  return [...out].filter(Boolean);
}

/** True when `term` appears in `haystack` (already normalised) as a whole token run. */
export function containsTerm(normalizedHaystack: string, term: string): boolean {
  return variants(term).some((v) => normalizedHaystack.includes(` ${v} `));
}

/** Numbers / metrics in a string ("35%", "$1.2M", "120", "3x"). */
export function extractFigures(text: string): string[] {
  const matches = text.match(/[$€£৳]?\d[\d,]*(?:\.\d+)?\s?(?:%|[kKmMbB]\b|x\b|\+)?/g) ?? [];
  return matches
    .map((m) => m.replace(/[,\s]/g, "").toLowerCase())
    .filter((m) => !/^(19|20)\d{2}$/.test(m)); // years are not metrics
}

export function figureSupported(figure: string, normalizedSource: string, rawSourceFigures: Set<string>): boolean {
  if (rawSourceFigures.has(figure)) return true;
  const digits = figure.replace(/[^\d.]/g, "");
  return digits.length > 0 && normalizedSource.includes(digits);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = normalize(item).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resumeToPlainText(r: {
  contact: { name: string; headline: string };
  summary: string;
  experience: { role: string; company: string; bullets: string[]; hidden?: boolean }[];
  skills: { category: string; items: string[] }[];
  projects: { name: string; description: string; bullets: string[]; technologies: string[]; hidden?: boolean }[];
  education: { degree: string; field: string; institution: string; details: string[]; hidden?: boolean }[];
  certifications: { name: string; issuer: string; hidden?: boolean }[];
  achievements: { text: string; hidden?: boolean }[];
}): string {
  const visible = <T extends { hidden?: boolean }>(xs: T[]) => xs.filter((x) => !x.hidden);
  return [
    r.contact.headline,
    r.summary,
    ...visible(r.experience).flatMap((e) => [e.role, e.company, ...e.bullets]),
    ...r.skills.flatMap((s) => [s.category, ...s.items]),
    ...visible(r.projects).flatMap((p) => [p.name, p.description, ...p.bullets, ...p.technologies]),
    ...visible(r.education).flatMap((e) => [e.degree, e.field, e.institution, ...e.details]),
    ...visible(r.certifications).flatMap((c) => [c.name, c.issuer]),
    ...visible(r.achievements).map((a) => a.text),
  ].join("\n");
}
