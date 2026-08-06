"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { roleLabel } from "@/lib/roles";

export function StaffTable({ staff }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      [s.name, s.email, roleLabel(s.role)].filter(Boolean).some((field) => field.toLowerCase().includes(q)),
    );
  }, [staff, query]);

  return (
    <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-3">
        <p className="text-sm font-semibold text-navy-900">Current staff</p>
        {staff.length ? (
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-300" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff"
              className="w-48 rounded-md border border-navy-100 py-1.5 pl-8 pr-3 text-xs text-navy-900 outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/15"
            />
          </div>
        ) : null}
      </div>

      {!staff.length ? (
        <p className="p-10 text-center text-sm text-navy-400">No staff assigned yet.</p>
      ) : !filtered.length ? (
        <p className="p-10 text-center text-sm text-navy-400">No staff match &quot;{query}&quot;.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-navy-50 last:border-0 hover:bg-navy-50/50">
                <td className="px-5 py-3 font-medium text-navy-900">{s.name}</td>
                <td className="px-5 py-3 text-navy-500">{s.email}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700">
                    {roleLabel(s.role)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
