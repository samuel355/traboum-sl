"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/dashboard/overview", label: "Dashboard", exact: true },
  { href: "/dashboard", label: "Map & Plots", exact: true },
  { href: "/dashboard/allocations", label: "Allocations" },
  { href: "/dashboard/transfers", label: "Transfers" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/audit", label: "Audit Trail" },
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
          <span className="shrink-0 text-sm font-bold text-white">TSL</span>
          <span className="truncate text-xs font-medium text-navy-200">{activeItem?.label || "Menu"}</span>
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
        </nav>
      ) : null}
    </div>
  );
}
