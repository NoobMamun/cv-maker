"use client";
import clsx from "clsx";
import { FileDown, FileText } from "lucide-react";
import { useState } from "react";
import { downloadDocx, downloadPdf, fileBaseName } from "@/lib/export/download";
import { useSession } from "@/lib/session";
import { TEMPLATE_LIST } from "@/lib/templates";
import { ResumeView } from "../resume/ResumeView";
import { Alert, Button } from "../ui";
import { ScaledSheet } from "./ScaledSheet";

export function PreviewPanel() {
  const { session, update } = useSession();
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState("");
  const r = session.tailored;
  if (!r) return null;

  const run = async (kind: "pdf" | "docx") => {
    setBusy(kind);
    setError("");
    try {
      const base = fileBaseName(r, session.job?.title);
      if (kind === "pdf") await downloadPdf(r, session.template, base);
      else await downloadDocx(r, session.template, base);
    } catch (e) {
      console.error(e);
      setError(`Could not generate the ${kind.toUpperCase()}. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  const reviewCount = session.flags.filter((f) => f.severity === "review").length;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Template</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="CV template">
          {TEMPLATE_LIST.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={session.template === t.id}
              onClick={() => update({ template: t.id })}
              className={clsx(
                "rounded-xl px-3 py-2 text-left ring-1 transition-all",
                session.template === t.id ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-slate-200 hover:ring-slate-300",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <span className="size-2.5 rounded-full" style={{ background: t.accent }} aria-hidden />
                {t.name}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => run("pdf")} loading={busy === "pdf"} disabled={busy !== null}>
          <FileDown className="size-4" aria-hidden /> Download PDF
        </Button>
        <Button variant="secondary" onClick={() => run("docx")} loading={busy === "docx"} disabled={busy !== null}>
          <FileText className="size-4" aria-hidden /> Download Word
        </Button>
      </div>
      {reviewCount ? (
        <Alert tone="amber">
          {reviewCount} item{reviewCount > 1 ? "s" : ""} flagged for review in the Analysis tab. Please check them before you send this CV.
        </Alert>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}

      <ScaledSheet>
        <ResumeView resume={r} template={session.template} />
      </ScaledSheet>
      <p className="text-center text-xs text-slate-400">Preview shows A4 width. Long CVs continue onto further pages in PDF and Word.</p>
    </div>
  );
}
