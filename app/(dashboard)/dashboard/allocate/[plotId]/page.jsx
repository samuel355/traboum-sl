import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole } from "@/lib/roles";
import { canManagePlot, fetchPlotById, plotNumber, plotStatus, statusKey, streetName } from "@/lib/plots";
import { AllocationForm } from "@/components/AllocationForm";

export const dynamic = "force-dynamic";

export default async function AllocatePlotPage({ params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!can(role, "allocate")) redirect("/dashboard");

  let plot;
  try {
    plot = await fetchPlotById(params.plotId);
  } catch {
    redirect("/dashboard");
  }

  const plotStatusKey = statusKey(plotStatus(plot));
  if (plotStatusKey !== "available" && plotStatusKey !== "reserved") {
    redirect("/dashboard");
  }
  if (!canManagePlot(role, plot, "allocate")) {
    redirect("/dashboard");
  }

  const agentName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-10">
      <div className="rounded-2xl bg-navy-900 p-5 text-white shadow-panel sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Buy plot</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          Allocate Plot {plotNumber(plot) || "—"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-navy-200">
          {streetName(plot) || "Street not set"} · Complete the client details and payment to generate the official allocation document.
        </p>
      </div>

      <div className="mt-6">
        <AllocationForm
          plotId={plot.id}
          plotNumber={plotNumber(plot)}
          streetName={streetName(plot)}
          agentName={agentName}
        />
      </div>
    </div>
  );
}
