import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in · CV Tailor" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/80">
        <h1 className="text-2xl font-bold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-slate-600">Save tailored CVs for each application and come back to them any time.</p>
        {supabaseEnabled ? (
          <Suspense>
            <LoginForm />
          </Suspense>
        ) : (
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            Accounts aren&apos;t configured on this server. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable them. You can still use CV Tailor in guest mode.
          </p>
        )}
      </div>
    </main>
  );
}
