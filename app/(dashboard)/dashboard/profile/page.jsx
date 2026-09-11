import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getEffectiveRole, isAllowedRole } from "@/lib/roles";
import { ProfileForm } from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !isAllowedRole(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy-400">Account</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-900">My profile</h1>
      <p className="mt-1 text-sm text-navy-500">Update your staff account details.</p>
      <div className="mt-6 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm sm:p-6">
        <ProfileForm
          initialProfile={{
            firstName: user.firstName ?? "",
            lastName: user.lastName ?? "",
            email: user.primaryEmailAddress?.emailAddress ?? "",
            phone: user.primaryPhoneNumber?.phoneNumber ?? "",
          }}
        />
      </div>
    </div>
  );
}
