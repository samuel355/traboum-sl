-- Persist the identifiers printed on allocation documents so they can be
-- searched and displayed from the allocations page.
alter table if exists public.tsl_allocations
  add column if not exists reference_number text,
  add column if not exists file_number text;

alter table if exists public.new_trabuom_sl_allocations
  add column if not exists reference_number text,
  add column if not exists file_number text;

update public.tsl_allocations
set
  reference_number = coalesce(reference_number, 'TSL-' || upper(right(id::text, 8))),
  file_number = coalesce(
    file_number,
    'TSL-' || upper(regexp_replace(coalesce(plot_number, 'PLOT'), '\s+', '', 'g')) || '-' ||
      extract(year from created_at)::text
  )
where reference_number is null or file_number is null;

update public.new_trabuom_sl_allocations
set
  reference_number = coalesce(reference_number, 'TSL-' || upper(right(id::text, 8))),
  file_number = coalesce(
    file_number,
    'TSL-' || upper(regexp_replace(coalesce(plot_number, 'PLOT'), '\s+', '', 'g')) || '-' ||
      extract(year from created_at)::text
  )
where reference_number is null or file_number is null;

create index if not exists tsl_allocations_reference_number_idx
  on public.tsl_allocations (reference_number);
create index if not exists tsl_allocations_file_number_idx
  on public.tsl_allocations (file_number);
create index if not exists new_trabuom_sl_allocations_reference_number_idx
  on public.new_trabuom_sl_allocations (reference_number);
create index if not exists new_trabuom_sl_allocations_file_number_idx
  on public.new_trabuom_sl_allocations (file_number);
