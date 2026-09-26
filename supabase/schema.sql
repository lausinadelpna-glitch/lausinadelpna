create extension if not exists pgcrypto;

create table if not exists public.aportes (
  id uuid primary key default gen_random_uuid(),
  edition text not null,
  article text not null,
  parent_id uuid null references public.aportes(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 80),
  body text not null check (char_length(body) between 2 and 3000),
  image_path text null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  moderator_note text null,
  is_deleted boolean not null default false
);

create index if not exists aportes_article_status_idx on public.aportes(edition, article, status, created_at);
create index if not exists aportes_parent_idx on public.aportes(parent_id);

alter table public.aportes enable row level security;

drop policy if exists "public reads approved contributions" on public.aportes;
create policy "public reads approved contributions"
on public.aportes for select
to anon, authenticated
using (status = 'approved' and is_deleted = false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('participacion', 'participacion', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
