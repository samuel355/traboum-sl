"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "./BrandMark";
import { SignOutAuditButton } from "./SignOutAuditButton";

const NAV = [
  { href: "/dashboard/overview", label: "Dashboard", exact: true },
  { href: "/dashboard", label: "Map & Plots", exact: true },
  { href: "/dashboard/allocations", label: "Allocations" },
  { href: "/dashboard/transfers", label: "Transfers" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/audit", label: "Audit Trail" },
  { href: "/dashboard/profile", label: "My Profile" },
];

export function MobileNav({ showUsers, showSettings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  let items = NAV;
  if (showUsers) items = [...items, { href: "/dashboard/users", label: "Staff" }];
  if (showSettings) items = [...items, { href: "/dashboard/settings", label: "Settings" }];

  const activeItem = items.find(({ href, exact }) => (exact ? pathname === href : pathname.startsWith(href)));

  return (
    <div className="fixed inset-x-0 top-0 z-30 bg-navy-900 shadow-lg md:hidden">
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark size={34} className="rounded-xl" />
          <span className="truncate text-xs font-semibold text-amber-200">{activeItem?.label || "Menu"}</span>
        </div>
        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open ? (
        <nav className="border-t border-white/10 px-3 pb-3 pt-2">
        {items.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-3 text-sm font-medium ${
                active ? "bg-amber-400 text-navy-950 shadow-sm" : "text-navy-100 hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          );
        })}
        <SignOutAuditButton
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-3 text-sm font-medium text-navy-100 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> Log out
        </SignOutAuditButton>
        </nav>
      ) : null}
    </div>
  );
}
