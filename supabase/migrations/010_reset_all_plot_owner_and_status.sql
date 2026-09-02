-- Reset all plot ownership and status to the current TSL default for the
-- placeholder sector map. Run this in the Supabase SQL editor or through
-- `supabase db push` against the shared get-plot project.

update public.new_trabuom
set
  owner = 'tsl',
  status = 'Available'
where owner is distinct from 'tsl' or status is distinct from 'Available';

-- Optional: keep the default values aligned for future inserts.
alter table public.new_trabuom
  alter column owner set default 'tsl';

alter table public.new_trabuom
  alter column status set default 'Available';
