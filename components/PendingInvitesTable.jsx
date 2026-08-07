"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";

export function PendingInvitesTable({ invites }) {
  const router = useRouter();
  const [revoking, setRevoking] = useState(null);
  const [error, setError] = useState(null);

  async function revoke(id) {
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`/api/users/invite/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke invitation");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setRevoking(null);
    }
  }

  if (!invites.length) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-navy-100 bg-white">
      <div className="border-b border-navy-100 px-5 py-3">
        <p className="text-sm font-semibold text-navy-900">Pending invitations</p>
      </div>
      {error ? <p className="px-5 pt-3 text-sm text-red-600">{error}</p> : null}
      <table className="w-full text-sm">
        <tbody>
          {invites.map((inv) => (
            <tr key={inv.id} className="border-b border-navy-50 last:border-0">
              <td className="px-5 py-3 font-medium text-navy-900">{inv.emailAddress}</td>
              <td className="px-5 py-3">
                <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700">
                  {ROLE_LABELS[inv.role] || inv.role}
                </span>
              </td>
              <td className="px-5 py-3 text-xs text-navy-400">
                {new Date(inv.createdAt).toLocaleDateString("en-GB")}
              </td>
              <td className="px-5 py-3 text-right">
                <button
                  onClick={() => revoke(inv.id)}
                  disabled={revoking === inv.id}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
                >
                  {revoking === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
