import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { getEffectiveRole, isAllowedRole } from "@/lib/roles";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !isAllowedRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").trim();

  if (!firstName || !lastName || !email || !phone) {
    return NextResponse.json({ error: "First name, last name, email, and phone number are required" }, { status: 400 });
  }

  const client = await clerkClient();
  try {
    const currentEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    let primaryEmailAddressId = user.primaryEmailAddressId;
    if (email !== currentEmail) {
      const emailAddress = await client.emailAddresses.createEmailAddress({
        userId: user.id,
        emailAddress: email,
        verified: true,
        primary: true,
      });
      primaryEmailAddressId = emailAddress.id;
    }

    await client.users.updateUser(user.id, {
      firstName,
      lastName,
      primaryEmailAddressID: primaryEmailAddressId,
    });
    const { error: staffError } = await supabaseAdmin()
      .from("tsl_staff")
      .upsert({
        clerk_user_id: user.id,
        role,
        phone,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });
    if (staffError) throw staffError;

    await writeAuditLog({
      actorId: user.id,
      actorName: [firstName, lastName].join(" "),
      actorRole: role,
      action: "user.profile_updated",
      entityType: "clerk_user",
      entityId: user.id,
      metadata: { email, phone },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update staff profile", error);
    const message = error?.errors?.[0]?.longMessage || error?.errors?.[0]?.message || error?.message || "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
