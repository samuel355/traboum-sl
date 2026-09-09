"use client";

import { X } from "lucide-react";
import { plotAssignee, plotNumber, streetName } from "@/lib/plots";
import { AllocationForm } from "./AllocationForm";

export function AllocationModal({ plot, agentName, onClose, onSaved }) {
  const assignee = plotAssignee(plot);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Generate allocation</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900">Plot {plotNumber(plot) || "—"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1 text-navy-300 hover:text-navy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">
          <AllocationForm
            plotId={plot.id}
            plotNumber={plotNumber(plot)}
            streetName={streetName(plot)}
            agentName={agentName}
            initialClient={{
              name: assignee.name,
              phone: assignee.contact,
              address: assignee.address,
            }}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}
