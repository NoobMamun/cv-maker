"use client";
import { ArrowRight, Briefcase, FileUp, Lock } from "lucide-react";
import { useState } from "react";
import { parseFile } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Alert, Button, Card, CardHeader, inputClass } from "../ui";
import { FileDrop } from "./FileDrop";

const MIN_JD = 80;

export function InputStep({ signedIn, onAnalyze, error }: { signedIn: boolean; onAnalyze: () => void; error: string }) {
  const { session, update } = useSession();
  const [cvBusy, setCvBusy] = useState(false);
  const [jdBusy, setJdBusy] = useState(false);
  const [cvError, setCvError] = useState("");
  const [jdError, setJdError] = useState("");
  const [keepCopy, setKeepCopy] = useState(true);

  const uploadCv = async (file: File) => {
    setCvBusy(true);
    setCvError("");
    try {
      const r = await parseFile(file, "cv", signedIn && keepCopy);
      update({ cvText: r.text, cvFileName: r.fileName, documentId: r.documentId, original: null });
    } catch (e) {
      setCvError((e as Error).message);
    } finally {
      setCvBusy(false);
    }
  };

  const uploadJd = async (file: File) => {
    setJdBusy(true);
    setJdError("");
    try {
      const r = await parseFile(file, "jd");
      update({ jdText: r.text, jdFileName: r.fileName, job: null });
    } catch (e) {
      setJdError((e as Error).message);
    } finally {
      setJdBusy(false);
    }
  };

  const jdLen = session.jdText.trim().length;
  const ready = Boolean(session.cvText) && jdLen >= MIN_JD && !cvBusy && !jdBusy;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Tailor your CV to a job</h1>
        <p className="mt-2 text-slate-600">Upload your current CV and the job you&apos;re applying for.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<FileUp className="size-4" />} title="1. Your CV" subtitle="PDF or Word (.docx), up to 5 MB" />
          <div className="space-y-3 p-5">
            <FileDrop
              label="Drop your CV here or click to browse"
              hint="Text-based PDF or .docx"
              fileName={session.cvFileName}
              busy={cvBusy}
              onFile={uploadCv}
              onClear={() => update({ cvText: "", cvFileName: "", documentId: null, original: null })}
            />
            {cvError ? <Alert>{cvError}</Alert> : null}
            {session.cvText ? (
              <details className="group rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-slate-600">Preview extracted text</summary>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-sans text-xs text-slate-600">{session.cvText}</pre>
              </details>
            ) : null}
            {signedIn ? (
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={keepCopy} onChange={(e) => setKeepCopy(e.target.checked)} className="rounded" />
                Keep a private copy of my CV file in my account (you can delete it any time)
              </label>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Lock className="size-3.5" aria-hidden /> Guest mode: your files are processed and not stored.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Briefcase className="size-4" />} title="2. Target job description" subtitle="Paste the full posting, or upload it" />
          <div className="space-y-3 p-5">
            <textarea
              value={session.jdText}
              onChange={(e) => update({ jdText: e.target.value, jdFileName: "", job: null })}
              rows={11}
              placeholder="Paste the complete job description: responsibilities, requirements, nice-to-haves..."
              className={`${inputClass} resize-y leading-relaxed`}
              aria-label="Job description"
            />
            <div className="flex items-center justify-between text-xs">
              <span className={jdLen > 0 && jdLen < MIN_JD ? "text-amber-700" : "text-slate-400"}>
                {jdLen > 0 && jdLen < MIN_JD ? "Paste the full description for a useful analysis" : `${jdLen.toLocaleString()} characters`}
              </span>
              {session.jdFileName ? <span className="text-slate-500">From {session.jdFileName}</span> : null}
            </div>
            <FileDrop compact acceptTxt label="Or upload the job description" hint="PDF, DOCX or TXT" busy={jdBusy} onFile={uploadJd} />
            {jdError ? <Alert>{jdError}</Alert> : null}
          </div>
        </Card>
      </div>

      {error ? <Alert className="mt-6">{error}</Alert> : null}

      <div className="mt-8 flex flex-col items-center gap-2">
        <Button size="lg" onClick={onAnalyze} disabled={!ready}>
          Analyze &amp; Optimize My CV <ArrowRight className="size-4" aria-hidden />
        </Button>
        {!ready ? <p className="text-xs text-slate-500">Upload your CV and add the job description to continue.</p> : null}
      </div>
    </div>
  );
}
