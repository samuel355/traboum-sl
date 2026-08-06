-- Adds a real Clients directory, turns reservations into persisted records
-- (previously just a status flip + audit-log note), and a sysadmin-editable
-- settings row for the reservation deposit % / payment period.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) against the
-- SAME project get-plot already uses.

-- ── Clients ──────────────────────────────────────────────────────────────
create table if not exists public.new_trabuom_sl_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  address text,
  created_by text not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.new_trabuom_sl_clients enable row level security;
create index if not exists new_trabuom_sl_clients_phone_idx on public.new_trabuom_sl_clients (phone);

-- ── Reservations (now a real table, not just an audit-log entry) ──────────
create table if not exists public.new_trabuom_sl_reservations (
  id uuid primary key default gen_random_uuid(),
  plot_table text not null default 'new_trabuom',
  plot_id text not null,
  plot_number text,
  street_name text,
  client_id uuid references public.new_trabuom_sl_clients (id),
  total_amount numeric not null,
  amount_paid numeric not null default 0,
  deposit_percent numeric,
  balance_due_date date,
  note text,
  -- active = awaiting the balance; converted = later bought outright;
  -- cancelled = reservation dropped. Nothing transitions these yet beyond
  -- 'active' -> 'converted' when /api/allocations later buys the same plot.
  status text not null default 'active',
  created_by text not null,
  created_by_name text,
  created_at timestamptz not null default now()
);

alter table public.new_trabuom_sl_reservations enable row level security;
create index if not exists new_trabuom_sl_reservations_plot_idx
  on public.new_trabuom_sl_reservations (plot_table, plot_id);
create index if not exists new_trabuom_sl_reservations_client_idx
  on public.new_trabuom_sl_reservations (client_id);

-- ── Settings (single row) — deposit % and payment period, sysadmin-editable ─
create table if not exists public.new_trabuom_sl_settings (
  id boolean primary key default true check (id),
  reservation_deposit_percent numeric not null default 40,
  reservation_payment_period_months integer not null default 3,
  updated_by text,
  updated_by_name text,
  updated_at timestamptz not null default now()
);

alter table public.new_trabuom_sl_settings enable row level security;
insert into public.new_trabuom_sl_settings (id) values (true) on conflict (id) do nothing;

-- ── Link existing money-movement tables to a client ────────────────────────
alter table public.new_trabuom_sl_allocations
  add column if not exists client_id uuid references public.new_trabuom_sl_clients (id);
create index if not exists new_trabuom_sl_allocations_client_idx
  on public.new_trabuom_sl_allocations (client_id);

alter table public.tsl_transfers
  add column if not exists client_id uuid references public.new_trabuom_sl_clients (id);
create index if not exists tsl_transfers_client_idx
  on public.tsl_transfers (client_id);
