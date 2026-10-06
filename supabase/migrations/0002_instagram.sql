-- Run this if 0001_inbox.sql was applied before Instagram was added.

create table if not exists public.instagram_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  instagram_user_id text not null,
  username text,
  access_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.instagram_connections enable row level security;
