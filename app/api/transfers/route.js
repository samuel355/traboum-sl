import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { can, getEffectiveRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase";
import { canManagePlot, PLOT_TABLE } from "@/lib/plots";
import { findOrCreateClient } from "@/lib/clients";
import { generateAllocationPdf } from "@/lib/pdf";
import { transferOldDocKey, transferPdfKey, uploadToR2 } from "@/lib/r2";
import { notifyEmails } from "@/lib/email";
import { notifyPhones } from "@/lib/sms";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request) {
  const user = await currentUser();
  const role = getEffectiveRole(user);
  if (!user || !can(role, "transfer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const plotId = form.get("plotId");
  const plotNumber = form.get("plotNumber");
  const streetName = form.get("streetName");
  const newClientName = form.get("newClientName");
  const newClientEmail = form.get("newClientEmail");
  const newClientPhone = form.get("newClientPhone");
  const newClientAddress = form.get("newClientAddress");
  const paymentAmount = Number(form.get("paymentAmount"));
  const paymentMethod = form.get("paymentMethod");
  const paymentReference = form.get("paymentReference");
  const oldFile = form.get("oldAllocationFile");

  if (!plotId || !newClientName || !newClientPhone || !paymentAmount || !oldFile) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const recordedByName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
  const db = supabaseAdmin();

  // Manual/off-system entries (plot not in the trabuom table) have no owner
  // to check against — only re-verify ownership for real plot rows, the same
  // way /api/allocations does.
  if (!String(plotId).startsWith("manual-")) {
    const { data: plotRow } = await db.from(PLOT_TABLE).select("owner, status").eq("id", plotId).single();
    if (plotRow && !canManagePlot(role, plotRow, "transfer")) {
      return NextResponse.json({ error: "This plot isn't managed by Trabuom Stool Lands" }, { status: 403 });
    }
  }

  let clientId;
  try {
    clientId = await findOrCreateClient(db, {
      name: newClientName,
      phone: newClientPhone,
      email: newClientEmail,
      address: newClientAddress,
      userId: user.id,
      userName: recordedByName,
    });
  } catch (err) {
    console.error("Failed to find/create client", err);
    return NextResponse.json({ error: "Failed to save client details" }, { status: 500 });
  }

  const { data: transfer, error: insertError } = await db
    .from("tsl_transfers")
    .insert({
      plot_table: PLOT_TABLE,
      plot_id: String(plotId),
      plot_number: plotNumber,
      street_name: streetName || null,
      client_id: clientId,
      new_client_name: newClientName,
      new_client_email: newClientEmail || null,
      new_client_phone: newClientPhone,
      new_client_address: newClientAddress || null,
      agent: recordedByName,
      payment_amount: paymentAmount,
      payment_method: paymentMethod || null,
      payment_reference: paymentReference || null,
      recorded_by: user.id,
      recorded_by_name: recordedByName,
      // recorded_at defaults to now() in the DB.
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert transfer", insertError);
    return NextResponse.json({ error: "Failed to record transfer" }, { status: 500 });
  }

  let oldFileUrl = null;
  try {
    const oldBuffer = Buffer.from(await oldFile.arrayBuffer());
    oldFileUrl = await uploadToR2(
      oldBuffer,
      transferOldDocKey(transfer.id, oldFile.name),
      oldFile.type || "application/octet-stream",
    );
  } catch (err) {
    console.error("Failed to upload old allocation file", err);
  }

  const date = new Date();
  const referenceNumber = `TSL-${String(transfer.id).slice(-8).toUpperCase()}`;
  const fileNumber = `TSL-${String(plotNumber || "PLOT").replace(/\s+/g, "").toUpperCase()}-${date.getFullYear()}`;
  const pdfBuffer = await generateAllocationPdf({
    allocationId: transfer.id,
    referenceNumber,
    fileNumber,
    allocationDate: date.toISOString(),
    plotNumber,
    streetName,
    clientName: newClientName,
    clientEmail: newClientEmail,
    clientPhone: newClientPhone,
    clientAddress: newClientAddress,
    agent: recordedByName,
    amount: paymentAmount,
    date,
    kind: "Transfer of Allocation",
  });

  let pdfUrl = null;
  try {
    pdfUrl = await uploadToR2(pdfBuffer, transferPdfKey(transfer.id), "application/pdf");
  } catch (err) {
    console.error("Failed to upload transfer PDF", err);
  }

  await db
    .from("tsl_transfers")
    .update({ old_allocation_file_url: oldFileUrl, pdf_url: pdfUrl })
    .eq("id", transfer.id);

  const notifyRows = [
    ["Plot", plotNumber],
    ["Street", streetName || "—"],
    ["New client", newClientName],
    ["Phone", newClientPhone],
    ["Payment", `GHS ${paymentAmount.toLocaleString("en-GH")} (${paymentMethod || "—"})`],
    ["Recorded by", recordedByName],
  ];

  await Promise.allSettled([
    notifyEmails({
      subject: `Plot ${plotNumber} transferred — Trabuom Stool Lands`,
      templateData: {
        kind: "Transfer of Allocation",
        plotNumber,
        streetName,
        actorName: recordedByName,
        date: date.toLocaleString("en-GB"),
        rows: notifyRows,
      },
      pdfBuffer,
      pdfFilename: `transfer-${plotNumber}.pdf`,
    }),
    notifyPhones(
      `TSL: Plot ${plotNumber} allocation transferred to ${newClientName} by ${recordedByName}. --Trabuom Stool Lands`,
      [newClientPhone],
      {
        [newClientPhone]: `Trabuom Stool Lands: The transfer of Plot ${plotNumber}${streetName ? ` on ${streetName}` : ""} to your name has been recorded successfully. --Trabuom Stool Lands`,
      },
    ),
    writeAuditLog({
      actorId: user.id,
      actorName: recordedByName,
      actorRole: role,
      action: "transfer.created",
      entityType: "tsl_transfers",
      entityId: transfer.id,
      metadata: {
        plotId,
        plotNumber,
        streetName,
        newClientName,
        newClientPhone,
        paymentAmount,
        paymentMethod,
      },
    }),
  ]);

  return NextResponse.json({ id: transfer.id, pdfUrl });
}
