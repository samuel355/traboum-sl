-- Add an explicit handoff stage between chief signature and client collection:
-- pending -> signed -> ready_to_collect -> collected.

alter table public.new_trabuom_sl_allocations
  drop constraint if exists new_trabuom_sl_allocations_status_check;

alter table public.new_trabuom_sl_allocations
  add constraint new_trabuom_sl_allocations_status_check
  check (status in ('pending', 'signed', 'ready_to_collect', 'collected'));
