import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { getEffectiveRole, isAllowedRole, can } from "@/lib/roles";

export default async function DashboardLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const role = getEffectiveRole(user);
  if (!isAllowedRole(role)) redirect("/unauthorized");

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  const showUsers = can(role, "manageUsers");
  const showSettings = can(role, "editPlots");

  return (
    <div className="min-h-screen bg-[#F7F8FB]">
      <Sidebar role={role} name={name} showUsers={showUsers} showSettings={showSettings} />
      <MobileNav role={role} showUsers={showUsers} showSettings={showSettings} />
      <main className="md:ml-64 pt-14 md:pt-0 min-h-screen">{children}</main>
    </div>
  );
}
