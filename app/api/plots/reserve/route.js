import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { canManagePlot, PLOT_TABLE, statusKey } from "@/lib/plots";
import { addMonths, fetchSettings, findOrCreateClient, RESERVATIONS_TABLE } from "@/lib/clients";
import { writeAuditLog } from "@/lib/audit";

// Reserving now creates a real reservation record (not just an audit-log
// note) so the client's remaining balance and due date can be tracked and
// shown on the Clients page. Reuses the "allocate" permission rather than
// adding a new one, since it's the same staff who'd otherwise be allocating.
export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    plotId,
    plotNumber,
    streetName,
    clientName,
    clientPhone,
    clientEmail,
    clientAddress,
    totalAmount,
    amountPaid,
    note,
  } = body;

  const total = Number(totalAmount);
  const paid = Number(amountPaid);

  if (!plotId || !clientName || !clientPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isFinite(total) || total <= 0) {
    return NextResponse.json({ error: "Total amount must be greater than zero" }, { status: 400 });
  }
  if (!Number.isFinite(paid) || paid < 0 || paid > total) {
    return NextResponse.json({ error: "Amount paid must be between 0 and the total amount" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: plotRow, error: plotFetchError } = await db
    .from(PLOT_TABLE)
    .select("owner, status")
    .eq("id", plotId)
    .single();

  if (plotFetchError || !plotRow) {
    return NextResponse.json({ error: "Plot not found" }, { status: 404 });
  }
  if (!canManagePlot(role, plotRow, "allocate")) {
    return NextResponse.json({ error: "This plot isn't managed by Trabuom Stool Lands" }, { status: 403 });
  }
  if (statusKey(plotRow.status) !== "available") {
    return NextResponse.json({ error: "This plot is no longer available" }, { status: 409 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  const settings = await fetchSettings(db);

  let clientId;
  try {
    clientId = await findOrCreateClient(db, {
      name: clientName,
      phone: clientPhone,
      email: clientEmail,
      address: clientAddress,
      userId: user.id,
      userName: actorName,
    });
  } catch (err) {
    console.error("Failed to find/create client", err);
    return NextResponse.json({ error: "Failed to save client details" }, { status: 500 });
  }

  const balanceDueDate = addMonths(new Date(), settings.reservation_payment_period_months);

  const { data: reservation, error: insertError } = await db
    .from(RESERVATIONS_TABLE)
    .insert({
      plot_table: PLOT_TABLE,
      plot_id: String(plotId),
      plot_number: plotNumber,
      street_name: streetName,
      client_id: clientId,
      total_amount: total,
      amount_paid: paid,
      deposit_percent: settings.reservation_deposit_percent,
      balance_due_date: balanceDueDate.toISOString().slice(0, 10),
      note: note || null,
      created_by: user.id,
      created_by_name: actorName,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert reservation", insertError);
    return NextResponse.json({ error: "Failed to reserve plot" }, { status: 500 });
  }

  const { error: plotUpdateError } = await db.from(PLOT_TABLE).update({ status: "Reserved" }).eq("id", plotId);
  if (plotUpdateError) {
    console.error("Failed to update plot status", plotUpdateError);
  }

  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "plot.reserved",
    entityType: RESERVATIONS_TABLE,
    entityId: reservation.id,
    metadata: {
      plotId,
      plotNumber,
      streetName,
      clientName,
      clientPhone,
      totalAmount: total,
      amountPaid: paid,
      balanceDueDate: reservation.balance_due_date,
    },
  });

  return NextResponse.json({ id: reservation.id, balanceDueDate: reservation.balance_due_date });
}
