-- Payments through Razorpay, Counter billing, and fixes for duplicate
-- deal-link threads and the brief rate limit.
-- Run after 0004_deal_desk.sql. Safe to run twice.

-- Where a creator's share of an online payment is settled (Razorpay Route linked account).
alter table public.creator_profiles add column if not exists razorpay_account_id text;
alter table public.creator_profiles drop constraint if exists creator_profiles_razorpay_account_check;
alter table public.creator_profiles
  add constraint creator_profiles_razorpay_account_check
  check (razorpay_account_id is null or razorpay_account_id ~ '^acc_[A-Za-z0-9]{14}$');

-- Online payment and Counter's fee on each invoice.
alter table public.invoices add column if not exists payment_link_id text;
alter table public.invoices add column if not exists payment_link_url text;
alter table public.invoices add column if not exists payment_link_amount integer;
alter table public.invoices add column if not exists paid_via text;
alter table public.invoices add column if not exists razorpay_payment_id text;
alter table public.invoices add column if not exists transfer_id text;
alter table public.invoices add column if not exists transfer_paise integer;
alter table public.invoices add column if not exists fee_amount integer not null default 0;
alter table public.invoices add column if not exists fee_status text not null default 'none';
alter table public.invoices add column if not exists fee_charge_id uuid;
alter table public.invoices drop constraint if exists invoices_paid_via_check;
alter table public.invoices
  add constraint invoices_paid_via_check check (paid_via is null or paid_via in ('razorpay', 'manual'));
alter table public.invoices drop constraint if exists invoices_fee_status_check;
alter table public.invoices
  add constraint invoices_fee_status_check
  check (fee_status in ('none', 'deducted', 'due', 'billed', 'paid', 'waived', 'transfer_failed'));

-- Counter's plan per creator. No row means the 5% deal share.
create table if not exists public.billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'deal_share' check (plan in ('deal_share', 'agency')),
  subscription_id text unique,
  subscription_status text,
  current_end timestamptz,
  updated_at timestamptz not null default now()
);

-- A payment link for fees owed on deals paid outside Counter.
create table if not exists public.fee_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  status text not null default 'created' check (status in ('created', 'paid', 'cancelled')),
  payment_link_id text,
  payment_link_url text,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists fee_charges_user_idx on public.fee_charges (user_id, created_at desc);

-- Webhook deliveries already handled. Razorpay retries, so every event is processed once.
create table if not exists public.razorpay_events (
  id text primary key,
  event text not null,
  created_at timestamptz not null default now()
);

-- Replies to a deal-link brief go out as a new Gmail thread. Remember it so
-- Gmail sync folds the brand's answers into the brief instead of listing it twice.
alter table public.conversations add column if not exists gmail_thread_id text;
create index if not exists conversations_gmail_thread_idx
  on public.conversations (user_id, gmail_thread_id) where gmail_thread_id is not null;

-- Brief submissions, for a rate limit shared across server instances. Keys are hashed.
create table if not exists public.brief_hits (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists brief_hits_key_idx on public.brief_hits (key, created_at desc);

alter table public.billing_accounts enable row level security;
alter table public.fee_charges enable row level security;
alter table public.razorpay_events enable row level security;
alter table public.brief_hits enable row level security;

drop policy if exists "billing is private" on public.billing_accounts;
create policy "billing is private"
  on public.billing_accounts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "fee charges are private" on public.fee_charges;
create policy "fee charges are private"
  on public.fee_charges for select to authenticated
  using (auth.uid() = user_id);

-- Plans, charges, webhook events, and brief hits are written only by the server.
grant select on public.billing_accounts to authenticated;
grant select on public.fee_charges to authenticated;

-- Creators edit their invoices, but payment and fee columns are written only by the server.
revoke insert, update, delete on public.invoices from authenticated;
grant insert (user_id, conversation_id, number, brand, bill_to_name, bill_to_email, items, subtotal, gst_rate, gst_amount,
  total, advance_percent, issued_on, due_on, notes, status)
  on public.invoices to authenticated;
grant update (brand, bill_to_name, bill_to_email, due_on, notes, status, paid_amount)
  on public.invoices to authenticated;
