"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseEnabled } from "./config";

export function getBrowserSupabase() {
  if (!supabaseEnabled) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
