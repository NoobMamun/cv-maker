import { z } from "zod";
import { AnswerSchema, JobSchema, ResumeSchema } from "@/lib/schema";
import { AI_NOT_CONFIGURED, aiConfigured } from "@/lib/server/ai";
import { MAX_TEXT_CHARS } from "@/lib/server/extract";
import { jsonError, limitAI, readJson, toUserError } from "@/lib/server/http";
import { runPipeline } from "@/lib/server/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  cvText: z.string().min(80, "Your CV text is too short to analyse.").max(MAX_TEXT_CHARS),
  jdText: z.string().min(80, "The job description is too short. Paste the full posting.").max(MAX_TEXT_CHARS),
  answers: z.array(AnswerSchema).max(10).default([]),
  // When re-running after clarifying questions, reuse earlier extraction to save time and cost.
  original: ResumeSchema.optional(),
  job: JobSchema.optional(),
});

/**
 * Streams newline-delimited JSON events so the UI can show real progress:
 *   {"type":"stage","stage":"extract"|"analyze"|"tailor"|"verify"}
 *   {"type":"result","data":{...}}  or  {"type":"error","error":"..."}
 */
export async function POST(req: Request) {
  if (!aiConfigured()) return jsonError(AI_NOT_CONFIGURED, 503);
  const limited = limitAI(req);
  if (limited) return limited;

  const parsed = await readJson(req, Body, 600_000);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const data = await runPipeline({
          ...body,
          onStage: (stage) => send({ type: "stage", stage }),
          signal: req.signal,
        });
        send({ type: "result", data });
      } catch (err) {
        send({ type: "error", error: toUserError(err).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
