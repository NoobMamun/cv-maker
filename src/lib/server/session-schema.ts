import "server-only";
import { z } from "zod";
import { AnalysisSchema, AnswerSchema, JobSchema, ResumeSchema, ReviewFlagSchema, ScoresSchema } from "../schema";
import { MAX_TEXT_CHARS } from "./extract";

export const SaveSchema = z.object({
  title: z.string().trim().min(1).max(160),
  documentId: z.uuid().nullable().optional(),
  jdText: z.string().max(MAX_TEXT_CHARS),
  cvText: z.string().max(MAX_TEXT_CHARS),
  original: ResumeSchema,
  job: JobSchema,
  analysis: AnalysisSchema,
  scores: ScoresSchema,
  flags: z.array(ReviewFlagSchema).max(200),
  answers: z.array(AnswerSchema).max(10),
  resume: ResumeSchema,
  template: z.enum(["modern", "classic", "minimal"]),
});
export type SavePayload = z.infer<typeof SaveSchema>;

export function toRow(p: SavePayload) {
  return {
    title: p.title,
    document_id: p.documentId ?? null,
    job_title: p.job.title || null,
    company: p.job.company || null,
    job_description: p.jdText,
    source_text: p.cvText,
    original_resume: p.original,
    job: p.job,
    analysis: p.analysis,
    scores: p.scores,
    flags: p.flags,
    answers: p.answers,
    resume: p.resume,
    template: p.template,
  };
}

/** Columns -> client session shape. */
export function fromRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    title: row.title as string,
    documentId: (row.document_id as string | null) ?? null,
    jdText: row.job_description as string,
    cvText: row.source_text as string,
    original: row.original_resume,
    job: row.job,
    analysis: row.analysis,
    scores: row.scores,
    flags: row.flags,
    answers: row.answers,
    resume: row.resume,
    template: row.template,
    updatedAt: row.updated_at as string,
  };
}
