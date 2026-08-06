import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendAllocationEmail({ to, subject, templateData, pdfBuffer, pdfFilename }) {
  const templatePath = path.resolve(process.cwd(), "emails", "allocation-notification.ejs");
  const html = await ejs.renderFile(templatePath, templateData);

  const attachments = pdfBuffer
    ? [{ filename: pdfFilename || "allocation.pdf", content: pdfBuffer, contentType: "application/pdf" }]
    : [];

  await transporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    attachments,
  });
}

export async function notifyEmails({ subject, templateData, pdfBuffer, pdfFilename }) {
  const emails = (process.env.NOTIFY_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!emails.length) return;

  await sendAllocationEmail({ to: emails, subject, templateData, pdfBuffer, pdfFilename });
}
