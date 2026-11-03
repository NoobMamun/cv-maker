"use client";
import type { Analysis, Answer, Job, Resume, ReviewFlag, Scores } from "./schema";
import type { Stage } from "./stages";

export interface PipelineResult {
  original: Resume;
  job: Job;
  analysis: Analysis;
  tailored: Resume;
  flags: ReviewFlag[];
  scores: Scores;
}

async function errorFrom(res: Response): Promise<Error> {
  try {
    const body = await res.json();
    return new Error(body.error || `Request failed (${res.status})`);
  } catch {
    return new Error(`Request failed (${res.status})`);
  }
}

export async function parseFile(file: File, purpose: "cv" | "jd", persist = false) {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  form.set("persist", String(persist));
  const res = await fetch("/api/parse", { method: "POST", body: form });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as { text: string; kind: string; fileName: string; documentId: string | null };
}

/** Calls the streaming analysis endpoint, reporting each pipeline stage as it starts. */
export async function analyze(
  body: { cvText: string; jdText: string; answers: Answer[]; original?: Resume; job?: Job },
  onStage: (s: Stage) => void,
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw await errorFrom(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      const evt = JSON.parse(line);
      if (evt.type === "stage") onStage(evt.stage);
      else if (evt.type === "result") return evt.data as PipelineResult;
      else if (evt.type === "error") throw new Error(evt.error);
    }
    if (done) break;
  }
  throw new Error("The analysis ended unexpectedly. Please try again.");
}

export async function regenerate(body: {
  section: string;
  itemId?: string;
  instruction?: string;
  original: Resume;
  current: Resume;
  job: Job;
  cvText: string;
  answers: Answer[];
}) {
  const res = await fetch("/api/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as { resume: Resume; flags: ReviewFlag[] };
}

export async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as T;
}
