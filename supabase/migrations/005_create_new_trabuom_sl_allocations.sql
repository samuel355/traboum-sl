-- The app now sources plots from `new_trabuom` (see PLOT_TABLE in
-- lib/plots.js) rather than the original `trabuom`. Allocations recorded
-- against plots from that table go into their own table — same shape as
-- migration 002's tsl_allocations, just kept separate so the two plot
-- datasets' purchase records don't mix.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) against the
-- SAME project get-plot already uses.

create table if not exists public.new_trabuom_sl_allocations (
  id uuid primary key default gen_random_uuid(),
  plot_table text not null default 'new_trabuom',
  plot_id text not null,
  plot_number text,
  street_name text,
  client_name text not null,
  client_email text,
  client_phone text not null,
  client_address text,
  agent text,
  amount numeric,
  pdf_url text,
  status text not null default 'completed',
  created_by text not null,
  created_by_name text,
  created_at timestamptz not null default now()
);

-- Same lockdown as tsl_allocations: RLS on with no policies, so this is
-- only reachable via the service-role key from server routes (already
-- gated by Clerk role checks), never PostgREST's anon/authenticated roles.
alter table public.new_trabuom_sl_allocations enable row level security;

create index if not exists new_trabuom_sl_allocations_plot_idx
  on public.new_trabuom_sl_allocations (plot_table, plot_id);
create index if not exists new_trabuom_sl_allocations_created_at_idx
  on public.new_trabuom_sl_allocations (created_at desc);
