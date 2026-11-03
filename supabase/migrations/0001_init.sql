-- CV Tailor schema. Run in the Supabase SQL editor or with `supabase db push`.
-- Every table is protected by Row Level Security: users can only see and
-- change their own rows. The upload bucket is private and per-user.

create extension if not exists pgcrypto;

-- Uploaded source CVs -------------------------------------------------------
create table if not exists public.cv_documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  file_name       text not null,
  mime_type       text not null,
  storage_path    text,
  extracted_text  text not null,
  created_at      timestamptz not null default now()
);
create index if not exists cv_documents_user_idx on public.cv_documents (user_id, created_at desc);

-- Tailored CV versions (one per job application) -----------------------------
create table if not exists public.tailored_cvs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  document_id      uuid references public.cv_documents (id) on delete set null,
  title            text not null,
  job_title        text,
  company          text,
  job_description  text not null,
  source_text      text not null,
  original_resume  jsonb not null,
  job              jsonb not null,
  analysis         jsonb not null,
  scores           jsonb not null,
  flags            jsonb not null default '[]'::jsonb,
  answers          jsonb not null default '[]'::jsonb,
  resume           jsonb not null,
  template         text not null default 'modern',
  -- Room for future features: 'cv' | 'cover_letter' | 'linkedin' ...
  kind             text not null default 'cv',
  language         text not null default 'en',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists tailored_cvs_user_idx on public.tailored_cvs (user_id, updated_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tailored_cvs_touch on public.tailored_cvs;
create trigger tailored_cvs_touch before update on public.tailored_cvs
  for each row execute function public.touch_updated_at();

-- Row Level Security ------------------------------------------------------------
alter table public.cv_documents enable row level security;
alter table public.tailored_cvs enable row level security;

drop policy if exists "own documents" on public.cv_documents;
create policy "own documents" on public.cv_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tailored cvs" on public.tailored_cvs;
create policy "own tailored cvs" on public.tailored_cvs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private storage bucket: objects live under "<user_id>/..." ----------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-uploads', 'cv-uploads', false, 5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

drop policy if exists "own uploads read" on storage.objects;
create policy "own uploads read" on storage.objects for select
  using (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own uploads write" on storage.objects;
create policy "own uploads write" on storage.objects for insert
  with check (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own uploads delete" on storage.objects;
create policy "own uploads delete" on storage.objects for delete
  using (bucket_id = 'cv-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
