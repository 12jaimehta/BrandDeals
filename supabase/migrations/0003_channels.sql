-- Brand Deal Inbox: channel connections for Outlook, X, WhatsApp, Messenger.
-- Gmail keeps public.gmail_connections (0001) and Instagram keeps
-- public.instagram_connections (0002). This table covers the rest so every
-- inbox stays optional: a user row exists only for inboxes they connected.
-- Run this in the Supabase SQL editor for your project.

create table if not exists public.channel_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('outlook', 'x', 'whatsapp', 'messenger')),
  provider_user_id text not null default '',
  username text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.channel_connections enable row level security;

-- Tokens are server-only: no browser policies, same as gmail_connections
-- and instagram_connections. Only the service-role key reads this table.
