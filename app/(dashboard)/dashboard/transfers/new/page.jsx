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
    .map((plot) => ({
      id: plot.id,
      plotNumber: plotNumber(plot),
      streetName: streetName(plot),
      currentClientName: plot.currentClientName,
      geometry: plot.geometry,
    }));

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-10">
      <div className="rounded-2xl bg-navy-900 p-5 text-white shadow-panel sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Transfer of Allocation</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Move an allocation safely</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-navy-200">Choose the sold plot, add the new allottee, and finish with the transfer payment and old document.</p>
      </div>
      <div className="mt-6">
        <TransferForm
          plots={soldPlots}
          preselectedPlotId={searchParams?.plotId}
          defaultFee={process.env.NEXT_PUBLIC_TRANSFER_FEE_DEFAULT || "1000"}
        />
      </div>
    </div>
  );
}
