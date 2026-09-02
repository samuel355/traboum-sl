-- Allow individual buyers to become the effective plot owner after a sale,
-- while still preserving the TSL/LHC company defaults for system-managed rows.

alter table public.new_trabuom
  drop constraint if exists new_trabuom_owner_check;

-- Keep the default owner assignment in place for newly created rows while
-- allowing names for bought plots.

alter table public.new_trabuom
  alter column owner set default 'tsl';
