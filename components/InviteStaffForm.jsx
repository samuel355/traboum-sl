"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

const ASSIGNABLE = [ROLES.TSL_SECRETARY, ROLES.TSL_ADMIN, ROLES.TSL_SURVEYOR, ROLES.TSL_QUEEN, ROLES.TSL_CHIEF];

export function InviteStaffForm({ canGrantSysadmin }) {
  const router = useRouter();
  const roles = canGrantSysadmin ? [...ASSIGNABLE, ROLES.SYSADMIN] : ASSIGNABLE;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [state, setState] = useState("idle"); // idle | submitting | done | error
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");
      setState("done");
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-navy-100 bg-white p-5">
      <p className="text-sm font-semibold text-navy-900">Invite new staff</p>
      <p className="mt-1 text-xs text-navy-400">
        Sends an email invite to set up their account — their role is already assigned the moment
        they accept, no need to wait for them to sign in first.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="email"
          required
          placeholder="staff-member@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setState("idle");
          }}
          className="min-w-[220px] flex-1 rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-navy-100 px-3.5 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={state === "submitting"}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {state === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Invite
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {state === "done" ? <p className="mt-2 text-sm text-green-700">Invitation sent.</p> : null}
    </form>
  );
}
