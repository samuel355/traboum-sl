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
    <div className="fixed inset-x-0 top-0 z-20 flex h-14 items-center bg-navy-900 px-3 shadow-lg md:hidden">
      <span className="mr-3 shrink-0 text-sm font-bold text-white">TSL</span>
      <div className="thin-scroll flex min-w-0 gap-1 overflow-x-auto">
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
