-- The app now points PLOT_TABLE at `new_trabuom` instead of `trabuom` (see
-- lib/plots.js) — this repeats migration 001's additive owner column on the
-- new table, since it doesn't carry that column over automatically.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) against the
-- SAME project get-plot already uses.

alter table public.new_trabuom
  add column if not exists owner text
  constraint new_trabuom_owner_check check (owner in ('tsl', 'lhc'));

comment on column public.new_trabuom.owner is
  'Which party this plot belongs to: tsl = Trabuom Stool Lands, lhc = GetOnePlot/company. NULL until backfilled.';

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill: not automated — assign ownership once the real split is known,
-- e.g. (confirmed against the live data: plot number lives at
-- properties->>'Plot_No', not a top-level column):
--
--   update public.new_trabuom set owner = 'lhc'
--     where properties->>'Plot_No' in ('A1', 'A2', ...);
--   update public.new_trabuom set owner = 'tsl' where owner is null;
--
-- Per this app's design, this is being done through the dashboard UI
-- (Staff & Roles / plot editing) rather than a one-off SQL backfill — this
-- comment is here for reference only.
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists new_trabuom_owner_idx on public.new_trabuom (owner);
