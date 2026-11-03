import type { Job, Resume, ReviewFlag, Scores } from "./schema";
import {
  containsTerm,
  dedupe,
  extractFigures,
  figureSupported,
  normalize,
  resumeToPlainText,
} from "./text";

/**
 * Fact guard. The AI is only allowed to *rephrase, select and reorder*.
 * Anything identity-bearing (employers, titles, dates, institutions, degrees,
 * certification names, contact details) is copied from the original CV, and
 * new skills / metrics / JD keywords the source does not support are removed
 * or flagged for the user to verify.
 */

export interface SourceFacts {
  normalized: string;
  figures: Set<string>;
}

export function buildSource(originalText: string, userFacts: string[] = []): SourceFacts {
  const raw = [originalText, ...userFacts].join("\n");
  return { normalized: normalize(raw), figures: new Set(extractFigures(raw)) };
}

/** Shape the AI returns for a tailored CV: only rewritable content, keyed by original ids. */
export interface TailoredDraft {
  headline?: string;
  summary?: string;
  experience?: { id: string; include?: boolean; bullets?: string[] }[];
  skills?: { category: string; items: string[] }[];
  projects?: { id: string; include?: boolean; description?: string; bullets?: string[] }[];
  education?: { id: string; include?: boolean }[];
  certifications?: { id: string; include?: boolean }[];
  achievements?: { id: string; include?: boolean; text?: string }[];
  sectionOrder?: string[];
}

function checkText(
  text: string,
  source: SourceFacts,
  jobTerms: string[],
  flag: (message: string) => void,
) {
  const badFigures = extractFigures(text).filter(
    (f) => !figureSupported(f, source.normalized, source.figures),
  );
  if (badFigures.length) {
    flag(`Contains figure(s) not found in your original CV: ${badFigures.join(", ")}. Verify or edit.`);
  }
  const n = normalize(text);
  const newTerms = jobTerms.filter((t) => containsTerm(n, t) && !containsTerm(source.normalized, t));
  if (newTerms.length) {
    flag(`Mentions ${newTerms.map((t) => `"${t}"`).join(", ")}, which your original CV doesn't mention. Keep only if true.`);
  }
}

/** Items the draft doesn't mention keep their current visibility. */
function hiddenFor(orig: { hidden: boolean }, d?: { include?: boolean }): boolean {
  return d?.include === undefined ? orig.hidden : !d.include;
}

function cleanBullets(bullets: unknown): string[] {
  if (!Array.isArray(bullets)) return [];
  return bullets
    .filter((b): b is string => typeof b === "string")
    .map((b) => b.replace(/^[\s•\-–*]+/, "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function applyTailoring(
  original: Resume,
  draft: TailoredDraft,
  job: Job,
  source: SourceFacts,
): { resume: Resume; flags: ReviewFlag[] } {
  const flags: ReviewFlag[] = [];
  // Hard skills/tools are what can be fabricated; soft JD phrasing ("data visualisation") is legitimate reframing.
  const jobTerms = dedupe(job.hardSkills);

  const flagger = (section: ReviewFlag["section"], itemId: string, severity: ReviewFlag["severity"] = "review") =>
    (message: string) => flags.push({ section, itemId, severity, message });

  // --- Summary & headline ------------------------------------------------
  const summary = (draft.summary ?? original.summary).trim();
  if (draft.summary) checkText(summary, source, jobTerms, flagger("summary", "summary"));

  // The headline is identity-adjacent: only accept it if every word is supported by the source.
  let headline = original.contact.headline;
  if (draft.headline && draft.headline.trim()) {
    const words = normalize(draft.headline).trim().split(" ").filter((w) => w.length > 2);
    const supported = words.every((w) => source.normalized.includes(` ${w} `) || ["and", "the", "with"].includes(w));
    if (supported) headline = draft.headline.trim();
  }

  // --- Experience: facts from original, bullets from AI ----------------
  // Jobs keep the original (reverse-chronological) order; only their bullets change.
  const expDraft = new Map((draft.experience ?? []).map((e) => [e.id, e]));
  const experience = original.experience.map((orig) => {
    const d = expDraft.get(orig.id);
    const bullets = d?.bullets ? cleanBullets(d.bullets) : orig.bullets;
    if (d?.bullets) bullets.forEach((b) => checkText(b, source, jobTerms, flagger("experience", orig.id)));
    return { ...orig, bullets: bullets.length ? bullets : orig.bullets, hidden: hiddenFor(orig, d) };
  });

  // --- Skills: only skills evidenced by the source survive --------------
  const removedSkills: string[] = [];
  let skills = (draft.skills ?? []).map((g, i) => {
    const items = dedupe(Array.isArray(g.items) ? g.items.filter((s) => typeof s === "string") : []).filter((item) => {
      const ok = containsTerm(source.normalized, item);
      if (!ok) removedSkills.push(item);
      return ok;
    });
    return { id: `skills_${i}`, category: (g.category || "Skills").trim(), items };
  });
  skills = skills.filter((g) => g.items.length > 0);
  if (!draft.skills || !skills.length) skills = original.skills;
  if (removedSkills.length) {
    flags.push({
      section: "skills",
      itemId: "skills",
      severity: "removed",
      message: `Removed skills not supported by your original CV: ${removedSkills.join(", ")}. If you do have them, add them manually or answer the clarifying questions.`,
    });
  }

  // --- Projects -----------------------------------------------------------
  const projDraft = new Map((draft.projects ?? []).map((p) => [p.id, p]));
  const projects = original.projects.map((orig) => {
    const d = projDraft.get(orig.id);
    const bullets = d?.bullets ? cleanBullets(d.bullets) : orig.bullets;
    const description = d?.description?.trim() || orig.description;
    if (d?.bullets) bullets.forEach((b) => checkText(b, source, jobTerms, flagger("projects", orig.id)));
    if (d?.description) checkText(description, source, jobTerms, flagger("projects", orig.id));
    return { ...orig, description, bullets, hidden: hiddenFor(orig, d) };
  });

  // --- Education & certifications: never rewritten, only shown/hidden -----
  const include = <T extends { id: string; hidden: boolean }>(list: T[], picks?: { id: string; include?: boolean }[]) => {
    const m = new Map((picks ?? []).map((p) => [p.id, p]));
    return list.map((item) => ({ ...item, hidden: hiddenFor(item, m.get(item.id)) }));
  };
  const education = include(original.education, draft.education);
  const certifications = include(original.certifications, draft.certifications);

  // --- Achievements --------------------------------------------------------
  const achDraft = new Map((draft.achievements ?? []).map((a) => [a.id, a]));
  const achievements = original.achievements.map((orig) => {
    const d = achDraft.get(orig.id);
    const text = d?.text?.trim() || orig.text;
    if (d?.text) checkText(text, source, jobTerms, flagger("achievements", orig.id));
    return { ...orig, text, hidden: hiddenFor(orig, d) };
  });

  // --- Section order ---------------------------------------------------------
  const valid = new Set(original.sectionOrder);
  const proposed = (draft.sectionOrder ?? []).filter((s): s is Resume["sectionOrder"][number] => valid.has(s as never));
  const sectionOrder = dedupe([...proposed, ...original.sectionOrder]) as Resume["sectionOrder"];

  return {
    resume: {
      contact: { ...original.contact, headline },
      summary,
      experience,
      education,
      skills,
      projects,
      certifications,
      achievements,
      sectionOrder,
    },
    flags,
  };
}

/** Deterministic keyword coverage, so the score isn't purely the model's opinion. */
export function computeScores(original: Resume, tailored: Resume, job: Job, aiFit: number): Scores {
  const terms = dedupe([...job.hardSkills, ...job.keywords]).slice(0, 60);
  const before = normalize(resumeToPlainText(original));
  const after = normalize(resumeToPlainText(tailored));
  const pct = (hay: string) =>
    terms.length ? Math.round((terms.filter((t) => containsTerm(hay, t)).length / terms.length) * 100) : 0;
  const keywordCoverageBefore = pct(before);
  const keywordCoverageAfter = pct(after);
  const fit = Math.max(0, Math.min(100, Math.round(aiFit)));
  return {
    overall: terms.length ? Math.round(fit * 0.6 + keywordCoverageAfter * 0.4) : fit,
    aiFit: fit,
    keywordCoverageBefore,
    keywordCoverageAfter,
    keywordsTotal: terms.length,
  };
}
