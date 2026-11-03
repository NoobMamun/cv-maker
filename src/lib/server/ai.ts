import "server-only";
import OpenAI from "openai";
import type { z } from "zod";

/**
 * Thin provider wrapper. Every AI call in the app goes through `completeJSON`,
 * so swapping providers (or adding one) only touches this file.
 */

let client: OpenAI | null = null;

export class AIConfigError extends Error {}
export class AIResponseError extends Error {}

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AIConfigError("OPENAI_API_KEY is not set on the server.");
  client ??= new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function completeJSON<T extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: T;
  signal?: AbortSignal;
}): Promise<z.infer<T>> {
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const res = await getClient().chat.completions.create(
    {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    },
    { signal: opts.signal },
  );

  const choice = res.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new AIResponseError(
      choice?.finish_reason === "content_filter" ? "The AI declined to process this content." : "The AI returned an empty response.",
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new AIResponseError("The AI returned malformed output. Please try again.");
  }
  const parsed = opts.schema.safeParse(json);
  if (!parsed.success) throw new AIResponseError("The AI response didn't match the expected structure. Please try again.");
  return parsed.data;
}
