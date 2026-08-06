import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
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

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold text-navy-900">Staff & Roles</h1>
      <p className="mt-1 text-sm text-navy-500">
        Search for a signed-up user by email and assign them a Trabuom Stool Lands role.
      </p>

      <div className="mt-6">
        <UserSearchAndAssign canGrantSysadmin={can(role, "grantSysadmin")} />
      </div>

      <div className="mt-8">
        <StaffTable staff={staff} />
      </div>
    </div>
  );
}
