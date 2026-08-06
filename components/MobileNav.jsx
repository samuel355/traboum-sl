"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  let items = NAV;
  if (showUsers) items = [...items, { href: "/dashboard/users", label: "Staff" }];
  if (showSettings) items = [...items, { href: "/dashboard/settings", label: "Settings" }];

  return (
    <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-navy-900 flex items-center h-14 px-3">
      <span className="text-white font-bold text-sm mr-3 shrink-0">TSL</span>
      <div className="flex gap-1 overflow-x-auto thin-scroll">
        {items.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                active ? "bg-white text-navy-900" : "text-navy-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
