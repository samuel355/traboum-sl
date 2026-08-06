import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole, isAllowedRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE } from "@/lib/plots";
import { CLIENTS_TABLE, RESERVATIONS_TABLE, summarizeClientRecords } from "@/lib/clients";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !isAllowedRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const [{ data: clients, error }, { data: allocations }, { data: reservations }, { data: transfers }] =
    await Promise.all([
      db.from(CLIENTS_TABLE).select("*").order("created_at", { ascending: false }).limit(1000),
      db.from(ALLOCATIONS_TABLE).select("client_id, plot_id, amount"),
      db.from(RESERVATIONS_TABLE).select("client_id, plot_id, total_amount, amount_paid, status"),
      db.from("tsl_transfers").select("client_id, plot_id, payment_amount"),
    ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byClient = {};
  const bucketFor = (id) => (byClient[id] ??= { allocations: [], reservations: [], transfers: [] });
  (allocations ?? []).forEach((row) => row.client_id && bucketFor(row.client_id).allocations.push(row));
  (reservations ?? []).forEach((row) => row.client_id && bucketFor(row.client_id).reservations.push(row));
  (transfers ?? []).forEach((row) => row.client_id && bucketFor(row.client_id).transfers.push(row));

  const result = (clients ?? []).map((client) => ({
    ...client,
    ...summarizeClientRecords(byClient[client.id] ?? {}),
  }));

  return NextResponse.json({ clients: result });
}

export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const { email, address } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing } = await db.from(CLIENTS_TABLE).select("id").eq("phone", phone).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "A client with this phone number already exists" }, { status: 409 });
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  const { data: client, error } = await db
    .from(CLIENTS_TABLE)
    .insert({
      name,
      phone,
      email: email || null,
      address: address || null,
      created_by: user.id,
      created_by_name: actorName,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create client", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "client.created",
    entityType: CLIENTS_TABLE,
    entityId: client.id,
    metadata: { name, phone },
  });

  return NextResponse.json({ client });
}
