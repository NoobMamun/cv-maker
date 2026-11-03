import { FileText } from "lucide-react";
import Link from "next/link";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";
import { buttonClass } from "./ui";

export async function SiteHeader() {
  const { user } = supabaseEnabled ? await getUser() : { user: null };
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <FileText className="size-4" aria-hidden />
          </span>
          CV Tailor
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#how" className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-ink sm:block">
            How it works
          </Link>
          {supabaseEnabled ? (
            user ? (
              <>
                <Link href="/dashboard" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-ink">
                  My CVs
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-ink">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:text-ink">
                Sign in
              </Link>
            )
          ) : null}
          <Link href="/tailor" className={buttonClass("primary", "sm")}>
            Tailor my CV
          </Link>
        </nav>
      </div>
    </header>
  );
}
