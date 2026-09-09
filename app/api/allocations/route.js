import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { ALLOCATIONS_TABLE, canManagePlot, PLOT_TABLE, statusKey } from "@/lib/plots";
import { findOrCreateClient, RESERVATIONS_TABLE } from "@/lib/clients";
import { generateAllocationPdf } from "@/lib/pdf";
import { allocationPdfKey, uploadToR2 } from "@/lib/r2";
import { notifyEmails } from "@/lib/email";
import { notifyPhones } from "@/lib/sms";
import { writeAuditLog } from "@/lib/audit";
import { saveClientPhoto, validateClientPhoto } from "@/lib/client-photo";
import { DOCUMENTS_TABLE } from "@/lib/clients";

export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "allocate")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const plotId = form.get("plotId");
  const plotNumber = form.get("plotNumber");
  const streetName = form.get("streetName");
  const clientName = form.get("clientName");
  const clientEmail = form.get("clientEmail");
  const clientAddress = form.get("clientAddress");
  const clientPhone = form.get("clientPhone");
  const amount = form.get("amount");
  const clientPhoto = form.get("clientPhoto");
  const printClientName = form.get("printClientName") !== "false";
  const saleAmount = Number(amount);

  if (!plotId || !clientPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!String(plotNumber || "").trim() || !String(streetName || "").trim()) {
    return NextResponse.json({ error: "Plot number and street name cannot be empty." }, { status: 400 });
  }
  if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // The UI already hides/redirects for plots the role can't touch, but that's
  // not a security boundary — re-check ownership and availability here
  // against the live row before writing anything.
  const { data: plotRow, error: plotFetchError } = await db
    .from(PLOT_TABLE)
    .select("owner, status, properties")
    .eq("id", plotId)
    .single();

  if (plotFetchError || !plotRow) {
    return NextResponse.json({ error: "Plot not found" }, { status: 404 });
  }
  if (!canManagePlot(role, plotRow, "allocate")) {
    return NextResponse.json({ error: "This plot isn't managed by Trabuom Stool Lands" }, { status: 403 });
  }
  const currentStatusKey = statusKey(plotRow.status);
  const { data: existingAllocation, error: existingAllocationError } = await db
    .from(ALLOCATIONS_TABLE)
    .select("id")
    .eq("plot_table", PLOT_TABLE)
    .eq("plot_id", String(plotId))
    .limit(1)
    .maybeSingle();
  if (existingAllocationError) {
    console.error("Failed to check existing allocation", existingAllocationError);
    return NextResponse.json({ error: "Failed to verify plot allocation status" }, { status: 500 });
  }
  if (existingAllocation) {
    return NextResponse.json({ error: "This plot has already been allocated" }, { status: 409 });
  }
  const hasPendingAssignee = Boolean(plotRow.properties?.assignedClientId);
  if (
    currentStatusKey !== "available" &&
    currentStatusKey !== "reserved" &&
    !(currentStatusKey === "sold" && hasPendingAssignee)
  ) {
    return NextResponse.json({ error: "This plot is no longer available" }, { status: 409 });
  }

  const agentName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  let clientId;
  let clientPhotoUrl;
  try {
    clientId = await findOrCreateClient(db, {
      name: clientName,
      phone: clientPhone,
      email: clientEmail,
      address: clientAddress,
      userId: user.id,
      userName: agentName,
    });
    validateClientPhoto(clientPhoto);
    const savedPhoto = await saveClientPhoto(db, clientId, clientPhoto, user.id, agentName);
    if (savedPhoto) {
      clientPhotoUrl = savedPhoto.file_url;
    } else {
      const { data: existingPhoto } = await db
        .from(DOCUMENTS_TABLE)
        .select("file_url")
        .eq("client_id", clientId)
        .eq("doc_type", "passport_photo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      clientPhotoUrl = existingPhoto?.file_url;
    }
  } catch (err) {
    console.error("Failed to find/create client", err);
    return NextResponse.json({ error: err.message || "Failed to save client details" }, { status: 400 });
  }

  const { data: allocation, error: insertError } = await db
    .from(ALLOCATIONS_TABLE)
    .insert({
      plot_table: PLOT_TABLE,
      plot_id: String(plotId),
      plot_number: plotNumber,
      street_name: streetName,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail || null,
      client_phone: clientPhone,
      client_address: clientAddress || null,
      agent: agentName,
      amount: saleAmount,
      created_by: user.id,
      created_by_name: agentName,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert allocation", insertError);
    return NextResponse.json({ error: "Failed to record allocation" }, { status: 500 });
  }

  // If this plot had an active reservation, buying it outright supersedes
  // that hold — mark it converted so the client's history doesn't show a
  // still-open reservation alongside the completed sale.
  await db
    .from(RESERVATIONS_TABLE)
    .update({ status: "converted" })
    .eq("plot_id", String(plotId))
    .eq("status", "active");

  const date = new Date();
  const referenceNumber = `TSL-${String(allocation.id).slice(-8).toUpperCase()}`;
  const fileNumber = `TSL-${String(plotNumber || "PLOT").replace(/\s+/g, "").toUpperCase()}-${date.getFullYear()}`;

  const pdfBuffer = await generateAllocationPdf({
    allocationId: allocation.id,
    referenceNumber,
    fileNumber,
    allocationDate: date.toISOString(),
    plotNumber,
    streetName,
    clientName: printClientName ? clientName : "",
    clientEmail,
    clientPhone,
    clientAddress,
    clientPhotoUrl,
    agent: agentName,
    date,
    kind: "Allocation",
  });

  let pdfUrl = null;
  try {
    pdfUrl = await uploadToR2(pdfBuffer, allocationPdfKey(allocation.id), "application/pdf");
    await db.from(ALLOCATIONS_TABLE).update({ pdf_url: pdfUrl }).eq("id", allocation.id);
  } catch (err) {
    console.error("R2 upload failed for allocation", allocation.id, err);
  }

  // Allocation is the point of assignment, not a separate approval step.
  // Keep owner as the controlling organization; the buyer belongs in the
  // allocation/client records and must not replace the inventory owner.
  // Clear the temporary edit-modal assignment once it has become a formal
  // allocation, preventing a second allocation from the Sold plot popup.
  const updatedProperties = { ...(plotRow.properties ?? {}) };
  delete updatedProperties.assignedClientId;
  delete updatedProperties.assignedClientName;
  delete updatedProperties.assignedClientContact;
  delete updatedProperties.assignedClientAddress;
  const { error: plotUpdateError } = await db
    .from(PLOT_TABLE)
    .update({ status: "Sold", properties: updatedProperties })
    .eq("id", plotId);
  if (plotUpdateError) {
    console.error("Failed to update plot status", plotUpdateError);
  }

  const notifyRows = [
    ["Plot", plotNumber],
    ["Street", streetName || "—"],
    ["Client", clientName],
    ["Phone", clientPhone],
    ["Processed by", agentName],
  ];

  await writeAuditLog({
    actorId: user.id,
    actorName: agentName,
    actorRole: role,
    action: "allocation.created",
    entityType: ALLOCATIONS_TABLE,
    entityId: allocation.id,
    metadata: { plotId, plotNumber, streetName, clientName, clientPhone },
  });

  await Promise.allSettled([
    notifyEmails({
      subject: `Plot ${plotNumber} allocated — Trabuom Stool Lands`,
      templateData: {
        kind: "Allocation",
        plotNumber,
        streetName,
        actorName: agentName,
        date: date.toLocaleString("en-GB"),
        rows: notifyRows,
      },
      pdfBuffer,
      pdfFilename: `allocation-${plotNumber}.pdf`,
    }),
    notifyPhones(
      `TSL: Plot ${plotNumber} has been allocated to ${clientName} by ${agentName}. --Trabuom Stool Lands`,
      [clientPhone],
      {
        [clientPhone]: `Trabuom Stool Lands: Your allocation for Plot ${plotNumber}${streetName ? ` on ${streetName}` : ""} has been recorded successfully. --Trabuom Stool Lands`,
      },
    ),
  ]).then((results) => {
    results
      .filter((result) => result.status === "rejected")
      .forEach((result) => console.error("Allocation notification failed", result.reason));
  });

  return NextResponse.json({ id: allocation.id, pdfUrl });
}
