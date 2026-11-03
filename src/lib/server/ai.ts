import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

/**
 * Thin provider wrapper around the Claude API. Every AI call in the app goes
 * through `completeJSON`, so swapping models or providers only touches this file.
 */

let client: Anthropic | null = null;

export const AI_NOT_CONFIGURED =
  "AI is not configured: the ANTHROPIC_API_KEY environment variable is missing. Locally, add it to .env.local and restart the server. On Vercel, add it under Project Settings → Environment Variables and redeploy.";

export class AIConfigError extends Error {}
export class AIResponseError extends Error {}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AIConfigError(AI_NOT_CONFIGURED);
  client ??= new Anthropic({ apiKey, timeout: 240_000, maxRetries: 2 });
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type Effort = "low" | "medium" | "high";

const JSON_ONLY =
  "\n\nOutput format: respond with exactly one JSON object and nothing else. No prose before or after it, no Markdown code fences.";

/** Pull the JSON object out of the model's text, tolerating stray fences or prose. */
function extractJson(text: string): unknown {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start < 0 || end <= start) throw new AIResponseError("The AI returned malformed output. Please try again.");
    try {
      return JSON.parse(unfenced.slice(start, end + 1));
    } catch {
      throw new AIResponseError("The AI returned malformed output. Please try again.");
    }
  }
}

export async function completeJSON<T extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: T;
  effort?: Effort;
  signal?: AbortSignal;
}): Promise<z.infer<T>> {
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  const res = await getClient().beta.messages.create(
    {
      model,
      max_tokens: 16000,
      system: opts.system + JSON_ONLY,
      messages: [{ role: "user", content: opts.user }],
      // Thinking stays on (adaptive); effort controls depth, cost and latency.
      output_config: { effort: opts.effort ?? "medium" },
      // If a safety classifier declines (e.g. a false positive on CV text), retry on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    },
    { signal: opts.signal },
  );

  if (res.stop_reason === "refusal") throw new AIResponseError("The AI declined to process this content.");
  if (res.stop_reason === "max_tokens") throw new AIResponseError("The AI response was too long. Try a shorter CV or job description.");

  const text = res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  if (!text.trim()) throw new AIResponseError("The AI returned an empty response.");

  const parsed = opts.schema.safeParse(extractJson(text));
  if (!parsed.success) throw new AIResponseError("The AI response didn't match the expected structure. Please try again.");
  return parsed.data;
}

/** Map Claude API errors to user-facing messages; null if not an API error. */
export function describeAIError(err: unknown): { message: string; status: number } | null {
  if (!(err instanceof Anthropic.APIError)) return null;
  if (err instanceof Anthropic.APIUserAbortError) return { message: "Request cancelled.", status: 499 };
  const lowCredit =
    err.status === 402 || err.type === "billing_error" || /credit balance/i.test(err.message);
  if (lowCredit) {
    return {
      message: "The Claude API account behind this site is out of credits. Add credits at platform.claude.com (Plans & Billing), then try again.",
      status: 503,
    };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { message: "The server's Claude API key was rejected. Check ANTHROPIC_API_KEY.", status: 503 };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { message: "Too many AI requests right now. Please wait a minute and try again.", status: 429 };
  }
  if (err.status === 529 || err.type === "overloaded_error") {
    return { message: "Claude is temporarily overloaded. Please try again in a moment.", status: 503 };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { message: "Couldn't reach the AI service. Please try again.", status: 502 };
  }
  return { message: "The AI service returned an error. Please try again.", status: 502 };
}
