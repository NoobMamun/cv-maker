"use client";
import clsx from "clsx";
import { CheckCircle2, FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX = 5 * 1024 * 1024;

export function FileDrop({
  label,
  hint,
  fileName,
  busy,
  compact,
  acceptTxt,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  fileName?: string;
  busy?: boolean;
  compact?: boolean;
  acceptTxt?: boolean;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState("");

  const pick = (file?: File | null) => {
    if (!file) return;
    setLocalError("");
    const ext = file.name.toLowerCase().split(".").pop();
    const allowed = ["pdf", "docx", ...(acceptTxt ? ["txt"] : [])];
    if (!ext || !allowed.includes(ext)) {
      setLocalError(ext === "doc" ? "Old .doc files aren't supported. Save as .docx or PDF." : `Please choose a ${allowed.join(", ").toUpperCase()} file.`);
      return;
    }
    if (file.size > MAX) {
      setLocalError("File is larger than 5 MB.");
      return;
    }
    onFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files?.[0]);
  };

  if (fileName && !busy) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
        <div className="flex min-w-0 items-center gap-3">
          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-emerald-900">{fileName}</p>
            <p className="text-xs text-emerald-700">Text extracted successfully</p>
          </div>
        </div>
        {onClear ? (
          <button type="button" onClick={onClear} className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100" aria-label="Remove file">
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        disabled={busy}
        className={clsx(
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
          compact ? "gap-1 px-4 py-4" : "gap-2 px-6 py-10",
          over ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-slate-50/50 hover:border-brand-300 hover:bg-brand-50/40",
        )}
      >
        {busy ? (
          <Loader2 className="size-7 animate-spin text-brand-600" aria-hidden />
        ) : compact ? (
          <FileText className="size-5 text-slate-400" aria-hidden />
        ) : (
          <UploadCloud className="size-8 text-brand-500" aria-hidden />
        )}
        <span className={clsx("font-medium text-slate-700", compact ? "text-sm" : "")}>{busy ? "Reading document..." : label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={acceptTxt ? `${ACCEPT},.txt,text/plain` : ACCEPT}
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {localError ? <p className="mt-2 text-sm text-red-600">{localError}</p> : null}
    </div>
  );
}
