-- Lightweight mirror of "who currently has a TSL role" so the Staff & Roles
-- page can list current staff without scanning get-plot's entire shared
-- Clerk user base (which includes ordinary marketplace customers, since
-- trabuom-sl intentionally shares get-plot's Clerk instance). Clerk's
-- publicMetadata.role remains the actual source of truth for access control
-- (checked fresh on every request in app/(dashboard)/layout.jsx) — this
-- table is just an index of "which user ids to look up", refreshed whenever
-- a role is assigned via /dashboard/users.

create table if not exists public.tsl_staff (
  clerk_user_id text primary key,
  role text not null,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

alter table public.tsl_staff enable row level security;
