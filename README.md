# CV Tailor

AI-powered CV tailoring. Upload a CV (PDF/DOCX) and a job description. CV Tailor gives you an honest match analysis and a tailored, ATS-friendly CV that you can edit and download as PDF or Word. **It never invents experience.**

## Quick start

```bash
npm install
cp .env.example .env.local   # then set OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

Only `OPENAI_API_KEY` is required. Without Supabase the app runs in **guest mode**: nothing is stored on the server, and work in progress lives in the browser tab's `sessionStorage`.

### Enabling accounts and saved versions (Supabase)

1. Create a Supabase project.
2. Run [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) in the SQL editor. It creates the tables, Row Level Security policies and a private `cv-uploads` storage bucket.
3. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

Signed-in users can save one tailored version per application, reopen them from **My CVs**, delete individual CVs or uploaded files, and **delete all their data** in one click.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Fact-guard, keyword-matching and PDF/DOCX export tests |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## How it works

```
Upload CV ──► /api/parse  (unpdf / mammoth, magic-byte checks, 5 MB limit)
Paste JD  ──►            
                 │
"Analyze" ──► /api/analyze  (streams progress as NDJSON)
                 1. extract   CV → structured JSON   ┐ in parallel
                              JD → requirements      ┘
                 2. analyze   fit score, matches, gaps, clarifying questions
                 3. tailor    rewritten summary/bullets/skills, keyed by item id
                 4. verify    fact guard + deterministic keyword scoring
                 │
Workspace: Analysis · Edit · Compare  +  live preview (3 templates)
                 │
Download ──► PDF (@react-pdf/renderer) / DOCX (docx), generated in the browser
```

### Truthfulness: enforced in code, not just in the prompt

[src/lib/guard.ts](src/lib/guard.ts) merges AI output into the original CV:

- **Locked facts.** Employers, job titles, dates, locations, institutions, degrees, certifications and contact details always come from the parsed original. The AI only returns rewritten text keyed by item id.
- **Skills.** A skill survives only if it appears in the original CV text or in an answer the user gave to a clarifying question. Removed skills are listed for the user.
- **Bullets and summary.** Numbers that aren't in the source (e.g. an invented "45%"), and hard skills from the job description that the CV never mentions, are flagged for review in the Analysis tab and the download panel.
- **Headline.** Rejected if it contains words the CV doesn't support.
- **Missing information.** The analysis asks up to 5 clarifying questions. Answers are treated as user-confirmed facts, and the CV is re-tailored with them.

The **relevance score** is 60% AI fit assessment and 40% deterministic keyword coverage. Coverage is shown for both the original and the tailored CV.

### Project layout

```
src/
  app/                  pages + API routes (Next.js App Router)
    api/parse           file upload → text
    api/analyze         full pipeline (streaming)
    api/regenerate      rewrite one section/item
    api/cvs, documents, account   saved versions, uploads, delete-all (Supabase)
  components/tailor/    workflow UI (input, progress, analysis, editor, compare, preview)
  components/resume/    HTML CV renderer
  lib/
    schema.ts           zod data model shared by everything
    guard.ts, text.ts   fact guard, keyword matching, scoring
    templates.ts        design tokens shared by preview, PDF and DOCX
    export/             PDF + DOCX builders
    server/             AI client, prompts, pipeline, parsing, rate limiting
    supabase/           browser/server clients (optional)
  proxy.ts              Supabase session refresh, /dashboard guard
supabase/migrations/    database schema + RLS
tests/                  node:test suites (run with tsx)
```

## Security and privacy

- API keys are read on the server only. No AI key is ever sent to the browser.
- Uploads are checked by magic bytes, not by MIME type or extension. They are size-limited and parsed in memory.
- In guest mode, documents are never persisted. For signed-in users, files go to a private bucket under `<user_id>/`, and every table has RLS restricting rows to their owner.
- Error messages are sanitised, and CV contents are never logged.
- AI routes have a per-IP rate limit (`AI_RATE_LIMIT_PER_MINUTE`). It is in-memory, so use a shared store (e.g. Upstash Redis) when running multiple instances.
- Content inside `<cv>` / `<job>` tags is treated as data in the prompts, to resist prompt injection inside uploaded documents.

## Extending

The structure is built for the planned features:

- **Multiple versions and application history.** `tailored_cvs` already stores one row per application with the job, analysis and answers.
- **Cover letters, interview prep, LinkedIn optimisation.** Add a prompt in `lib/server/prompts.ts` and a route that reuses the extracted `original` + `job`. `tailored_cvs.kind` is reserved for non-CV documents.
- **Other LLM providers.** All AI calls go through `completeJSON()` in `lib/server/ai.ts`.
- **Bangla.** `tailored_cvs.language` is reserved. The PDF exporter uses the built-in Latin fonts, so register a Bangla-capable font with `Font.register()` in `lib/export/pdf.tsx` and add a language instruction to the prompts. DOCX and the HTML preview already handle Unicode.
