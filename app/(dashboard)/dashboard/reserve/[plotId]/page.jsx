import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getEffectiveRole } from "@/lib/roles";
import { canManagePlot, fetchPlotById, plotNumber, plotStatus, statusKey, streetName } from "@/lib/plots";
import { ReserveForm } from "@/components/ReserveForm";

export const dynamic = "force-dynamic";

export default async function ReservePlotPage({ params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);

  let plot;
  try {
    plot = await fetchPlotById(params.plotId);
  } catch {
    redirect("/dashboard");
  }

  if (statusKey(plotStatus(plot)) !== "available") {
    redirect("/dashboard");
  }
  if (!canManagePlot(role, plot, "allocate")) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Reserve Plot</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-900">
        Plot {plotNumber(plot)}
        {streetName(plot) ? ` — ${streetName(plot)}` : ""}
      </h1>
      <p className="mt-1 text-sm text-navy-500">
        Hold this plot for a client without recording a sale. It can be allocated properly later.
      </p>

      <div className="mt-8">
        <ReserveForm plotId={plot.id} plotNumber={plotNumber(plot)} streetName={streetName(plot)} />
      </div>
    </div>
  );
}
