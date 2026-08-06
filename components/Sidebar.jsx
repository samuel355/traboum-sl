"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeftRight,
  Contact,
  LayoutDashboard,
  Map as MapIcon,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { roleLabel } from "@/lib/roles";

const NAV = [
  { href: "/dashboard/overview", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard", label: "Map & Plots", icon: MapIcon, exact: true },
  { href: "/dashboard/allocations", label: "Allocations", icon: ScrollText },
  { href: "/dashboard/transfers", label: "Transfer of Allocation", icon: ArrowLeftRight },
  { href: "/dashboard/clients", label: "Clients", icon: Contact },
  { href: "/dashboard/audit", label: "Audit Trail", icon: ShieldCheck },
];

export function Sidebar({ role, name, showUsers, showSettings }) {
  const pathname = usePathname();
  let items = NAV;
  if (showUsers) items = [...items, { href: "/dashboard/users", label: "Staff & Roles", icon: Users }];
  if (showSettings) items = [...items, { href: "/dashboard/settings", label: "Settings", icon: Settings }];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-navy-900">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-navy-900 font-bold text-sm">
          TSL
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Trabuom Stool Lands</p>
          <p className="text-[11px] text-navy-300">Land management</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-white text-navy-900" : "text-navy-100 hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4 flex items-center gap-3">
        <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{name || "Staff"}</p>
          <p className="text-[11px] text-navy-300">{roleLabel(role)}</p>
        </div>
      </div>
    </aside>
  );
}
