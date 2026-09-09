import { supabaseAdmin } from "./supabase";
import { ALLOCATIONS_TABLE, PLOT_TABLE } from "./plots";

export async function fetchCurrentPlotAssignees() {
  const db = supabaseAdmin();
  const [{ data: allocations, error: allocationsError }, { data: transfers, error: transfersError }] =
    await Promise.all([
      db
        .from(ALLOCATIONS_TABLE)
        .select(
          "id, plot_id, plot_number, street_name, client_name, client_email, client_phone, client_address, agent, amount, status, pdf_url, reference_number, file_number, created_at",
        )
        .eq("plot_table", PLOT_TABLE)
        .order("created_at", { ascending: false }),
      db
        .from("tsl_transfers")
        .select("plot_id, new_client_name, created_at")
        .eq("plot_table", PLOT_TABLE)
        .order("created_at", { ascending: false }),
    ]);

  if (allocationsError) throw allocationsError;
  if (transfersError) throw transfersError;

  const assignees = new Map();
  (allocations ?? []).forEach((row) => {
    const key = String(row.plot_id);
    if (!assignees.has(key)) {
      assignees.set(key, { name: row.client_name || null, date: row.created_at, allocation: row });
    }
  });
  (transfers ?? []).forEach((row) => {
    const key = String(row.plot_id);
    const existing = assignees.get(key);
    if (!existing || new Date(row.created_at) > new Date(existing.date)) {
      assignees.set(key, {
        name: row.new_client_name,
        date: row.created_at,
        allocation: existing?.allocation ?? null,
      });
    }
  });

  return assignees;
}
