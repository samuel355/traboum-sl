import { jsPDF } from "jspdf";

// Generic placeholder allocation-letter layout — Trabuom Stool Lands will
// supply their real stool-land allocation template later, at which point
// this function is the only thing that needs to change (callers just pass
// the same `data` shape in). Uses jsPDF's built-in text/line drawing only
// (no canvas/DOM), so this runs fine server-side in a Next.js API route.
export function generateAllocationPdf(data) {
  const {
    allocationId,
    referenceNumber,
    fileNumber,
    allocationDate,
    plotNumber,
    streetName,
    siteName = "Trabuom Sector 1",
    clientName,
    clientEmail,
    clientPhone,
    clientAddress,
    agent,
    amount,
    date = new Date(),
    kind = "Allocation", // "Allocation" | "Transfer of Allocation"
  } = data;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const resolvedDate = allocationDate ? new Date(allocationDate) : new Date(date);
  const resolvedReference = referenceNumber ?? allocationId ?? "—";
  const resolvedFileNumber =
    fileNumber ??
    `TSL-${String(plotNumber || "PLOT").replace(/\s+/g, "").toUpperCase()}-${resolvedDate.getFullYear()}`;
  const navy = [11, 14, 45];
  const margin = 56;
  let y = margin;

  doc.setFillColor(...navy);
  doc.rect(0, 0, 595, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Trabuom Stool Lands", margin, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(kind === "Transfer of Allocation" ? "Transfer of Allocation" : "Land Allocation Document", margin, 66);

  y = 130;
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Reference No.: ${resolvedReference}`, margin, y);
  doc.text(`Allocation Date: ${resolvedDate.toLocaleDateString("en-GB")}`, 595 - margin, y, { align: "right" });
  y += 18;
  doc.text(`File No.: ${resolvedFileNumber}`, margin, y);

  y += 30;
  doc.setDrawColor(214, 218, 236);
  doc.line(margin, y, 595 - margin, y);

  y += 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Plot Details", margin, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  [
    ["Site", siteName],
    ["Plot Number", plotNumber || "—"],
    ["Street / Location", streetName || "—"],
  ].forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 140, y);
    y += 18;
  });

  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Allottee Details", margin, y);
  y += 20;
  doc.setFontSize(11);
  [
    ["Name", clientName || "—"],
    ["Phone", clientPhone || "—"],
    ["Email", clientEmail || "—"],
    ["Address", clientAddress || "—"],
    amount ? ["Amount (GHS)", Number(amount).toLocaleString("en-GH")] : null,
    ["Processed by", agent || "—"],
  ]
    .filter(Boolean)
    .forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), margin + 140, y);
      y += 18;
    });

  y += 50;
  doc.setDrawColor(214, 218, 236);
  doc.line(margin, y, margin + 180, y);
  doc.line(595 - margin - 180, y, 595 - margin, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 160);
  doc.text("Authorised signatory", margin, y);
  doc.text("Allottee signature", 595 - margin - 180, y);

  doc.setFontSize(8);
  doc.setTextColor(150, 158, 190);
  doc.text(
    "This is a placeholder document layout — replace with the official Trabuom Stool Lands allocation template.",
    margin,
    780,
  );

  return Buffer.from(doc.output("arraybuffer"));
}
