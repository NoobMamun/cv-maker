import "server-only";
import { z } from "zod";
import { applyTailoring, buildSource, computeScores, type TailoredDraft } from "../guard";
import {
  AnalysisSchema,
  JobSchema,
  ResumeSchema,
  SECTION_KEYS,
  type Analysis,
  type Answer,
  type Job,
  type Resume,
  type ReviewFlag,
  type Scores,
} from "../schema";
import { completeJSON } from "./ai";
import {
  ANALYZE_SYSTEM,
  EXTRACT_CV_SYSTEM,
  EXTRACT_JOB_SYSTEM,
  REGENERATE_SYSTEM,
  TAILOR_SYSTEM,
  analyzeUser,
  regenerateUser,
  tailorUser,
} from "./prompts";

const loose = z.looseObject({});
const DraftSchema = loose as unknown as z.ZodType<TailoredDraft>;

import type { Stage } from "../stages";

export interface PipelineResult {
  original: Resume;
  job: Job;
  analysis: Analysis;
  tailored: Resume;
  flags: ReviewFlag[];
  scores: Scores;
}

/** Give every item a stable id so later AI steps can reference it. */
function withIds(raw: unknown): Resume {
  const r = ResumeSchema.parse(raw ?? {});
  const tag = <T extends { id: string }>(xs: T[], p: string) => xs.map((x, i) => ({ ...x, id: `${p}${i + 1}` }));
  const present = SECTION_KEYS.filter((k) => {
    const v = r[k];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  return {
    ...r,
    experience: tag(r.experience, "exp"),
    education: tag(r.education, "edu"),
    skills: tag(r.skills, "skl"),
    projects: tag(r.projects, "prj"),
    certifications: tag(r.certifications, "crt"),
    achievements: tag(r.achievements, "ach"),
    sectionOrder: present.length ? present : [...SECTION_KEYS],
  };
}

export async function runPipeline(opts: {
  cvText: string;
  jdText: string;
  answers: Answer[];
  original?: Resume;
  job?: Job;
  onStage: (stage: Stage) => void;
  signal?: AbortSignal;
}): Promise<PipelineResult> {
  const { cvText, jdText, answers, onStage, signal } = opts;

  onStage("extract");
  const [original, job] = await Promise.all([
    opts.original
      ? Promise.resolve(opts.original)
      : completeJSON({ system: EXTRACT_CV_SYSTEM, user: `<cv>\n${cvText}\n</cv>`, schema: loose, signal }).then(withIds),
    opts.job
      ? Promise.resolve(opts.job)
      : completeJSON({ system: EXTRACT_JOB_SYSTEM, user: `<job>\n${jdText}\n</job>`, schema: JobSchema, signal }),
  ]);

  if (!original.experience.length && !original.education.length && !original.skills.length) {
    throw new Error("We couldn't identify CV sections (experience, education or skills) in this document. Is it a CV?");
  }

  onStage("analyze");
  const analysis = await completeJSON({
    system: ANALYZE_SYSTEM,
    user: analyzeUser(original, job, answers),
    schema: AnalysisSchema,
    signal,
  });

  onStage("tailor");
  const focus = [
    ...analysis.sectionsToOptimize.map((s) => `${s.section}: ${s.suggestion}`),
    ...analysis.recommendations,
  ].slice(0, 10);
  const draft = await completeJSON({
    system: TAILOR_SYSTEM,
    user: tailorUser(original, job, answers, focus),
    schema: DraftSchema,
    signal,
  });

  onStage("verify");
  const source = buildSource(cvText, answers.map((a) => a.answer));
  const { resume: tailored, flags } = applyTailoring(original, draft, job, source);
  const scores = computeScores(original, tailored, job, analysis.fitScore);

  return { original, job, analysis, tailored, flags, scores };
}

export const REGENERABLE = ["summary", "experience", "skills", "projects", "achievements"] as const;
export type RegenerableSection = (typeof REGENERABLE)[number];

export async function regenerateSection(opts: {
  section: RegenerableSection;
  itemId?: string;
  original: Resume;
  current: Resume;
  job: Job;
  cvText: string;
  answers: Answer[];
  instruction?: string;
  signal?: AbortSignal;
}): Promise<{ resume: Resume; flags: ReviewFlag[] }> {
  const raw = (await completeJSON({
    system: REGENERATE_SYSTEM,
    user: regenerateUser(opts),
    schema: DraftSchema,
    signal: opts.signal,
  })) as TailoredDraft;

  // Only pass the regenerated section to the guard; everything else is left exactly as the user has it.
  const draft: TailoredDraft = {};
  if (opts.section === "summary") draft.summary = raw.summary;
  else if (opts.section === "skills") draft.skills = raw.skills;
  else {
    const items = ((raw[opts.section] as { id: string }[] | undefined) ?? []).filter(
      (x) => !opts.itemId || x.id === opts.itemId,
    );
    (draft as Record<string, unknown>)[opts.section] = items;
  }

  const source = buildSource(opts.cvText, opts.answers.map((a) => a.answer));
  const result = applyTailoring(opts.current, draft, opts.job, source);
  return {
    resume: result.resume,
    flags: result.flags.filter((f) => f.section === opts.section && (!opts.itemId || f.itemId === opts.itemId || f.itemId === "skills")),
  };
}
