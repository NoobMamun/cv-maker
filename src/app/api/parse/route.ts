import { NextResponse } from "next/server";
import { extractText, MAX_UPLOAD_BYTES } from "@/lib/server/extract";
import { jsonError, toUserError } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { UPLOAD_BUCKET } from "@/lib/supabase/config";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

export async function POST(req: Request) {
  if (!rateLimit(`parse:${clientKey(req)}`, 30).ok) return jsonError("Too many uploads. Please wait a minute.", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected a file upload.");
  }
  const file = form.get("file");
  const purpose = form.get("purpose") === "jd" ? "jd" : "cv";
  const persist = form.get("persist") === "true";
  if (!(file instanceof File)) return jsonError("No file received.");
  if (file.size > MAX_UPLOAD_BYTES) return jsonError("File is larger than 5 MB.", 413);

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { text, kind, pages } = await extractText(bytes, file.name);
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || `upload.${kind}`;

    // Signed-in users who opt in get the original file stored privately so they can manage/delete it later.
    let documentId: string | null = null;
    if (purpose === "cv" && persist) {
      const { supabase, user } = await getUser();
      if (supabase && user) {
        const path = `${user.id}/${crypto.randomUUID()}.${kind}`;
        const up = await supabase.storage.from(UPLOAD_BUCKET).upload(path, bytes, { contentType: MIME[kind], upsert: false });
        const { data, error } = await supabase
          .from("cv_documents")
          .insert({
            user_id: user.id,
            file_name: safeName,
            mime_type: MIME[kind],
            storage_path: up.error ? null : path,
            extracted_text: text,
          })
          .select("id")
          .single();
        if (!error) documentId = data.id;
      }
    }

    return NextResponse.json({ text, kind, pages, fileName: safeName, documentId });
  } catch (err) {
    const { message, status } = toUserError(err);
    return jsonError(message, status);
  }
}
