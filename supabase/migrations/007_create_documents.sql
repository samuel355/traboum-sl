-- Client-attached documents: passport photo (optional), site plan,
-- cadastral plan, and anything else staff need on file. Separate from the
-- allocation/transfer PDFs (which are auto-generated and stay on their own
-- records) — this table is for manually-uploaded supporting documents.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) against the
-- SAME project get-plot already uses.

create table if not exists public.new_trabuom_sl_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.new_trabuom_sl_clients (id) on delete cascade,
  plot_number text,
  doc_type text not null check (doc_type in ('passport_photo', 'site_plan', 'cadastral', 'other')),
  label text,
  file_url text not null,
  file_name text,
  mime_type text,
  uploaded_by text not null,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

alter table public.new_trabuom_sl_documents enable row level security;
create index if not exists new_trabuom_sl_documents_client_idx
  on public.new_trabuom_sl_documents (client_id);
