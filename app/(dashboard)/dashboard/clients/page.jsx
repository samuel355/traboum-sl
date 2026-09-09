import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE } from "@/lib/plots";
import { CLIENTS_TABLE, fetchPendingPlotAssignments, RESERVATIONS_TABLE, summarizeClientRecords } from "@/lib/clients";
import { ClientsTable } from "@/components/ClientsTable";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);

  const db = supabaseAdmin();
  const [{ data: clients, error }, { data: allocations }, { data: reservations }, { data: transfers }, pendingPlots] =
    await Promise.all([
      db.from(CLIENTS_TABLE).select("*").order("created_at", { ascending: false }).limit(1000),
      db.from(ALLOCATIONS_TABLE).select("client_id, plot_id, amount"),
      db.from(RESERVATIONS_TABLE).select("client_id, plot_id, total_amount, amount_paid, status"),
      db.from("tsl_transfers").select("client_id, plot_id, payment_amount"),
      fetchPendingPlotAssignments(db),
    ]);

  const byClient = {};
  const bucketFor = (id) => (byClient[id] ??= { allocations: [], reservations: [], transfers: [], pendingPlots: [] });
  (allocations ?? []).forEach((row) => row.client_id && bucketFor(row.client_id).allocations.push(row));
  (reservations ?? []).forEach((row) => row.client_id && bucketFor(row.client_id).reservations.push(row));
  (transfers ?? []).forEach((row) => row.client_id && bucketFor(row.client_id).transfers.push(row));
  pendingPlots.forEach((row) => bucketFor(row.clientId).pendingPlots.push(row));

  const clientsWithSummary = (clients ?? []).map((client) => ({
    ...client,
    ...summarizeClientRecords(byClient[client.id] ?? {}),
  }));

  return (
    <div className="p-4 sm:p-6 md:p-10">
      <h1 className="text-xl font-bold text-navy-900 sm:text-2xl">Clients</h1>
      <p className="mt-1 text-sm text-navy-500">
        Everyone who has bought, reserved, or received a transferred plot.
      </p>

      <div className="mt-5 sm:mt-6">
        {error ? (
          <p className="rounded-xl border border-navy-100 bg-white p-6 text-sm text-red-600">
            Couldn&apos;t load clients: {error.message}
          </p>
        ) : (
          <ClientsTable
            clients={clientsWithSummary}
            canManage={can(role, "allocate")}
            canDelete={can(role, "manageUsers")}
          />
        )}
      </div>
    </div>
  );
}
