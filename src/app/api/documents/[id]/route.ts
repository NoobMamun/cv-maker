import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/server/http";
import { UPLOAD_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Deletes the uploaded original (file + extracted text). Tailored CVs made from it are kept but unlinked. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return jsonError("Not found.", 404);
  const { supabase, user } = await getUser();
  if (!supabase || !user) return jsonError("Sign in required.", 401);

  const { data: doc } = await supabase.from("cv_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!doc) return jsonError("Not found.", 404);
  if (doc.storage_path) {
    const { error } = await supabase.storage.from(UPLOAD_BUCKET).remove([doc.storage_path]);
    if (error) return jsonError("Could not delete the stored file. Please try again.", 500);
  }
  const { error } = await supabase.from("cv_documents").delete().eq("id", id);
  if (error) return jsonError("Could not delete this document.", 500);
  return NextResponse.json({ ok: true });
}
