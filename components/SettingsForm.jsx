"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const FIELD_CLASS =
  "w-full rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

export function SettingsForm({ initialSettings }) {
  const [depositPercent, setDepositPercent] = useState(initialSettings.reservation_deposit_percent);
  const [periodMonths, setPeriodMonths] = useState(initialSettings.reservation_payment_period_months);
  const [state, setState] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservation_deposit_percent: depositPercent,
          reservation_payment_period_months: periodMonths,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5 rounded-xl border border-navy-100 bg-white p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">
          Reservation deposit (%)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          step="1"
          required
          className={FIELD_CLASS}
          value={depositPercent}
          onChange={(e) => {
            setDepositPercent(e.target.value);
            setState("idle");
          }}
        />
        <p className="mt-1.5 text-xs text-navy-400">
          Suggested deposit shown when staff reserve a plot — e.g. 40 means 40% of the total price
          upfront.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">
          Balance payment period (months)
        </label>
        <input
          type="number"
          min="1"
          step="1"
          required
          className={FIELD_CLASS}
          value={periodMonths}
          onChange={(e) => {
            setPeriodMonths(e.target.value);
            setState("idle");
          }}
        />
        <p className="mt-1.5 text-xs text-navy-400">
          How long a client has to pay the remaining balance after reserving — e.g. 3 means the
          balance is due 3 months from the reservation date.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {state === "submitting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : null}
        {state === "done" ? "Saved" : "Save settings"}
      </button>
    </form>
  );
}
