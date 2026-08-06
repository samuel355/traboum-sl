// Mirrors get-plot's app/api/send-sms/route.js — same Arkesel account/API
// shape, called directly here (server-only) rather than proxied through an
// extra route.
export async function sendSms(phone, message) {
  const apiKey = process.env.ARKESEL_SMS_API;
  const sender = process.env.ARKESEL_SENDER_ID || "GetOnePlot";

  const url = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${apiKey}&to=${phone}&from=${sender}&sms=${encodeURIComponent(
    message,
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error("Arkesel SMS failed", phone, response.status);
  }
  return response.ok;
}

export async function notifyPhones(message) {
  const phones = (process.env.NOTIFY_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  await Promise.all(phones.map((phone) => sendSms(phone, message).catch(() => false)));
}
