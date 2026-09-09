import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole, isAllowedRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE } from "@/lib/plots";
import {
  CLIENTS_TABLE,
  DOCUMENTS_TABLE,
  fetchPendingPlotAssignments,
  RESERVATIONS_TABLE,
  summarizeClientRecords,
} from "@/lib/clients";
import { deleteFromR2ByUrl } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";
import { saveClientPhoto } from "@/lib/client-photo";

export async function GET(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !isAllowedRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();
  const [
    { data: client, error: clientError },
    { data: allocations },
    { data: reservations },
    { data: transfers },
    { data: documents },
    pendingAssignments,
  ] = await Promise.all([
    db.from(CLIENTS_TABLE).select("*").eq("id", params.clientId).single(),
    db
      .from(ALLOCATIONS_TABLE)
      .select("*")
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false }),
    db
      .from(RESERVATIONS_TABLE)
      .select("*")
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false }),
    db
      .from("tsl_transfers")
      .select("*")
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false }),
    db
      .from(DOCUMENTS_TABLE)
      .select("*")
      .eq("client_id", params.clientId)
      .order("created_at", { ascending: false }),
    fetchPendingPlotAssignments(db),
  ]);

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const summary = summarizeClientRecords({
    allocations: allocations ?? [],
    reservations: reservations ?? [],
    transfers: transfers ?? [],
    pendingPlots: pendingAssignments.filter((assignment) => String(assignment.clientId) === String(params.clientId)),
  });

  return NextResponse.json({
    client,
    allocations: allocations ?? [],
    reservations: reservations ?? [],
    transfers: transfers ?? [],
    documents: documents ?? [],
    pendingPlots: pendingAssignments.filter((assignment) => String(assignment.clientId) === String(params.clientId)),
    summary,
  });
}

export async function PATCH(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("multipart/form-data") ? await request.formData() : await request.json();
  const updates = {};
  const has = (key) => (body instanceof FormData ? body.has(key) : key in body);
  const get = (key) => body.get ? body.get(key) : body[key];
  if (has("name")) updates.name = String(get("name") ?? "").trim();
  if (has("phone")) updates.phone = String(get("phone") ?? "").trim();
  if (has("email")) updates.email = get("email") || null;
  if (has("address")) updates.address = get("address") || null;

  if ("name" in updates && !updates.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if ("phone" in updates && !updates.phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const db = supabaseAdmin();
  const { data: client, error } = await db
    .from(CLIENTS_TABLE)
    .update(updates)
    .eq("id", params.clientId)
    .select()
    .single();

  if (error || !client) {
    console.error("Failed to update client", params.clientId, error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }

  const clientPhoto = get("clientPhoto");
  if (clientPhoto) {
    try {
      await saveClientPhoto(db, params.clientId, clientPhoto, user.id, [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username);
    } catch (photoError) {
      console.error("Failed to save client photo", photoError);
      return NextResponse.json({ error: photoError.message || "Failed to save client photo" }, { status: 400 });
    }
  }

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "client.updated",
    entityType: CLIENTS_TABLE,
    entityId: params.clientId,
    metadata: updates,
  });

  return NextResponse.json({ client });
}

export async function DELETE(request, { params }) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "manageUsers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();

  // Never delete a client with financial history attached — those records
  // (payments, plots) must stay traceable to a real person, matching this
  // app's audit-trail-first philosophy.
  const [{ count: allocationCount }, { count: reservationCount }, { count: transferCount }, pendingAssignments] =
    await Promise.all([
      db.from(ALLOCATIONS_TABLE).select("id", { count: "exact", head: true }).eq("client_id", params.clientId),
      db.from(RESERVATIONS_TABLE).select("id", { count: "exact", head: true }).eq("client_id", params.clientId),
      db.from("tsl_transfers").select("id", { count: "exact", head: true }).eq("client_id", params.clientId),
      fetchPendingPlotAssignments(db),
    ]);

  const hasPendingAssignment = pendingAssignments.some(
    (assignment) => String(assignment.clientId) === String(params.clientId),
  );
  if ((allocationCount ?? 0) + (reservationCount ?? 0) + (transferCount ?? 0) > 0 || hasPendingAssignment) {
    return NextResponse.json(
      { error: "This client has a plot assignment, allocation, reservation, or transfer on record and can't be deleted" },
      { status: 409 },
    );
  }

  const { data: existing } = await db.from(CLIENTS_TABLE).select("name, phone").eq("id", params.clientId).maybeSingle();
  const { data: documents } = await db.from(DOCUMENTS_TABLE).select("file_url").eq("client_id", params.clientId);

  const { error } = await db.from(CLIENTS_TABLE).delete().eq("id", params.clientId);
  if (error) {
    console.error("Failed to delete client", params.clientId, error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }

  // Document rows cascade-delete with the client (FK ON DELETE CASCADE) —
  // still need to clean up their R2 objects manually since that's outside
  // the database.
  await Promise.allSettled((documents ?? []).map((doc) => deleteFromR2ByUrl(doc.file_url)));

  const actorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  await writeAuditLog({
    actorId: user.id,
    actorName,
    actorRole: role,
    action: "client.deleted",
    entityType: CLIENTS_TABLE,
    entityId: params.clientId,
    metadata: { name: existing?.name, phone: existing?.phone },
  });

  return NextResponse.json({ ok: true });
}
