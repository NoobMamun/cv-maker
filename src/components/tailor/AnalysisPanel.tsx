"use client";
import { AlertTriangle, CheckCircle2, HelpCircle, Lightbulb, ListChecks, MessageSquareText, ShieldCheck, Target } from "lucide-react";
import { useState } from "react";
import type { Answer } from "@/lib/schema";
import { SECTION_LABELS } from "@/lib/schema";
import { useSession } from "@/lib/session";
import { Badge, Button, Card, CardHeader, inputClass } from "../ui";

function ScoreRing({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "#059669" : value >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-3xl font-bold text-ink">{value}</div>
          <div className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">Relevance</div>
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-ink">{value}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone} transition-[width] duration-1000`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function AnalysisPanel({ onRetailor, busy }: { onRetailor: (answers: Answer[]) => void; busy: boolean }) {
  const { session } = useSession();
  const { analysis, scores, original, flags, job } = session;
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(session.answers.map((a) => [a.question, a.answer])),
  );
  if (!analysis || !scores || !original) return null;

  const expName = (id: string) => {
    const e = original.experience.find((x) => x.id === id);
    return e ? [e.role, e.company].filter(Boolean).join(" at ") : id;
  };
  const tone = (i: string) => (i === "high" ? "red" : i === "medium" ? "amber" : "slate") as "red" | "amber" | "slate";
  const answered = analysis.clarifyingQuestions.filter((q) => draft[q.question]?.trim());

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ScoreRing value={scores.overall} />
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm font-semibold text-ink">{job?.title ? `Match for ${job.title}${job.company ? ` at ${job.company}` : ""}` : "Overall match"}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{analysis.verdict}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Bar label="AI fit assessment" value={scores.aiFit} tone="bg-brand-500" />
              <Bar label="Keywords: original" value={scores.keywordCoverageBefore} tone="bg-slate-400" />
              <Bar label="Keywords: tailored" value={scores.keywordCoverageAfter} tone="bg-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-400">
              Relevance = 60% AI fit + 40% coverage of {scores.keywordsTotal} job keywords. Coverage only rises where your CV supports a keyword.
            </p>
          </div>
        </div>
      </Card>

      {flags.length ? (
        <Card>
          <CardHeader icon={<ShieldCheck className="size-4" />} title="Fact-check" subtitle="What the guard changed or wants you to verify" />
          <ul className="divide-y divide-slate-100">
            {flags.map((f, i) => (
              <li key={i} className="flex gap-3 px-5 py-3 text-sm">
                <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${f.severity === "removed" ? "text-red-500" : "text-amber-500"}`} aria-hidden />
                <div>
                  <span className="font-medium text-ink">
                    {SECTION_LABELS[f.section]}
                    {f.section === "experience" ? ` · ${expName(f.itemId)}` : ""}:
                  </span>{" "}
                  <span className="text-slate-600">{f.message}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {analysis.clarifyingQuestions.length ? (
        <Card className="ring-brand-200">
          <CardHeader
            icon={<HelpCircle className="size-4" />}
            title="A few questions to strengthen your CV"
            subtitle="Only answer what's true. Answers are treated as facts you've confirmed. Leave blank to skip."
          />
          <div className="space-y-4 p-5">
            {analysis.clarifyingQuestions.map((q) => (
              <div key={q.id || q.question}>
                <label className="block text-sm font-medium text-ink" htmlFor={`q-${q.id}`}>
                  {q.question}
                </label>
                {q.reason ? <p className="mt-0.5 text-xs text-slate-500">{q.reason}</p> : null}
                <textarea
                  id={`q-${q.id}`}
                  rows={2}
                  className={`${inputClass} mt-2`}
                  value={draft[q.question] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [q.question]: e.target.value }))}
                  maxLength={2000}
                />
              </div>
            ))}
            <Button
              onClick={() => onRetailor(answered.map((q) => ({ question: q.question, answer: draft[q.question].trim() })))}
              disabled={!answered.length}
              loading={busy}
            >
              <MessageSquareText className="size-4" aria-hidden /> Apply answers &amp; re-tailor
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader icon={<CheckCircle2 className="size-4" />} title="Matching skills" subtitle={`${analysis.matchingSkills.length} found in your CV`} />
          <div className="flex flex-wrap gap-2 p-5">
            {analysis.matchingSkills.length ? (
              analysis.matchingSkills.map((s) => (
                <Badge key={s} tone="green">
                  {s}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-slate-500">No direct matches found.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Target className="size-4" />} title="Missing or under-represented" subtitle="Add only if you genuinely have them" />
          <ul className="space-y-3 p-5">
            {analysis.missingKeywords.length ? (
              analysis.missingKeywords.map((k) => (
                <li key={k.keyword} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{k.keyword}</span>
                    <Badge tone={tone(k.importance)}>{k.importance}</Badge>
                  </div>
                  {k.advice ? <p className="mt-0.5 text-xs text-slate-500">{k.advice}</p> : null}
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nothing important is missing.</p>
            )}
          </ul>
        </Card>
      </div>

      {analysis.relevantExperience.length ? (
        <Card>
          <CardHeader icon={<ListChecks className="size-4" />} title="Most relevant experience" />
          <ul className="divide-y divide-slate-100">
            {analysis.relevantExperience.map((r) => (
              <li key={r.experienceId} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{expName(r.experienceId)}</p>
                  <p className="text-slate-600">{r.reason}</p>
                </div>
                <Badge tone={r.relevance === "high" ? "green" : r.relevance === "medium" ? "blue" : "slate"}>{r.relevance}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader icon={<Lightbulb className="size-4" />} title="Recommended improvements" />
          <ul className="list-disc space-y-2 py-5 pr-5 pl-10 text-sm text-slate-700">
            {analysis.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader icon={<ListChecks className="size-4" />} title="Sections to optimise" />
          <ul className="space-y-3 p-5 text-sm">
            {analysis.sectionsToOptimize.map((s, i) => (
              <li key={i}>
                <p className="font-medium text-ink capitalize">{s.section}</p>
                <p className="text-slate-600">{s.issue}</p>
                <p className="text-xs text-brand-700">→ {s.suggestion}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
