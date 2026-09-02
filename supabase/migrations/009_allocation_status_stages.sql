-- Allocation `status` now tracks the physical paperwork lifecycle instead of
-- being an unused default: pending -> signed (by chief) -> collected (by
-- client). The chief's signature must happen before collection, enforced in
-- the API layer (see PATCH /api/allocations/[allocationId]).

update public.new_trabuom_sl_allocations set status = 'collected' where status = 'completed';

alter table public.new_trabuom_sl_allocations alter column status set default 'pending';

alter table public.new_trabuom_sl_allocations
  add constraint new_trabuom_sl_allocations_status_check
  check (status in ('pending', 'signed', 'collected'));
