"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

const FIELD_CLASS =
  "w-full rounded-xl border border-navy-100 px-3.5 py-3 text-sm text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15";

export function ProfileForm({ initialProfile }) {
  const [form, setForm] = useState(initialProfile);
  const [state, setState] = useState("idle");
  const [error, setError] = useState(null);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function onSubmit(event) {
    event.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");
      setState("saved");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy-700">First name</label>
          <input required className={FIELD_CLASS} value={form.firstName} onChange={update("firstName")} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy-700">Last name</label>
          <input required className={FIELD_CLASS} value={form.lastName} onChange={update("lastName")} />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">Email address</label>
        <input required type="email" className={FIELD_CLASS} value={form.email} onChange={update("email")} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-700">Phone number</label>
        <input required type="tel" className={FIELD_CLASS} value={form.phone} onChange={update("phone")} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {state === "saved" ? <p className="text-sm text-green-700">Profile updated.</p> : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save profile
      </button>
    </form>
  );
}
