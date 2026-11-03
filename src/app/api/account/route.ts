import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { UPLOAD_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** "Delete all my data": every uploaded file, document and tailored CV belonging to the user. */
export async function DELETE() {
  const { supabase, user } = await getUser();
  if (!supabase || !user) return jsonError("Sign in required.", 401);

  // Remove storage objects page by page.
  for (;;) {
    const { data: files, error } = await supabase.storage.from(UPLOAD_BUCKET).list(user.id, { limit: 100 });
    if (error) return jsonError("Could not delete stored files.", 500);
    if (!files?.length) break;
    const { error: rmError } = await supabase.storage.from(UPLOAD_BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
    if (rmError) return jsonError("Could not delete stored files.", 500);
    if (files.length < 100) break;
  }

  const a = await supabase.from("tailored_cvs").delete().eq("user_id", user.id);
  const b = await supabase.from("cv_documents").delete().eq("user_id", user.id);
  if (a.error || b.error) return jsonError("Some data could not be deleted. Please try again.", 500);
  return NextResponse.json({ ok: true });
}
