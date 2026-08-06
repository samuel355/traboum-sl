import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchSettings, SETTINGS_TABLE } from "@/lib/clients";

// Read access is wider than write: anyone who can reserve a plot needs to
// see the current deposit %/period to prefill the reservation form, even
// though only sysadmin (editPlots) can change those numbers.
export async function GET() {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await fetchSettings(supabaseAdmin());
  return NextResponse.json({ settings });
}

export async function PATCH(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "editPlots")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const depositPercent = Number(body.reservation_deposit_percent);
  const periodMonths = Number(body.reservation_payment_period_months);

  if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) {
    return NextResponse.json({ error: "Deposit percent must be between 1 and 100" }, { status: 400 });
  }
  if (!Number.isInteger(periodMonths) || periodMonths <= 0) {
    return NextResponse.json({ error: "Payment period must be a whole number of months" }, { status: 400 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  const { data, error } = await supabaseAdmin()
    .from(SETTINGS_TABLE)
    .update({
      reservation_deposit_percent: depositPercent,
      reservation_payment_period_months: periodMonths,
      updated_by: user.id,
      updated_by_name: actorName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select()
    .single();

  if (error) {
    console.error("Failed to update settings", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
