import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileDown,
  FileUp,
  Gauge,
  PencilLine,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui";

const steps = [
  { icon: FileUp, title: "Upload your CV", text: "PDF or Word. We extract your experience, education, skills, projects and more." },
  { icon: ClipboardList, title: "Add the job description", text: "Paste the posting or upload it. We pull out requirements and ATS keywords." },
  { icon: ScanSearch, title: "Get an honest analysis", text: "Relevance score, matching skills, missing keywords and what to improve." },
  { icon: PencilLine, title: "Review, edit, download", text: "Fine-tune any section, regenerate with AI, then export to PDF or Word." },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Never invents experience",
    text: "Employers, titles, dates, degrees and certifications are locked to your original CV. New skills or figures the AI can't verify are removed or flagged for you.",
  },
  {
    icon: Gauge,
    title: "Transparent scoring",
    text: "An AI fit assessment combined with a measurable keyword-coverage check, shown before and after tailoring.",
  },
  {
    icon: Sparkles,
    title: "Strategic rewriting",
    text: "Relevant achievements move to the top, bullets start with strong action verbs, and the job's terminology is used wherever your experience supports it.",
  },
  {
    icon: BadgeCheck,
    title: "ATS-friendly by design",
    text: "Single-column layouts, standard headings, real text and no tables or graphics, so your CV parses cleanly in applicant tracking systems.",
  },
  {
    icon: FileDown,
    title: "PDF & Word, same look",
    text: "Three professional templates. Downloads match the preview, with consistent spacing and readable typography.",
  },
  {
    icon: PencilLine,
    title: "You stay in control",
    text: "Edit every line, hide irrelevant items, reorder sections, compare against your original, and answer questions to fill real gaps.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--color-brand-100),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
            <Sparkles className="size-3.5" aria-hidden /> AI career assistant
          </span>
          <h1 className="mt-6 animate-rise text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            Your experience, presented for <span className="text-brand-600">the job you want</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl animate-rise text-lg text-slate-600 [animation-delay:80ms]">
            Upload your CV and a job description. CV Tailor maps your real experience to the employer&apos;s requirements and
            produces a targeted, ATS-friendly CV. It never invents anything.
          </p>
          <div className="mt-10 flex animate-rise flex-col items-center justify-center gap-3 [animation-delay:160ms] sm:flex-row">
            <Link href="/tailor" className={buttonClass("primary", "lg")}>
              Analyze &amp; optimise my CV <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#how" className={buttonClass("secondary", "lg")}>
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">No account needed. In guest mode your documents aren&apos;t stored.</p>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Four steps to a targeted CV</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-slate-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Built to get you shortlisted, honestly</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <f.icon className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
                <div>
                  <h3 className="font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Ready for your next application?</h2>
        <p className="mt-3 text-slate-600">It takes about a minute.</p>
        <Link href="/tailor" className={buttonClass("primary", "lg", "mt-8")}>
          Start tailoring <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <footer className="border-t border-slate-200/70 py-8 text-center text-xs text-slate-500">
        CV Tailor · Always review AI-generated content before applying.
      </footer>
    </main>
  );
}
