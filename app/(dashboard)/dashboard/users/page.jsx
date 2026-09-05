import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { AddStaffMemberModal } from "@/components/AddStaffMemberModal";
import { StaffTable } from "@/components/StaffTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!can(role, "manageUsers")) redirect("/dashboard");

  const { data: staffRows } = await supabaseAdmin()
    .from("tsl_staff")
    .select("*")
    .order("updated_at", { ascending: false });

  const client = await clerkClient();
  const staff = await Promise.all(
    (staffRows ?? []).map(async (row) => {
      try {
        const u = await client.users.getUser(row.clerk_user_id);
        return {
          id: u.id,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          username: u.username || "",
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
          email: u.primaryEmailAddress?.emailAddress,
          role: u.publicMetadata?.role || row.role,
        };
      } catch {
        return { id: row.clerk_user_id, name: "(user not found)", email: null, role: row.role };
      }
    }),
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Staff & Roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            View current staff and add a new member when needed.
          </p>
        </div>
        <AddStaffMemberModal canGrantSysadmin={can(role, "grantSysadmin")} />
      </div>

      <div className="mt-8">
        <StaffTable
          staff={staff}
          canDelete={can(role, "manageUsers")}
          canGrantSysadmin={can(role, "grantSysadmin")}
        />
      </div>
    </div>
  );
}
