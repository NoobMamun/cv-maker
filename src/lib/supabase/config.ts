export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Accounts & saved versions are optional; without Supabase the app runs in guest mode. */
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const UPLOAD_BUCKET = "cv-uploads";
