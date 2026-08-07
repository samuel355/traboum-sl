import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { InviteStaffForm } from "@/components/InviteStaffForm";
import { PendingInvitesTable } from "@/components/PendingInvitesTable";
import { UserSearchAndAssign } from "@/components/UserSearchAndAssign";
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
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
          email: u.primaryEmailAddress?.emailAddress,
          role: u.publicMetadata?.role || row.role,
        };
      } catch {
        return { id: row.clerk_user_id, name: "(user not found)", email: null, role: row.role };
      }
    }),
  );

  const { data: pendingInvitations } = await client.invitations.getInvitationList({ status: "pending" });
  const invites = pendingInvitations.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    role: inv.publicMetadata?.role,
    createdAt: inv.createdAt,
  }));

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold text-navy-900">Staff & Roles</h1>
      <p className="mt-1 text-sm text-navy-500">
        Invite new staff with a role already assigned, or search for a signed-up user by email to
        assign one.
      </p>

      <div className="mt-6">
        <InviteStaffForm canGrantSysadmin={can(role, "grantSysadmin")} />
        <PendingInvitesTable invites={invites} />
      </div>

      <div className="mt-8">
        <UserSearchAndAssign canGrantSysadmin={can(role, "grantSysadmin")} />
      </div>

      <div className="mt-8">
        <StaffTable staff={staff} />
      </div>
    </div>
  );
}
