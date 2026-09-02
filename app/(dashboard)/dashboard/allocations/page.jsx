import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE } from "@/lib/plots";
import { AllocationsTable } from "@/components/AllocationsTable";

export const dynamic = "force-dynamic";

export default async function AllocationsPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);

  const { data: allocations, error } = await supabaseAdmin()
    .from(ALLOCATIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold text-navy-900">Allocations</h1>
      <p className="mt-1 text-sm text-navy-500">Every plot allocated to a client, most recent first.</p>

      <div className="mt-6">
        {error ? (
          <p className="rounded-xl border border-navy-100 bg-white p-6 text-sm text-red-600">
            Couldn&apos;t load allocations: {error.message}
          </p>
        ) : (
          <AllocationsTable
            allocations={allocations ?? []}
            canManage={can(role, "allocate")}
            canDelete={can(role, "manageUsers")}
          />
        )}
      </div>
    </div>
  );
}
