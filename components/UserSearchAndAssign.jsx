"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const ASSIGNABLE = [
  ROLES.TSL_SECRETARY,
  ROLES.TSL_ADMIN,
  ROLES.TSL_SURVEYOR,
  ROLES.TSL_QUEEN,
  ROLES.TSL_CHIEF,
];

export function UserSearchAndAssign({ canGrantSysadmin }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [assigning, setAssigning] = useState(null); // userId being assigned
  const [error, setError] = useState(null);

  const roles = canGrantSysadmin ? [...ASSIGNABLE, ROLES.SYSADMIN] : ASSIGNABLE;

  async function search(e) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function assign(userId, role) {
    setAssigning(userId);
    setError(null);
    try {
      const res = await fetch("/api/users/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign role");
      router.refresh();
      setResults(null);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div id="staff-search" className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_16px_32px_-22px_rgba(15,23,42,0.45)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Assign staff role</p>
          <p className="mt-1 text-xs text-slate-500">Search for a signed-up user and assign their role.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
            Direct assignment
          </span>
          <button
            type="button"
            onClick={() => document.getElementById("staff-email-input")?.focus()}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Add staff member
          </button>
        </div>
      </div>

      <form onSubmit={search} className="mt-4 flex gap-2">
        <input
          id="staff-email-input"
          type="email"
          required
          placeholder="staff-member@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={searching}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800 disabled:opacity-60"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search user
        </button>
      </form>
      <p className="mt-2 text-xs text-navy-400">
        The person must already have signed in at least once (via phone, email/password, or
        Google) before they can be found here.
      </p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {results ? (
        results.length === 0 ? (
          <p className="mt-4 text-sm text-navy-400">No signed-up user found with that email.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {results.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-500">
                    {u.email} {u.role ? `· currently ${ROLE_LABELS[u.role] || u.role}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {roles.map((r) => (
                    <button
                      key={r}
                      disabled={assigning === u.id}
                      onClick={() => assign(u.id, r)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-900 hover:text-white disabled:opacity-60"
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
