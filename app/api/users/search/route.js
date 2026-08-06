import { NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";

export async function GET(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email")?.trim();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const client = await clerkClient();
  const { data } = await client.users.getUserList({ emailAddress: [email] });

  return NextResponse.json({
    users: data.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username,
      email: u.primaryEmailAddress?.emailAddress,
      role: u.publicMetadata?.role || null,
    })),
  });
}
