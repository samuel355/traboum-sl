import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Plus } from "lucide-react";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { TransfersTable } from "@/components/TransfersTable";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);

  const { data: transfers, error } = await supabaseAdmin()
    .from("tsl_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Transfer of Allocation</h1>
          <p className="mt-1 text-sm text-navy-500">
            Move an existing allocation to a new client, with the old document on file and
            payment recorded.
          </p>
        </div>
        {can(role, "transfer") ? (
          <Link
            href="/dashboard/transfers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="h-4 w-4" /> New transfer
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        {error ? (
          <p className="rounded-xl border border-navy-100 bg-white p-6 text-sm text-red-600">
            Couldn&apos;t load transfers: {error.message}
          </p>
        ) : (
          <TransfersTable transfers={transfers ?? []} />
        )}
      </div>
    </div>
  );
}
