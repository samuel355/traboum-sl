import { AlertCircle, MapPinned, Users, Wallet } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE, fetchAllPlots, plotStatus, statusKey } from "@/lib/plots";
import { CLIENTS_TABLE, formatGHS, RESERVATIONS_TABLE } from "@/lib/clients";
import { ACTION_LABELS } from "@/lib/audit-actions";
import { formatAuditDate } from "@/lib/audit-date";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const db = supabaseAdmin();
  const [plots, { count: clientCount }, { data: allocations }, { data: reservations }, { data: transfers }, { data: recentActivity }] =
    await Promise.all([
      fetchAllPlots().catch(() => []),
      db.from(CLIENTS_TABLE).select("id", { count: "exact", head: true }),
      db.from(ALLOCATIONS_TABLE).select("amount"),
      db.from(RESERVATIONS_TABLE).select("total_amount, amount_paid, status"),
      db.from("tsl_transfers").select("payment_amount"),
      db.from("tsl_audit_log").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

  const plotStats = { total: plots.length, available: 0, reserved: 0, sold: 0, hold: 0 };
  plots.forEach((plot) => {
    const key = statusKey(plotStatus(plot));
    if (key in plotStats) plotStats[key] += 1;
  });

  const totalRevenue =
    (allocations ?? []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0) +
    (reservations ?? []).reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0) +
    (transfers ?? []).reduce((sum, t) => sum + (Number(t.payment_amount) || 0), 0);

  const totalOutstanding = (reservations ?? [])
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + Math.max(Number(r.total_amount) - Number(r.amount_paid), 0), 0);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
      <p className="mt-1 text-sm text-navy-500">A quick overview of plots, clients, and payments.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={MapPinned} label="Total plots" value={plotStats.total} />
        <StatCard icon={Users} label="Clients" value={clientCount ?? 0} />
        <StatCard icon={Wallet} label="Revenue collected" value={formatGHS(totalRevenue)} tone="text-green-700" iconTone="bg-green-50 text-green-700" />
        <StatCard
          icon={AlertCircle}
          label="Outstanding balance"
          value={formatGHS(totalOutstanding)}
          tone="text-amber-700"
          iconTone="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Available" value={plotStats.available} tone="text-green-700" />
        <MiniStat label="Reserved" value={plotStats.reserved} tone="text-navy-900" />
        <MiniStat label="Sold" value={plotStats.sold} tone="text-red-600" />
        <MiniStat label="On Hold" value={plotStats.hold} tone="text-gray-500" />
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-bold text-navy-900">Recent activity</h2>
        <div className="mt-2 overflow-hidden rounded-xl border border-navy-100 bg-white">
          {!recentActivity?.length ? (
            <p className="p-10 text-center text-sm text-navy-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-navy-50">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </p>
                    <p className="truncate text-xs text-navy-400">{entry.actor_name || entry.actor_id}</p>
                  </div>
                  <span className="shrink-0 text-xs text-navy-400">
                    {formatAuditDate(entry.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = "text-navy-900", iconTone = "bg-navy-50 text-navy-700" }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-5">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className={`mt-3 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-navy-400">{label}</p>
    </div>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-navy-100 bg-white px-4 py-3 text-center">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] text-navy-400">{label}</p>
    </div>
  );
}
