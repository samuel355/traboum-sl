"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const ASSIGNABLE = [
  ROLES.TSL_SECRETARY,
  ROLES.TSL_ADMIN,
  ROLES.TSL_SURVEYOR,
  ROLES.TSL_QUEEN,
  ROLES.TSL_CHIEF,
];

export function CreateStaffUserForm({ canGrantSysadmin, onSuccess }) {
  const router = useRouter();
  const roles = canGrantSysadmin ? [...ASSIGNABLE, ROLES.SYSADMIN] : ASSIGNABLE;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: roles[0],
  });
  const [showPassword, setShowPassword] = useState(false);
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
        username: "",
        email: "",
        password: "",
        role: roles[0],
      });
      setShowPassword(false);
      onSuccess?.();
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
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Create staff account</p>
          <p className="mt-1 text-xs text-slate-500">Create a real Clerk user with email, password, and role.</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
          New user
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">First name</label>
          <input
            required
            type="text"
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            placeholder="First name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Last name</label>
          <input
            required
            type="text"
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            placeholder="Last name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-1.5 md:col-span-1">
          <label className="text-xs font-medium text-slate-600">Username</label>
          <input
            required
            type="text"
            value={form.username}
            onChange={(e) => updateField("username", e.target.value)}
            placeholder="staffusername"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-1.5 md:col-span-1">
          <label className="text-xs font-medium text-slate-600">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="staff-member@email.com"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-medium text-slate-600">Password</label>
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="Password (minimum 8 characters)"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-medium text-slate-600">Role</label>
          <select
            value={form.role}
            onChange={(e) => updateField("role", e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-green-700">{success}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Create user
      </button>
    </form>
  );
}
