"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, PencilLine, Search, Trash2, X } from "lucide-react";
import { ROLES, ROLE_LABELS, roleLabel } from "@/lib/roles";

const ASSIGNABLE = [
  ROLES.TSL_SECRETARY,
  ROLES.TSL_ADMIN,
  ROLES.TSL_SURVEYOR,
  ROLES.TSL_QUEEN,
  ROLES.TSL_CHIEF,
];

export function StaffTable({ staff, canDelete = false, canGrantSysadmin = false }) {
  const roles = canGrantSysadmin ? [...ASSIGNABLE, ROLES.SYSADMIN] : ASSIGNABLE;
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
    role: ROLES.TSL_ADMIN,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState(null);

  function startEdit(staffMember) {
    setEditingId(staffMember.id);
    setForm({
      firstName: staffMember.firstName || "",
      lastName: staffMember.lastName || "",
      username: staffMember.username || "",
      email: staffMember.email || "",
      password: "",
      role: staffMember.role || ROLES.TSL_ADMIN,
    });
    setShowPassword(false);
    setError(null);
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveUser(userId) {
    setSavingId(userId);
    setError(null);

    try {
      const payload = { userId, ...form };
      if (!payload.password) delete payload.password;
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      setEditingId(null);
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeStaff(userId) {
    if (!canDelete) return;

    setRemovingId(userId);
    setError(null);

    try {
      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove staff member");
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  function requestDelete(staffMember) {
    if (!canDelete || removingId) return;
    setError(null);
    setPendingDelete(staffMember);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      [s.name, s.email, roleLabel(s.role)].filter(Boolean).some((field) => field.toLowerCase().includes(q)),
    );
  }, [staff, query]);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-navy-100 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-slate-50/70 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-navy-900">Current staff</p>
          <p className="text-[11px] text-navy-500">Manage details, roles and access.</p>
        </div>
        {staff.length ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff"
              className="w-48 rounded-md border border-navy-100 bg-white py-1.5 pl-8 pr-3 text-xs text-navy-900 outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="px-5 py-3 text-sm text-red-600">{error}</p> : null}

      {!staff.length ? (
        <p className="p-10 text-center text-sm text-navy-400">No staff assigned yet.</p>
      ) : !filtered.length ? (
        <p className="p-10 text-center text-sm text-navy-400">No staff match &quot;{query}&quot;.</p>
      ) : (
        <div className="divide-y divide-navy-50">
          {filtered.map((s) => (
            <div key={s.id} className="px-5 py-4">
              {editingId === s.id ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">First name</label>
                      <input
                        value={form.firstName}
                        onChange={(e) => updateField("firstName", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Last name</label>
                      <input
                        value={form.lastName}
                        onChange={(e) => updateField("lastName", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Username</label>
                      <input
                        value={form.username}
                        onChange={(e) => updateField("username", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => updateField("password", e.target.value)}
                          placeholder="Leave blank to keep current password"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">Role</label>
                      <select
                        value={form.role}
                        onChange={(e) => updateField("role", e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => saveUser(s.id)}
                      disabled={savingId === s.id}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      {savingId === s.id ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-navy-900">{s.name}</p>
                      <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-700">
                        {roleLabel(s.role)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-navy-500">{s.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => requestDelete(s)}
                        disabled={removingId === s.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {removingId === s.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      {pendingDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !removingId) setPendingDelete(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-staff-title"
            aria-describedby="delete-staff-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <button
                type="button"
                aria-label="Close delete confirmation"
                onClick={() => setPendingDelete(null)}
                disabled={Boolean(removingId)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 id="delete-staff-title" className="mt-5 text-lg font-bold text-slate-900">
              Delete staff member?
            </h2>
            <p id="delete-staff-description" className="mt-2 text-sm leading-6 text-slate-600">
              You are about to permanently delete{" "}
              <span className="font-semibold text-slate-900">{pendingDelete.name || "this user"}</span>.
              Their account access will be removed and this action cannot be undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={Boolean(removingId)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeStaff(pendingDelete.id)}
                disabled={Boolean(removingId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {removingId ? "Deleting..." : "Yes, delete member"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
