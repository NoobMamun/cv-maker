"use client";
import clsx from "clsx";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { STAGES, type Stage } from "@/lib/stages";

export function AnalysisProgress({ stage }: { stage: Stage | null }) {
  const current = stage ? STAGES.findIndex((s) => s.id === stage) : -1;
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pct = Math.round(((Math.max(current, 0) + 0.5) / STAGES.length) * 100);

  return (
    <div className="mx-auto max-w-xl animate-fade-in" aria-live="polite">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-ink">Analysing and optimising your CV</h2>
        <p className="mt-1 text-sm text-slate-500">This usually takes 30-90 seconds · {seconds}s elapsed</p>
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-8 space-y-4">
        {STAGES.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={s.id} className="flex items-start gap-3">
              <span
                className={clsx(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs transition-colors",
                  state === "done" && "bg-emerald-500 text-white",
                  state === "active" && "bg-brand-600 text-white",
                  state === "todo" && "bg-slate-200 text-slate-500",
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
              </span>
              <div>
                <p className={clsx("text-sm font-medium", state === "todo" ? "text-slate-400" : "text-ink")}>{s.label}</p>
                <p className="text-xs text-slate-500">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
