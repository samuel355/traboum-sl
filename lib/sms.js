// Mirrors get-plot's app/api/send-sms/route.js — same Arkesel account/API
// shape, called directly here (server-only) rather than proxied through an
// extra route.
export async function sendSms(phone, message) {
  const apiKey = process.env.ARKESEL_SMS_API;
  if (!apiKey) {
    throw new Error("ARKESEL_SMS_API is not configured");
  }
  const sender = process.env.ARKESEL_SENDER_ID || "TrabuomSL";

  const url = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${apiKey}&to=${phone}&from=${sender}&sms=${encodeURIComponent(
    message,
  )}`;

  const response = await fetch(url);
  const responseBody = await response.text();
  if (!response.ok) {
    console.error("Arkesel SMS failed", phone, response.status, responseBody.slice(0, 500));
    return false;
  }
  return true;
}

export async function notifyPhones(message) {
  const phones = (process.env.NOTIFY_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (!phones.length) {
    console.warn("SMS notification skipped: NOTIFY_PHONES is empty");
    return [];
  }

  const results = await Promise.all(
    phones.map(async (phone) => {
      try {
        return { phone, sent: await sendSms(phone, message) };
      } catch (error) {
        console.error("SMS notification failed", phone, error);
        return { phone, sent: false };
      }
    }),
  );

  if (results.some((result) => !result.sent)) {
    console.error("One or more SMS notifications were not accepted", results);
  }
  return results;
}
