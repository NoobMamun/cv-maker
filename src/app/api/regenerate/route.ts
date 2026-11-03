import { NextResponse } from "next/server";
import { z } from "zod";
import { AnswerSchema, JobSchema, ResumeSchema } from "@/lib/schema";
import { MAX_TEXT_CHARS } from "@/lib/server/extract";
import { jsonError, limitAI, readJson, toUserError } from "@/lib/server/http";
import { REGENERABLE, regenerateSection } from "@/lib/server/pipeline";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  section: z.enum(REGENERABLE),
  itemId: z.string().max(40).optional(),
  instruction: z.string().max(500).optional(),
  original: ResumeSchema,
  current: ResumeSchema,
  job: JobSchema,
  cvText: z.string().max(MAX_TEXT_CHARS),
  answers: z.array(AnswerSchema).max(10).default([]),
});

export async function POST(req: Request) {
  const limited = limitAI(req);
  if (limited) return limited;
  const parsed = await readJson(req, Body, 600_000);
  if ("error" in parsed) return parsed.error;
  try {
    const result = await regenerateSection({ ...parsed.data, signal: req.signal });
    return NextResponse.json(result);
  } catch (err) {
    const { message, status } = toUserError(err);
    return jsonError(message, status);
  }
}
