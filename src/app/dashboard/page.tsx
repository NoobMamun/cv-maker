import { FileText, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAllButton, DeleteButton } from "@/components/DashboardActions";
import { Badge, buttonClass, Card, CardHeader } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My CVs · CV Tailor" };

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default async function Dashboard() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) redirect("/login?next=/dashboard");

  const [cvs, docs] = await Promise.all([
    supabase
      .from("tailored_cvs")
      .select("id, title, job_title, company, template, scores, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("cv_documents").select("id, file_name, created_at").order("created_at", { ascending: false }).limit(200),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">My CVs</h1>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <Link href="/tailor" className={buttonClass("primary")}>
          <Plus className="size-4" aria-hidden /> New tailored CV
        </Link>
      </div>

      <Card>
        <CardHeader title="Tailored versions" subtitle="One per job application" />
        {cvs.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {cvs.data.map((c) => {
              const score = (c.scores as { overall?: number } | null)?.overall;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <Link href={`/tailor?id=${c.id}`} className="min-w-0 flex-1 group">
                    <p className="truncate font-medium text-ink group-hover:text-brand-700">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      Updated {fmt(c.updated_at)} · {c.template} template
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    {typeof score === "number" ? <Badge tone={score >= 75 ? "green" : score >= 50 ? "amber" : "red"}>{score}% match</Badge> : null}
                    <Link href={`/tailor?id=${c.id}`} className={buttonClass("secondary", "sm")}>
                      Open
                    </Link>
                    <DeleteButton url={`/api/cvs/${c.id}`} label={c.title} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No saved CVs yet. Tailor one and click &quot;Save version&quot;.</p>
        )}
      </Card>

      <Card>
        <CardHeader title="Uploaded documents" subtitle="Original CV files stored privately in your account" />
        {docs.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {docs.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{d.file_name}</p>
                    <p className="text-xs text-slate-500">Uploaded {fmt(d.created_at)}</p>
                  </div>
                </div>
                <DeleteButton url={`/api/documents/${d.id}`} label={d.file_name} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No stored documents.</p>
        )}
      </Card>

      <Card className="ring-red-100">
        <CardHeader title="Privacy" subtitle="Permanently delete every uploaded file, document and tailored CV in your account." action={<DeleteAllButton />} />
      </Card>
    </main>
  );
}
