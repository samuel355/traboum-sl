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
    <div id="staff-search" className="rounded-xl border border-navy-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">Assign staff role</p>
          <p className="mt-1 text-xs text-navy-500">Search for a signed-up user and assign their role.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-navy-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-700">
            Direct assignment
          </span>
          <button
            type="button"
            onClick={() => document.getElementById("staff-email-input")?.focus()}
            className="rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50"
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
          className="flex-1 rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
        <button
          type="submit"
          disabled={searching}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-50 bg-navy-50/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-navy-900">{u.name}</p>
                  <p className="text-xs text-navy-400">
                    {u.email} {u.role ? `· currently ${ROLE_LABELS[u.role] || u.role}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {roles.map((r) => (
                    <button
                      key={r}
                      disabled={assigning === u.id}
                      onClick={() => assign(u.id, r)}
                      className="rounded-md border border-navy-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-900 hover:text-white disabled:opacity-60"
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
