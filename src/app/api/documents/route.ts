import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return jsonError("Sign in required.", 401);
  const { data, error } = await supabase
    .from("cv_documents")
    .select("id, file_name, mime_type, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return jsonError("Could not load your documents.", 500);
  return NextResponse.json({ items: data });
}
