"use client";
import type { Resume, TemplateId } from "../schema";

export function fileBaseName(resume: Resume, jobTitle?: string) {
  const clean = (s: string) => s.trim().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  return [clean(resume.contact.name) || "CV", jobTitle ? clean(jobTitle) : ""].filter(Boolean).join("_").slice(0, 80);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Exporters are heavy, so they are loaded only when the user actually downloads.
export async function downloadPdf(resume: Resume, template: TemplateId, base: string) {
  const { resumeToPdfBlob } = await import("./pdf");
  save(await resumeToPdfBlob(resume, template), `${base}.pdf`);
}

export async function downloadDocx(resume: Resume, template: TemplateId, base: string) {
  const { resumeToDocxBlob } = await import("./docx");
  save(await resumeToDocxBlob(resume, template), `${base}.docx`);
}
