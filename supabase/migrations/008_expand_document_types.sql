-- Adds the remaining document types needed to model the real Kumasi/Ashanti
-- stool-land documentation pipeline as stages for a client: indenture/lease,
-- Lands Commission concurrence, and registration (title/deed). "Allocation"
-- is deliberately not a doc_type here — it's system-generated on the
-- allocations record itself (pdf_url) the moment a plot is bought, not
-- something staff upload.

alter table public.new_trabuom_sl_documents
  drop constraint if exists new_trabuom_sl_documents_doc_type_check;

alter table public.new_trabuom_sl_documents
  add constraint new_trabuom_sl_documents_doc_type_check
  check (doc_type in (
    'passport_photo', 'site_plan', 'cadastral', 'indenture', 'concurrence', 'registration', 'other'
  ));
