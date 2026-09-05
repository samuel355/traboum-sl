"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

const FIELD_CLASS =
  "w-full rounded-xl border border-navy-100 px-3.5 py-3 text-sm text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

const DEFAULT_SETTINGS = { reservation_deposit_percent: 40, reservation_payment_period_months: 3 };

function formatGHS(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `GHS ${value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReserveForm({ plotId, plotNumber, streetName }) {
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", totalAmount: "", amountPaid: "", note: "" });
  const [depositTouched, setDepositTouched] = useState(false);
  const [state, setState] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.settings && setSettings(data.settings))
      .catch(() => {});
  }, []);

  const update = (field) => (e) => {
    const value = e.target.value;
    if (field === "amountPaid") setDepositTouched(true);
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "totalAmount" && !depositTouched) {
        const total = Number(value);
        if (Number.isFinite(total) && total > 0) {
          next.amountPaid = ((total * Number(settings.reservation_deposit_percent)) / 100).toFixed(2);
        }
      }
      return next;
    });
  };

  const remaining = useMemo(() => {
    const total = Number(form.totalAmount);
    const paid = Number(form.amountPaid);
    if (!Number.isFinite(total) || !Number.isFinite(paid)) return null;
    return Math.max(total - paid, 0);
  }, [form.totalAmount, form.amountPaid]);

  const dueDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + Number(settings.reservation_payment_period_months || 0));
    return d.toLocaleDateString("en-GB");
  }, [settings.reservation_payment_period_months]);

  async function onSubmit(e) {
    e.preventDefault();
    setState("submitting");
    setError(null);

    try {
      const res = await fetch("/api/plots/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId,
          plotNumber,
          streetName,
          clientName: form.name,
          clientPhone: form.phone,
          clientEmail: form.email,
          clientAddress: form.address,
          totalAmount: form.totalAmount,
          amountPaid: form.amountPaid,
          note: form.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reserve plot");
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-9 w-9 text-green-600" />
        <h2 className="mt-3 text-base font-bold text-navy-900">Plot reserved</h2>
        <p className="mt-1 text-sm text-navy-500">
          Plot {plotNumber} has been reserved for {form.name}.{" "}
          {remaining ? `Balance of ${formatGHS(remaining)} due by ${dueDate}.` : ""}
        </p>
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-50"
          >
            Back to map
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-navy-100 bg-navy-50/70 p-4 text-sm">
        <div>
          <p className="text-navy-400 text-xs">Plot number</p>
          <p className="font-semibold text-navy-900">{plotNumber}</p>
        </div>
        <div>
          <p className="text-navy-400 text-xs">Street</p>
          <p className="font-semibold text-navy-900">{streetName || "—"}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-navy-100 p-4 sm:p-5">
        <p className="mb-4 text-sm font-bold text-navy-900">Client details</p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy-700">Reserved for (name)</label>
          <input required className={FIELD_CLASS} value={form.name} onChange={update("name")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Phone number</label>
            <input required className={FIELD_CLASS} value={form.phone} onChange={update("phone")} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-700">Email</label>
            <input type="email" className={FIELD_CLASS} value={form.email} onChange={update("email")} />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-navy-700">Address</label>
          <textarea rows={2} className={FIELD_CLASS} value={form.address} onChange={update("address")} />
        </div>
      </section>

      <div className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:p-5">
        <p className="text-sm font-bold text-navy-900">Payment plan</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-navy-500">Total price (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className={FIELD_CLASS}
              value={form.totalAmount}
              onChange={update("totalAmount")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-navy-500">
              Deposit paid now (GHS) — suggested {settings.reservation_deposit_percent}%
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className={FIELD_CLASS}
              value={form.amountPaid}
              onChange={update("amountPaid")}
            />
          </div>
        </div>
        {remaining !== null ? (
          <p className="text-xs text-navy-500">
            Remaining balance: <span className="font-semibold text-navy-900">{formatGHS(remaining)}</span>,
            due by <span className="font-semibold text-navy-900">{dueDate}</span> (
            {settings.reservation_payment_period_months} month
            {Number(settings.reservation_payment_period_months) === 1 ? "" : "s"} — adjustable in Settings).
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">Note (optional)</label>
        <textarea rows={3} className={FIELD_CLASS} value={form.note} onChange={update("note")} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3.5 text-sm font-bold text-navy-950 shadow-sm hover:bg-amber-300 disabled:opacity-60"
      >
        {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Reserve plot
      </button>
    </form>
  );
}
