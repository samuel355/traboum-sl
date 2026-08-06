-- trabuom-sl's own tables. All access goes through server routes using the
-- Supabase service-role key (already gated by Clerk role checks), so RLS is
-- enabled with NO policies — this locks these tables out of PostgREST's
-- anon/authenticated roles entirely, which is what get-plot's own anon key
-- would otherwise use if these tables were ever queried from a browser.

create extension if not exists pgcrypto;

-- ── Allocations (plot purchases / assignments) ─────────────────────────────
create table if not exists public.tsl_allocations (
  id uuid primary key default gen_random_uuid(),
  plot_table text not null default 'trabuom',
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

alter table public.tsl_allocations enable row level security;

create index if not exists tsl_allocations_plot_idx on public.tsl_allocations (plot_table, plot_id);
create index if not exists tsl_allocations_created_at_idx on public.tsl_allocations (created_at desc);

-- ── Transfers of allocation ─────────────────────────────────────────────────
create table if not exists public.tsl_transfers (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid references public.tsl_allocations (id),
  plot_table text not null default 'trabuom',
  plot_id text not null,
  plot_number text,
  street_name text,
  old_allocation_file_url text,
  new_client_name text not null,
  new_client_email text,
  new_client_phone text not null,
  new_client_address text,
  agent text,
  payment_amount numeric not null,
  payment_method text,
  payment_reference text,
  recorded_by text not null,
  recorded_by_name text,
  recorded_at timestamptz not null default now(),
  pdf_url text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

alter table public.tsl_transfers enable row level security;

create index if not exists tsl_transfers_plot_idx on public.tsl_transfers (plot_table, plot_id);
create index if not exists tsl_transfers_created_at_idx on public.tsl_transfers (created_at desc);

-- ── Audit trail ──────────────────────────────────────────────────────────
-- `metadata` is jsonb on purpose: this app's data model is expected to grow
-- ("this idea is new, we are going to add more records"), and audit entries
-- shouldn't need a migration every time a new action type needs a new field.
create table if not exists public.tsl_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null,
  actor_name text,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.tsl_audit_log enable row level security;

create index if not exists tsl_audit_log_created_at_idx on public.tsl_audit_log (created_at desc);
create index if not exists tsl_audit_log_entity_idx on public.tsl_audit_log (entity_type, entity_id);
