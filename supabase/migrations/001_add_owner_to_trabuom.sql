-- Splits the existing `trabuom` (Sector 1) table between GetOnePlot ("lhc")
-- and Trabuom Stool Lands ("tsl"), so trabuom-sl can filter to only the
-- plots TSL is responsible for while get-plot's own app keeps working
-- unchanged (this is purely an additive column).
--
-- Run this in the Supabase SQL editor (or `supabase db push` if you use the
-- CLI) against the SAME project get-plot already uses — do not create a new
-- project for this.

alter table public.trabuom
  add column if not exists owner text
  constraint trabuom_owner_check check (owner in ('tsl', 'lhc'));

comment on column public.trabuom.owner is
  'Which party this plot belongs to: tsl = Trabuom Stool Lands, lhc = GetOnePlot/company. NULL until backfilled below.';

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill: this cannot be automated — you (or whoever knows the real plot
-- split) need to identify which plot numbers/ids belong to the company and
-- which belong to the stool lands, then run something like:
--
--   update public.trabuom set owner = 'lhc' where "plotNumber" in ('A1','A2', ...);
--   update public.trabuom set owner = 'tsl' where owner is null;  -- everything else
--
-- (adjust the column name to whatever the real plot-number/identifier
-- column is called in this table — check with `select * from trabuom limit 1`
-- first, since the exact column name wasn't confirmed against the live DB
-- for this migration).
--
-- Until backfilled, trabuom-sl's dashboard will show zero plots (it only
-- queries owner = 'tsl'), which is a safe default — better than guessing.
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists trabuom_owner_idx on public.trabuom (owner);
