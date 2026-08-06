import { createClient } from "@supabase/supabase-js";

// Public/browser client — anon key, RLS-governed. Fine for reading plot
// geometry/status off the `trabuom` table the same way get-plot's own
// public pages do.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Server-only client — service role key, bypasses RLS. Used for every write
// to tsl_allocations / tsl_transfers / tsl_audit_log, which are locked out
// of the anon/authenticated PostgREST roles entirely (see migration 002).
// Never import this from a "use client" component.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}
