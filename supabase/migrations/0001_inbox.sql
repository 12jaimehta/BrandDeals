-- Brand Deal Inbox
-- Run this in the Supabase SQL editor for your project.

create table if not exists public.rate_rules (
  user_id uuid primary key references auth.users (id) on delete cascade,
  usage_included_days integer not null default 30 check (usage_included_days >= 0),
  usage_uplift_per_30_days integer not null default 12500 check (usage_uplift_per_30_days >= 0),
  exclusivity_uplift_per_30_days integer not null default 0 check (exclusivity_uplift_per_30_days >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('gmail', 'instagram')),
  external_id text not null,
  from_name text not null default '',
  from_handle text not null default '',
  subject text not null default '',
  received_at timestamptz not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

create table if not exists public.deals (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_brand_opportunity boolean not null default false,
  detection_reason text not null default '',
  brand text,
  campaign text,
  offer_amount integer,
  offer_approximate boolean not null default false,
  deliverables jsonb not null default '[]'::jsonb,
  deadline date,
  usage_rights_days integer,
  usage_via text,
  exclusivity_days integer,
  payment text,
  notes jsonb not null default '[]'::jsonb,
  reader text not null default 'rules' check (reader in ('rules', 'openai')),
  follow_up_on date,
  followed_up boolean not null default false,
  dismissed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Gmail tokens are server-only. There is no policy for the browser.
create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Instagram tokens are server-only, same as Gmail.
create table if not exists public.instagram_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  instagram_user_id text not null,
  username text,
  access_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.rate_rules enable row level security;
alter table public.conversations enable row level security;
alter table public.deals enable row level security;
alter table public.gmail_connections enable row level security;
alter table public.instagram_connections enable row level security;

create policy "rate rules are private"
  on public.rate_rules
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "conversations are private"
  on public.conversations
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "deals are private"
  on public.deals
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.rate_rules to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.deals to authenticated;
