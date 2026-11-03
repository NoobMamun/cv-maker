export type Stage = "extract" | "analyze" | "tailor" | "verify";

export const STAGES: { id: Stage; label: string; detail: string }[] = [
  { id: "extract", label: "Reading your CV and the job description", detail: "Structuring sections, skills and requirements" },
  { id: "analyze", label: "Matching your experience to the role", detail: "Scoring fit, finding gaps and missing keywords" },
  { id: "tailor", label: "Writing your tailored CV", detail: "Rewriting summary and bullets with strong action verbs" },
  { id: "verify", label: "Fact-checking against your original", detail: "Removing anything your CV doesn't support" },
];
