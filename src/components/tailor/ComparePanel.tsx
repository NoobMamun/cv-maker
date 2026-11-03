"use client";
import clsx from "clsx";
import { diffWords } from "diff";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { visible } from "@/lib/templates";
import { ResumeView } from "../resume/ResumeView";
import { Card, CardHeader } from "../ui";
import { ScaledSheet } from "./ScaledSheet";

function Diff({ before, after }: { before: string; after: string }) {
  if (before === after) return <p className="text-sm text-slate-500">Unchanged</p>;
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {diffWords(before, after).map((part, i) => (
        <span
          key={i}
          className={clsx(part.added && "rounded bg-emerald-100 text-emerald-900", part.removed && "rounded bg-red-100 text-red-800 line-through decoration-red-400")}
        >
          {part.value}
        </span>
      ))}
    </p>
  );
}

function Pair({ before, after }: { before: string[]; after: string[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium tracking-wide text-slate-400 uppercase">Original</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          {before.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium tracking-wide text-emerald-600 uppercase">Tailored</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
          {after.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ComparePanel() {
  const { session } = useSession();
  const [mode, setMode] = useState<"changes" | "documents">("changes");
  const { original, tailored, template } = session;
  if (!original || !tailored) return null;

  const origSkills = new Set(original.skills.flatMap((g) => g.items.map((s) => s.toLowerCase())));
  const newSkills = tailored.skills.flatMap((g) => g.items);
  const hiddenItems = [
    ...tailored.experience.filter((e) => e.hidden).map((e) => `${e.role} · ${e.company}`),
    ...tailored.projects.filter((p) => p.hidden).map((p) => p.name),
    ...tailored.education.filter((e) => e.hidden).map((e) => e.degree || e.institution),
    ...tailored.certifications.filter((c) => c.hidden).map((c) => c.name),
    ...tailored.achievements.filter((a) => a.hidden).map((a) => a.text.slice(0, 60)),
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm" role="tablist">
        {(["changes", "documents"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={clsx("rounded-md px-3 py-1.5 font-medium transition-colors", mode === m ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink")}
          >
            {m === "changes" ? "What changed" : "Side by side"}
          </button>
        ))}
      </div>

      {mode === "documents" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-500">Original</p>
            <ScaledSheet>
              <ResumeView resume={original} template={template} />
            </ScaledSheet>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-emerald-700">Tailored</p>
            <ScaledSheet>
              <ResumeView resume={tailored} template={template} />
            </ScaledSheet>
          </div>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader title="Professional summary" subtitle="Green = added, red = removed" />
            <div className="p-5">
              {original.summary || tailored.summary ? <Diff before={original.summary} after={tailored.summary} /> : <p className="text-sm text-slate-500">No summary.</p>}
            </div>
          </Card>

          {tailored.experience.map((e) => {
            const o = original.experience.find((x) => x.id === e.id);
            return (
              <Card key={e.id}>
                <CardHeader title={[e.role, e.company].filter(Boolean).join(" · ")} subtitle={e.hidden ? "Hidden from tailored CV" : o ? undefined : "Added by you"} />
                <div className="p-5">
                  <Pair before={o?.bullets ?? []} after={e.hidden ? [] : e.bullets} />
                </div>
              </Card>
            );
          })}

          {visible(tailored.projects).length ? (
            <Card>
              <CardHeader title="Projects" />
              <div className="space-y-5 p-5">
                {visible(tailored.projects).map((p) => {
                  const o = original.projects.find((x) => x.id === p.id);
                  return (
                    <div key={p.id}>
                      <p className="mb-2 text-sm font-semibold text-ink">{p.name}</p>
                      <Pair before={[o?.description ?? "", ...(o?.bullets ?? [])].filter(Boolean)} after={[p.description, ...p.bullets].filter(Boolean)} />
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Skills" subtitle="Regrouped and prioritised for this role" />
            <div className="flex flex-wrap gap-2 p-5">
              {newSkills.map((s) => (
                <span
                  key={s}
                  className={clsx(
                    "rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset",
                    origSkills.has(s.toLowerCase()) ? "bg-slate-50 text-slate-700 ring-slate-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200",
                  )}
                  title={origSkills.has(s.toLowerCase()) ? "In your original skills list" : "Surfaced from your experience text"}
                >
                  {s}
                </span>
              ))}
            </div>
          </Card>

          {hiddenItems.length ? (
            <Card>
              <CardHeader title="Left out as less relevant" subtitle="Show any of them again from the Edit tab" />
              <ul className="list-disc space-y-1 py-4 pr-5 pl-10 text-sm text-slate-600">
                {hiddenItems.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
