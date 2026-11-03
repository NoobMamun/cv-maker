import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { AI_NOT_CONFIGURED, AIConfigError, AIResponseError } from "./ai";
import { ParseError } from "./extract";
import { clientKey, rateLimit } from "./rate-limit";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Map internal errors to safe user-facing messages. Never leak stack traces or CV contents. */
export function toUserError(err: unknown): { message: string; status: number } {
  if (err instanceof ParseError) return { message: err.message, status: err.status };
  if (err instanceof AIConfigError) return { message: AI_NOT_CONFIGURED, status: 503 };
  if (err instanceof AIResponseError) return { message: err.message, status: 502 };
  const e = err as { status?: number; name?: string; message?: string };
  if (e?.name === "AbortError") return { message: "Request cancelled.", status: 499 };
  if (e?.status === 429) return { message: "The AI provider is busy or the quota is exhausted. Please try again shortly.", status: 429 };
  if (e?.status === 401) return { message: "The server's AI API key was rejected.", status: 503 };
  if (typeof e?.status === "number") return { message: "The AI provider returned an error. Please try again.", status: 502 };
  if (e?.message?.startsWith("We couldn't")) return { message: e.message, status: 422 };
  console.error("[cv-tailor] unexpected error:", e?.name, e?.message?.slice(0, 200));
  return { message: "Something went wrong. Please try again.", status: 500 };
}

export async function readJson<T extends z.ZodType>(req: Request, schema: T, maxBytes = 400_000) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes) return { error: jsonError("Request is too large.", 413) } as const;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: jsonError("Invalid JSON body.") } as const;
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: jsonError(first?.message && !first.message.startsWith("Invalid") ? first.message : "Invalid request.") } as const;
  }
  return { data: parsed.data as z.infer<T> } as const;
}

export function limitAI(req: Request) {
  const r = rateLimit(`ai:${clientKey(req)}`);
  if (!r.ok) return jsonError(`Too many requests. Try again in ${r.retryAfter}s.`, 429);
  return null;
}
