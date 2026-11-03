import type { Metadata } from "next";
import { Suspense } from "react";
import { TailorApp } from "@/components/tailor/TailorApp";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tailor your CV · CV Tailor" };

export default async function TailorPage() {
  const { user } = await getUser();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<div className="py-24 text-center text-sm text-slate-500">Loading...</div>}>
        <TailorApp signedIn={Boolean(user)} />
      </Suspense>
    </main>
  );
}
