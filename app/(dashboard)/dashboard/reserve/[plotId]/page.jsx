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
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-10">
      <div className="rounded-2xl bg-navy-900 p-5 text-white shadow-panel sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Reserve plot</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Hold Plot {plotNumber(plot) || "—"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-navy-200">
          {streetName(plot) || "Street not set"} · Secure the plot for a client while payment is completed.
        </p>
      </div>

      <div className="mt-6">
        <ReserveForm plotId={plot.id} plotNumber={plotNumber(plot)} streetName={streetName(plot)} />
      </div>
    </div>
  );
}
