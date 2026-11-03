"use client";
import clsx from "clsx";
import { BarChart3, Check, GitCompareArrows, PencilLine, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { analyze, jsonFetch } from "@/lib/api";
import type { Answer } from "@/lib/schema";
import { initialSession, useSession, type Session } from "@/lib/session";
import type { Stage } from "@/lib/stages";
import { Alert, Button, buttonClass } from "../ui";
import { AnalysisPanel } from "./AnalysisPanel";
import { AnalysisProgress } from "./AnalysisProgress";
import { ComparePanel } from "./ComparePanel";
import { EditorPanel } from "./EditorPanel";
import { InputStep } from "./InputStep";
import { PreviewPanel } from "./PreviewPanel";

type Tab = "analysis" | "edit" | "compare";
const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "edit", label: "Edit", icon: PencilLine },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
];

export function TailorApp({ signedIn }: { signedIn: boolean }) {
  const { session, ready, update, reset } = useSession();
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("analysis");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Open a saved version from the dashboard: /tailor?id=<uuid>
  const savedId = params.get("id");
  useEffect(() => {
    if (!ready || !savedId || !signedIn || session.savedId === savedId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading indicator for a fetch started here
    setLoadingSaved(true);
    jsonFetch<Partial<Session> & { id: string; title: string }>(`/api/cvs/${savedId}`)
      .then((row) => {
        if (cancelled) return;
        update({
          ...initialSession,
          cvText: row.cvText ?? "",
          cvFileName: "Saved CV",
          documentId: row.documentId ?? null,
          jdText: row.jdText ?? "",
          original: row.original ?? null,
          job: row.job ?? null,
          analysis: row.analysis ?? null,
          scores: row.scores ?? null,
          flags: row.flags ?? [],
          answers: row.answers ?? [],
          tailored: (row as { resume?: Session["tailored"] }).resume ?? null,
          template: row.template ?? "modern",
          savedId: row.id,
          title: row.title,
        });
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoadingSaved(false));
    return () => {
      cancelled = true;
    };
  }, [ready, savedId, signedIn, session.savedId, update]);

  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(
    async (answers: Answer[], reuse: boolean) => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setRunning(true);
      setError("");
      setStage(null);
      try {
        const result = await analyze(
          {
            cvText: session.cvText,
            jdText: session.jdText,
            answers,
            ...(reuse && session.original && session.job ? { original: session.original, job: session.job } : {}),
          },
          setStage,
          ctrl.signal,
        );
        update({ ...result, answers });
        setTab("analysis");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setRunning(false);
        setStage(null);
      }
    },
    [session.cvText, session.jdText, session.original, session.job, update],
  );

  const save = async () => {
    if (!session.tailored || !session.original || !session.job || !session.analysis || !session.scores) return;
    setSaving(true);
    setError("");
    const title = session.title || [session.job.title, session.job.company].filter(Boolean).join(" at ") || "Tailored CV";
    const payload = {
      title,
      documentId: session.documentId,
      jdText: session.jdText,
      cvText: session.cvText,
      original: session.original,
      job: session.job,
      analysis: session.analysis,
      scores: session.scores,
      flags: session.flags,
      answers: session.answers,
      resume: session.tailored,
      template: session.template,
    };
    try {
      if (session.savedId) {
        await jsonFetch(`/api/cvs/${session.savedId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        const { id } = await jsonFetch<{ id: string }>("/api/cvs", { method: "POST", body: JSON.stringify(payload) });
        update({ savedId: id, title });
      }
      setSavedAt(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const startOver = () => {
    if (session.tailored && !window.confirm("Start a new CV? Unsaved edits to the current one will be lost.")) return;
    reset();
    setError("");
    if (savedId) window.history.replaceState(null, "", "/tailor");
  };

  if (!ready || loadingSaved) {
    return <div className="py-24 text-center text-sm text-slate-500">Loading...</div>;
  }

  if (running && !session.tailored) {
    return (
      <div className="py-12">
        <AnalysisProgress stage={stage} />
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => abort.current?.abort()}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!session.tailored) {
    return <InputStep signedIn={signedIn} onAnalyze={() => run([], true)} error={error} />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Tailored CV for</p>
          <h1 className="text-2xl font-bold text-ink">
            {session.job?.title || "Target role"}
            {session.job?.company ? <span className="font-normal text-slate-500"> at {session.job.company}</span> : null}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={startOver}>
            <RotateCcw className="size-4" aria-hidden /> New CV
          </Button>
          {signedIn ? (
            <Button variant="secondary" size="sm" onClick={save} loading={saving}>
              {savedAt && !saving ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Save className="size-4" aria-hidden />}
              {session.savedId ? "Save changes" : "Save version"}
            </Button>
          ) : (
            <Link href="/login?next=/tailor" className={buttonClass("secondary", "sm")}>
              <Save className="size-4" aria-hidden /> Sign in to save
            </Link>
          )}
        </div>
      </div>

      {running ? (
        <Alert tone="blue" className="mb-4">
          Re-tailoring with your answers{stage ? ` (${stage}...)` : "..."}
        </Alert>
      ) : null}
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
        <div className="min-w-0">
          <div className="mb-4 flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  tab === t.id ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <t.icon className="size-4" aria-hidden />
                {t.label}
              </button>
            ))}
          </div>
          <div key={tab} className="animate-fade-in">
            {tab === "analysis" ? <AnalysisPanel onRetailor={(a) => run(a, true)} busy={running} /> : null}
            {tab === "edit" ? <EditorPanel /> : null}
            {tab === "compare" ? <ComparePanel /> : null}
          </div>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-4">
          <PreviewPanel />
        </aside>
      </div>
    </div>
  );
}
