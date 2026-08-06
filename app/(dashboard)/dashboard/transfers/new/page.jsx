import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole, ROLES } from "@/lib/roles";
import { fetchAllPlots, plotNumber, plotOwner, plotStatus, statusKey, streetName } from "@/lib/plots";
import { TransferForm } from "@/components/TransferForm";

export const dynamic = "force-dynamic";

export default async function NewTransferPage({ searchParams }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!can(role, "transfer")) redirect("/dashboard/transfers");

  const allPlots = await fetchAllPlots().catch(() => []);
  const manageablePlots =
    role === ROLES.SYSADMIN ? allPlots : allPlots.filter((plot) => plotOwner(plot) === "tsl");
  const soldPlots = manageablePlots
    .filter((plot) => statusKey(plotStatus(plot)) === "sold")
    .map((plot) => ({ id: plot.id, plotNumber: plotNumber(plot), streetName: streetName(plot) }));

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Transfer of Allocation</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-900">Record a transfer</h1>
      <p className="mt-1 text-sm text-navy-500">
        Upload the old allocation document, enter the new client&apos;s details and the payment
        taken, and a new allocation document will be generated.
      </p>

      <div className="mt-8">
        <TransferForm
          plots={soldPlots}
          preselectedPlotId={searchParams?.plotId}
          defaultFee={process.env.NEXT_PUBLIC_TRANSFER_FEE_DEFAULT || "1000"}
        />
      </div>
    </div>
  );
}
