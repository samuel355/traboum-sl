"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CreateStaffUserForm } from "@/components/CreateStaffUserForm";

export function AddStaffMemberModal({ canGrantSysadmin }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
      >
        Add staff member
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-[0_30px_80px_-24px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
              <div>
                <p className="text-lg font-bold text-slate-900">Add staff member</p>
                <p className="text-xs text-slate-500">Create a real staff account with credentials and role.</p>
              </div>
              <button
                type="button"
                aria-label="Close add staff form"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              <CreateStaffUserForm
                canGrantSysadmin={canGrantSysadmin}
                onSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
