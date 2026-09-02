"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const ASSIGNABLE = [
  ROLES.TSL_SECRETARY,
  ROLES.TSL_ADMIN,
  ROLES.TSL_SURVEYOR,
  ROLES.TSL_QUEEN,
  ROLES.TSL_CHIEF,
];

export function CreateStaffUserForm({ canGrantSysadmin }) {
  const router = useRouter();
  const roles = canGrantSysadmin ? [...ASSIGNABLE, ROLES.SYSADMIN] : ASSIGNABLE;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: roles[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create staff account");

      setSuccess(`User created successfully for ${form.email}.`);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: roles[0],
      });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-navy-100 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">Create staff account</p>
          <p className="mt-1 text-xs text-navy-500">Create a real Clerk user with email, password, and role.</p>
        </div>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-green-700">
          New user
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          required
          type="text"
          value={form.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
          placeholder="First name"
          className="rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
        <input
          required
          type="text"
          value={form.lastName}
          onChange={(e) => updateField("lastName", e.target.value)}
          placeholder="Last name"
          className="rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="staff-member@email.com"
          className="rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15 md:col-span-2"
        />
        <input
          required
          type="password"
          minLength={8}
          value={form.password}
          onChange={(e) => updateField("password", e.target.value)}
          placeholder="Password (minimum 8 characters)"
          className="rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15 md:col-span-2"
        />
        <select
          value={form.role}
          onChange={(e) => updateField("role", e.target.value)}
          className="rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15 md:col-span-2"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-green-700">{success}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Create user
      </button>
    </form>
  );
}
