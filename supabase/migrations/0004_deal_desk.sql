-- Deal desk: deal link briefs, deal status, guardrails + autopilot,
-- creator profiles, the agent's audit log, and invoices.
-- Run after 0001_inbox.sql and 0002_instagram.sql. Safe to run twice.

-- X, WhatsApp, Outlook, and Messenger were removed.
drop table if exists public.channel_connections;

-- Briefs submitted on the public deal link are stored as conversations.
alter table public.conversations drop constraint if exists conversations_source_check;
alter table public.conversations
  add constraint conversations_source_check check (source in ('gmail', 'instagram', 'link'));

alter table public.deals drop constraint if exists deals_reader_check;
alter table public.deals
  add constraint deals_reader_check check (reader in ('rules', 'openai', 'form'));

alter table public.deals add column if not exists category text;
alter table public.deals add column if not exists contact_email text;
alter table public.deals add column if not exists status text not null default 'open';
alter table public.deals add column if not exists agreed_fee integer;
alter table public.deals add column if not exists closed_at timestamptz;
alter table public.deals drop constraint if exists deals_status_check;
alter table public.deals
  add constraint deals_status_check check (status in ('open', 'won', 'lost'));

-- Rate rules gain the guardrails the agent enforces.
alter table public.rate_rules add column if not exists minimum_offer integer not null default 0 check (minimum_offer >= 0);
alter table public.rate_rules add column if not exists max_usage_days integer check (max_usage_days is null or max_usage_days >= 0);
alter table public.rate_rules add column if not exists max_exclusivity_days integer check (max_exclusivity_days is null or max_exclusivity_days >= 0);
alter table public.rate_rules add column if not exists blocked_categories text[] not null default '{}';
alter table public.rate_rules add column if not exists autopilot jsonb not null default '{}'::jsonb;

-- One public profile per creator. The handle is the deal link: /c/<handle>.
create table if not exists public.creator_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_.]{3,30}$'),
  display_name text not null default '',
  bio text not null default '',
  niches text[] not null default '{}',
  starting_price integer check (starting_price is null or starting_price >= 0),
  accepting boolean not null default true,
  legal_name text not null default '',
  gstin text not null default '',
  pan text not null default '',
  upi_id text not null default '',
  address text not null default '',
  updated_at timestamptz not null default now()
);

-- Everything the agent sent, or chose not to send, with the reason.
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  invoice_id uuid,
  kind text not null,
  status text not null check (status in ('sent', 'skipped', 'failed')),
  channel text,
  text text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists agent_actions_user_created on public.agent_actions (user_id, created_at desc);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  number text not null,
  brand text not null default '',
  bill_to_name text not null default '',
  bill_to_email text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null check (subtotal >= 0),
  gst_rate numeric not null default 0 check (gst_rate >= 0 and gst_rate <= 28),
  gst_amount integer not null default 0,
  total integer not null check (total >= 0),
  advance_percent integer not null default 0 check (advance_percent between 0 and 100),
  issued_on date not null default current_date,
  due_on date not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'partially_paid', 'paid', 'void')),
  paid_amount integer not null default 0 check (paid_amount >= 0),
  reminders_sent integer not null default 0,
  last_reminder_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, number)
);

alter table public.creator_profiles enable row level security;
alter table public.agent_actions enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "profiles are private to the owner" on public.creator_profiles;
create policy "profiles are private to the owner"
  on public.creator_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agent log is private" on public.agent_actions;
create policy "agent log is private"
  on public.agent_actions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "invoices are private" on public.invoices;
create policy "invoices are private"
  on public.invoices for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.creator_profiles to authenticated;
grant select on public.agent_actions to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
