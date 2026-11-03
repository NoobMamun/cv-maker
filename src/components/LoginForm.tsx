"use client";
import { MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Alert, Button, Field, inputClass } from "./ui";

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") ? "That sign-in link is invalid or has expired. Please request a new one." : "");

  const nextParam = params.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="mt-6 flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200">
        <MailCheck className="size-5 shrink-0" aria-hidden />
        <p>
          Check <strong>{email}</strong> for a sign-in link. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label="Email">
        <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {error ? <Alert>{error}</Alert> : null}
      <Button type="submit" loading={busy} className="w-full">
        Email me a sign-in link
      </Button>
      <p className="text-center text-xs text-slate-500">No password needed. Any work in progress in this tab is kept.</p>
    </form>
  );
}
