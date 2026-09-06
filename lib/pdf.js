import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateAllocationPdf(data) {
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
    clientPhotoUrl,
    agent,
    amount,
    date = new Date(),
    kind = "Allocation",
  } = data;

  const templatePath = path.resolve(process.cwd(), "assets", "Trabuom_Allocation.pdf");
  const resolvedDate = allocationDate ? new Date(allocationDate) : new Date(date);
  const resolvedReference =
    referenceNumber || (allocationId ? `TSL-${String(allocationId).slice(-8).toUpperCase()}` : "—");
  const resolvedFileNumber =
    fileNumber ?? `TSL-${String(plotNumber || "PLOT").replace(/\s+/g, "").toUpperCase()}-${resolvedDate.getFullYear()}`;

  try {
    if (fs.existsSync(templatePath)) {
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const page = pdfDoc.getPage(0);
      const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const black = rgb(0, 0, 0);

      const draw = (text, x, y, options = {}) =>
        page.drawText(String(text ?? "—"), {
          x,
          y,
          size: 12,
          font: regular,
          color: black,
          ...options,
        });

      const plotLocation = [plotNumber, streetName].filter(Boolean).join(" ") || "—";

      draw("Trabuom", 240, 544, { font: bold, size: 11 });
      draw(plotLocation, 240, 524, { font: bold, size: 11 });
      draw(resolvedReference, 240, 501, { font: bold, size: 11 });
      draw(resolvedDate.toLocaleDateString("en-GB"), 240, 474, { font: bold, size: 11 });

      draw(clientName || "—", 242, 411, { font: bold, size: 11 });
      draw(resolvedFileNumber, 420, 198, { font: bold, size: 11 });

      if (clientPhotoUrl) {
        try {
          const response = await fetch(clientPhotoUrl);
          if (response.ok) {
            const imageBytes = await response.arrayBuffer();
            const contentType = response.headers.get("content-type") || "";
            const image = contentType.includes("png")
              ? await pdfDoc.embedPng(imageBytes)
              : contentType.includes("jpeg") || contentType.includes("jpg")
                ? await pdfDoc.embedJpg(imageBytes)
                : null;
            if (image) {
              const box = { x: 257, y: 648, width: 100, height: 129 };
              const scale = Math.min(box.width / image.width, box.height / image.height);
              const width = image.width * scale;
              const height = image.height * scale;
              page.drawImage(image, {
                x: box.x + (box.width - width) / 2,
                y: box.y + (box.height - height) / 2,
                width,
                height,
              });
            }
          }
        } catch (error) {
          console.error("Failed to embed client photo in allocation PDF", error);
        }
      }

      return Buffer.from(await pdfDoc.save());
    }
  } catch (error) {
    console.error("Failed to fill Trabuom allocation template, falling back to generic PDF", error);
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
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
  doc.text("Land Allocation Document", margin, 66);

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
