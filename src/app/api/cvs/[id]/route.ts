import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, readJson } from "@/lib/server/http";
import { fromRow, SaveSchema, toRow } from "@/lib/server/session-schema";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const Id = z.uuid();

async function auth(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!Id.safeParse(id).success) return { error: jsonError("Not found.", 404) } as const;
  const { supabase, user } = await getUser();
  if (!supabase || !user) return { error: jsonError("Sign in required.", 401) } as const;
  return { id, supabase } as const;
}

export async function GET(_req: Request, ctx: Ctx) {
  const a = await auth(ctx);
  if ("error" in a) return a.error;
  const { data, error } = await a.supabase.from("tailored_cvs").select("*").eq("id", a.id).maybeSingle();
  if (error || !data) return jsonError("Not found.", 404);
  return NextResponse.json(fromRow(data));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const a = await auth(ctx);
  if ("error" in a) return a.error;
  const parsed = await readJson(req, SaveSchema, 1_500_000);
  if ("error" in parsed) return parsed.error;
  const { error, count } = await a.supabase
    .from("tailored_cvs")
    .update(toRow(parsed.data), { count: "exact" })
    .eq("id", a.id);
  if (error || !count) return jsonError("Could not update this CV.", error ? 500 : 404);
  return NextResponse.json({ id: a.id });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const a = await auth(ctx);
  if ("error" in a) return a.error;
  const { error } = await a.supabase.from("tailored_cvs").delete().eq("id", a.id);
  if (error) return jsonError("Could not delete this CV.", 500);
  return NextResponse.json({ ok: true });
}
