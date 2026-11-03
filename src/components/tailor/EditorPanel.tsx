"use client";
import clsx from "clsx";
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { regenerate } from "@/lib/api";
import { SECTION_LABELS, type Resume, type SectionKey } from "@/lib/schema";
import { useSession } from "@/lib/session";
import { uid } from "@/lib/text";
import { Alert, Button, Card, Field, inputClass } from "../ui";

/** Multi-line editor where each line is one bullet. Keeps local text so blank lines survive while typing. */
function LinesArea({ value, onChange, rows = 4, placeholder }: { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const clean = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
  const [text, setText] = useState(value.join("\n"));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    if (clean(text).join("\n") !== value.join("\n")) setText(value.join("\n"));
  }
  return (
    <textarea
      className={`${inputClass} leading-relaxed`}
      rows={Math.max(rows, Math.min(12, text.split("\n").length + 1))}
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        onChange(clean(e.target.value));
      }}
    />
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Field label={label}>
      <input className={inputClass} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function ItemShell({
  title,
  hidden,
  onToggle,
  onRegenerate,
  regenerating,
  onDelete,
  children,
}: {
  title: string;
  hidden: boolean;
  onToggle: () => void;
  onRegenerate?: () => void;
  regenerating?: boolean;
  onDelete?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={clsx("rounded-xl p-4 ring-1 ring-slate-200 transition-opacity", hidden && "opacity-55")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-ink">{title || "Untitled"}</p>
        <div className="flex shrink-0 items-center gap-1">
          {onRegenerate ? (
            <Button variant="ghost" size="sm" onClick={onRegenerate} loading={regenerating} title="Rewrite with AI">
              <Wand2 className="size-3.5" aria-hidden /> Rewrite
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onToggle} title={hidden ? "Show in CV" : "Hide from CV"} aria-label={hidden ? "Show in CV" : "Hide from CV"}>
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          {onDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete item" title="Delete item">
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionCard({
  k,
  index,
  count,
  open,
  onToggle,
  onMove,
  onRewrite,
  rewriting,
  onAdd,
  children,
}: {
  k: SectionKey;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onRewrite?: () => void;
  rewriting?: boolean;
  onAdd?: () => void;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left font-semibold text-ink" aria-expanded={open}>
          <ChevronDown className={clsx("size-4 text-slate-400 transition-transform", !open && "-rotate-90")} aria-hidden />
          {SECTION_LABELS[k]}
        </button>
        <div className="flex items-center gap-1">
          {onRewrite ? (
            <Button variant="ghost" size="sm" onClick={onRewrite} loading={rewriting} title="Rewrite this section with AI">
              <Sparkles className="size-3.5" aria-hidden /> Rewrite
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${SECTION_LABELS[k]} up`}>
            <ArrowUp className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${SECTION_LABELS[k]} down`}>
            <ArrowDown className="size-4" />
          </Button>
        </div>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 p-4">
          {children}
          {onAdd ? (
            <Button variant="secondary" size="sm" onClick={onAdd}>
              <Plus className="size-4" aria-hidden /> Add
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/** Comma-separated list input that commits on blur, so typing commas doesn't fight the parser. */
function ListInput({ label, value, onCommit }: { label: string; value: string[]; onCommit: (v: string[]) => void }) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        defaultValue={value.join(", ")}
        key={value.join("|")}
        onBlur={(e) => onCommit(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      />
    </Field>
  );
}

export function EditorPanel() {
  const { session, update } = useSession();
  const r = session.tailored;
  const [open, setOpen] = useState<Record<string, boolean>>({ contact: false, summary: true, experience: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [instruction, setInstruction] = useState("");
  if (!r || !session.original || !session.job) return null;

  const set = (fn: (r: Resume) => Resume) => update((s) => (s.tailored ? { tailored: fn(s.tailored) } : {}));
  const patchList = <K extends "experience" | "education" | "projects" | "certifications" | "achievements">(
    key: K,
    id: string,
    patch: Partial<Resume[K][number]>,
  ) => set((x) => ({ ...x, [key]: (x[key] as { id: string }[]).map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const removeItem = (key: "experience" | "education" | "projects" | "certifications" | "achievements", id: string) =>
    set((x) => ({ ...x, [key]: (x[key] as { id: string }[]).filter((it) => it.id !== id) }));

  const move = (k: SectionKey, dir: -1 | 1) =>
    set((x) => {
      const order = [...x.sectionOrder];
      const i = order.indexOf(k);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return x;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...x, sectionOrder: order };
    });

  const runRegenerate = async (section: SectionKey, itemId?: string) => {
    const key = `${section}:${itemId ?? ""}`;
    setBusy(key);
    setError("");
    try {
      const res = await regenerate({
        section,
        itemId,
        instruction: instruction.trim() || undefined,
        original: session.original!,
        current: r,
        job: session.job!,
        cvText: session.cvText,
        answers: session.answers,
      });
      update((s) => ({
        tailored: res.resume,
        flags: [
          ...s.flags.filter((f) => !(f.section === section && (!itemId || f.itemId === itemId))),
          ...res.flags,
        ],
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const body = (k: SectionKey): { node: ReactNode; onAdd?: () => void } => {
    switch (k) {
      case "summary":
        return {
          node: (
            <textarea className={`${inputClass} leading-relaxed`} rows={5} value={r.summary} onChange={(e) => set((x) => ({ ...x, summary: e.target.value }))} />
          ),
        };
      case "experience":
        return {
          onAdd: () => set((x) => ({ ...x, experience: [...x.experience, { id: uid("exp"), company: "", role: "", location: "", startDate: "", endDate: "", bullets: [], hidden: false }] })),
          node: r.experience.map((e) => (
            <ItemShell
              key={e.id}
              title={[e.role, e.company].filter(Boolean).join(" · ")}
              hidden={e.hidden}
              onToggle={() => patchList("experience", e.id, { hidden: !e.hidden })}
              onRegenerate={session.original!.experience.some((o) => o.id === e.id) ? () => runRegenerate("experience", e.id) : undefined}
              regenerating={busy === `experience:${e.id}`}
              onDelete={() => removeItem("experience", e.id)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Job title" value={e.role} onChange={(v) => patchList("experience", e.id, { role: v })} />
                <Input label="Company" value={e.company} onChange={(v) => patchList("experience", e.id, { company: v })} />
                <Input label="Start" value={e.startDate} onChange={(v) => patchList("experience", e.id, { startDate: v })} placeholder="Jan 2022" />
                <Input label="End" value={e.endDate} onChange={(v) => patchList("experience", e.id, { endDate: v })} placeholder="Present" />
                <div className="sm:col-span-2">
                  <Input label="Location" value={e.location} onChange={(v) => patchList("experience", e.id, { location: v })} />
                </div>
              </div>
              <div className="mt-3">
                <Field label="Bullet points (one per line)">
                  <LinesArea value={e.bullets} onChange={(v) => patchList("experience", e.id, { bullets: v })} />
                </Field>
              </div>
            </ItemShell>
          )),
        };
      case "skills":
        return {
          onAdd: () => set((x) => ({ ...x, skills: [...x.skills, { id: uid("skl"), category: "Skills", items: [] }] })),
          node: r.skills.map((g) => (
            <div key={g.id} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
              <Input label="Category" value={g.category} onChange={(v) => set((x) => ({ ...x, skills: x.skills.map((s) => (s.id === g.id ? { ...s, category: v } : s)) }))} />
              <ListInput
                label="Skills (comma-separated)"
                value={g.items}
                onCommit={(items) => set((x) => ({ ...x, skills: x.skills.map((s) => (s.id === g.id ? { ...s, items } : s)) }))}
              />
              <Button variant="ghost" size="sm" aria-label="Delete group" onClick={() => set((x) => ({ ...x, skills: x.skills.filter((s) => s.id !== g.id) }))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          )),
        };
      case "projects":
        return {
          onAdd: () => set((x) => ({ ...x, projects: [...x.projects, { id: uid("prj"), name: "", role: "", link: "", date: "", description: "", bullets: [], technologies: [], hidden: false }] })),
          node: r.projects.map((p) => (
            <ItemShell
              key={p.id}
              title={p.name}
              hidden={p.hidden}
              onToggle={() => patchList("projects", p.id, { hidden: !p.hidden })}
              onRegenerate={session.original!.projects.some((o) => o.id === p.id) ? () => runRegenerate("projects", p.id) : undefined}
              regenerating={busy === `projects:${p.id}`}
              onDelete={() => removeItem("projects", p.id)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Name" value={p.name} onChange={(v) => patchList("projects", p.id, { name: v })} />
                <Input label="Role" value={p.role} onChange={(v) => patchList("projects", p.id, { role: v })} />
                <Input label="Link" value={p.link} onChange={(v) => patchList("projects", p.id, { link: v })} />
                <Input label="Date" value={p.date} onChange={(v) => patchList("projects", p.id, { date: v })} />
              </div>
              <div className="mt-3 space-y-3">
                <Field label="Description">
                  <textarea className={inputClass} rows={2} value={p.description} onChange={(e) => patchList("projects", p.id, { description: e.target.value })} />
                </Field>
                <Field label="Bullet points (one per line)">
                  <LinesArea value={p.bullets} onChange={(v) => patchList("projects", p.id, { bullets: v })} rows={3} />
                </Field>
                <ListInput label="Technologies (comma-separated)" value={p.technologies} onCommit={(v) => patchList("projects", p.id, { technologies: v })} />
              </div>
            </ItemShell>
          )),
        };
      case "education":
        return {
          onAdd: () => set((x) => ({ ...x, education: [...x.education, { id: uid("edu"), institution: "", degree: "", field: "", location: "", startDate: "", endDate: "", details: [], hidden: false }] })),
          node: r.education.map((e) => (
            <ItemShell key={e.id} title={[e.degree, e.institution].filter(Boolean).join(" · ")} hidden={e.hidden} onToggle={() => patchList("education", e.id, { hidden: !e.hidden })} onDelete={() => removeItem("education", e.id)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Degree" value={e.degree} onChange={(v) => patchList("education", e.id, { degree: v })} />
                <Input label="Field of study" value={e.field} onChange={(v) => patchList("education", e.id, { field: v })} />
                <Input label="Institution" value={e.institution} onChange={(v) => patchList("education", e.id, { institution: v })} />
                <Input label="Location" value={e.location} onChange={(v) => patchList("education", e.id, { location: v })} />
                <Input label="Start" value={e.startDate} onChange={(v) => patchList("education", e.id, { startDate: v })} />
                <Input label="End" value={e.endDate} onChange={(v) => patchList("education", e.id, { endDate: v })} />
              </div>
              <div className="mt-3">
                <Field label="Details (one per line)">
                  <LinesArea value={e.details} onChange={(v) => patchList("education", e.id, { details: v })} rows={2} />
                </Field>
              </div>
            </ItemShell>
          )),
        };
      case "certifications":
        return {
          onAdd: () => set((x) => ({ ...x, certifications: [...x.certifications, { id: uid("crt"), name: "", issuer: "", date: "", hidden: false }] })),
          node: r.certifications.map((c) => (
            <ItemShell key={c.id} title={c.name} hidden={c.hidden} onToggle={() => patchList("certifications", c.id, { hidden: !c.hidden })} onDelete={() => removeItem("certifications", c.id)}>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Name" value={c.name} onChange={(v) => patchList("certifications", c.id, { name: v })} />
                <Input label="Issuer" value={c.issuer} onChange={(v) => patchList("certifications", c.id, { issuer: v })} />
                <Input label="Date" value={c.date} onChange={(v) => patchList("certifications", c.id, { date: v })} />
              </div>
            </ItemShell>
          )),
        };
      case "achievements":
        return {
          onAdd: () => set((x) => ({ ...x, achievements: [...x.achievements, { id: uid("ach"), text: "", hidden: false }] })),
          node: r.achievements.map((a) => (
            <div key={a.id} className={clsx("flex items-start gap-2", a.hidden && "opacity-55")}>
              <textarea className={inputClass} rows={2} value={a.text} onChange={(e) => patchList("achievements", a.id, { text: e.target.value })} />
              <Button variant="ghost" size="sm" onClick={() => patchList("achievements", a.id, { hidden: !a.hidden })} aria-label={a.hidden ? "Show" : "Hide"}>
                {a.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => removeItem("achievements", a.id)} aria-label="Delete">
                <Trash2 className="size-4" />
              </Button>
            </div>
          )),
        };
    }
  };

  const c = r.contact;
  const setContact = (patch: Partial<Resume["contact"]>) => set((x) => ({ ...x, contact: { ...x.contact, ...patch } }));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Field label="AI rewrite instruction (optional)" hint="Applied when you click Rewrite. Style only: the AI still can't add facts that aren't in your CV.">
          <input
            className={inputClass}
            value={instruction}
            maxLength={500}
            placeholder="e.g. more concise, emphasise leadership, focus on data analysis"
            onChange={(e) => setInstruction(e.target.value)}
          />
        </Field>
      </Card>
      {error ? <Alert>{error}</Alert> : null}

      <Card>
        <button type="button" onClick={() => toggle("contact")} className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-ink" aria-expanded={!!open.contact}>
          <ChevronDown className={clsx("size-4 text-slate-400 transition-transform", !open.contact && "-rotate-90")} aria-hidden />
          Personal information
        </button>
        {open.contact ? (
          <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
            <Input label="Full name" value={c.name} onChange={(v) => setContact({ name: v })} />
            <Input label="Headline" value={c.headline} onChange={(v) => setContact({ headline: v })} />
            <Input label="Email" value={c.email} onChange={(v) => setContact({ email: v })} />
            <Input label="Phone" value={c.phone} onChange={(v) => setContact({ phone: v })} />
            <Input label="Location" value={c.location} onChange={(v) => setContact({ location: v })} />
            <ListInput label="Links (comma-separated)" value={c.links.map((l) => l.url)} onCommit={(v) => setContact({ links: v.map((url) => ({ label: "", url })) })} />
          </div>
        ) : null}
      </Card>

      {r.sectionOrder.map((k, i) => {
        const { node, onAdd } = body(k);
        return (
          <SectionCard
            key={k}
            k={k}
            index={i}
            count={r.sectionOrder.length}
            open={!!open[k]}
            onToggle={() => toggle(k)}
            onMove={(dir) => move(k, dir)}
            onRewrite={k === "summary" || k === "skills" || k === "achievements" ? () => runRegenerate(k) : undefined}
            rewriting={busy === `${k}:`}
            onAdd={onAdd}
          >
            {node}
          </SectionCard>
        );
      })}
    </div>
  );
}
