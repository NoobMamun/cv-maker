import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/server/http";
import { SaveSchema, toRow } from "@/lib/server/session-schema";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** List the signed-in user's tailored CVs (metadata only). */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return jsonError("Sign in to see saved CVs.", 401);
  const { data, error } = await supabase
    .from("tailored_cvs")
    .select("id, title, job_title, company, template, scores, updated_at, created_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return jsonError("Could not load your saved CVs.", 500);
  return NextResponse.json({ items: data });
}

export async function POST(req: Request) {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return jsonError("Sign in to save CVs.", 401);
  const parsed = await readJson(req, SaveSchema, 1_500_000);
  if ("error" in parsed) return parsed.error;
  const { data, error } = await supabase
    .from("tailored_cvs")
    .insert({ ...toRow(parsed.data), user_id: user.id })
    .select("id")
    .single();
  if (error) return jsonError("Could not save this CV.", 500);
  return NextResponse.json({ id: data.id });
}
