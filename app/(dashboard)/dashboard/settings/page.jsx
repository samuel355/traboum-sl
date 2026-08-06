import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchSettings } from "@/lib/clients";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!can(role, "editPlots")) redirect("/dashboard");

  const settings = await fetchSettings(supabaseAdmin());

  return (
    <div className="p-6 md:p-10">
      <h1 className="text-2xl font-bold text-navy-900">Settings</h1>
      <p className="mt-1 text-sm text-navy-500">
        Controls the default reservation deposit and balance payment period used across the app.
      </p>

      <div className="mt-6">
        <SettingsForm initialSettings={settings} />
      </div>
    </div>
  );
}
