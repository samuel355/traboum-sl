import { supabaseAdmin } from "@/lib/supabase";
import { AuditTrailList } from "@/components/AuditTrailList";

export const dynamic = "force-dynamic";

export default async function AuditTrailPage() {
  const { data: entries, error } = await supabaseAdmin()
    .from("tsl_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div className="p-4 sm:p-6 md:p-10">
      <h1 className="text-2xl font-bold text-navy-900">Audit Trail</h1>
      <p className="mt-1 text-sm text-navy-500">
        Every allocation, transfer, and staff change — kept for crosscheck.
      </p>

      <div className="mt-6">
        {error ? (
          <p className="rounded-xl border border-navy-100 bg-white p-6 text-sm text-red-600">
            Couldn&apos;t load the audit trail: {error.message}
          </p>
        ) : (
          <AuditTrailList entries={entries ?? []} />
        )}
      </div>
    </div>
  );
}
