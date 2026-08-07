// Clients directory + the reservation-deposit settings that govern the
// 40%-now / rest-in-3-months default (sysadmin-editable — see
// new_trabuom_sl_settings). Server-only helpers: both findOrCreateClient
// and fetchSettings take an already-constructed supabaseAdmin() client so
// callers control which DB client is used.

export const CLIENTS_TABLE = "new_trabuom_sl_clients";
export const RESERVATIONS_TABLE = "new_trabuom_sl_reservations";
export const SETTINGS_TABLE = "new_trabuom_sl_settings";
export const DOCUMENTS_TABLE = "new_trabuom_sl_documents";

export const DOC_TYPES = [
  "passport_photo",
  "site_plan",
  "cadastral",
  "indenture",
  "concurrence",
  "registration",
  "other",
];
export const DOC_TYPE_LABELS = {
  passport_photo: "Passport photo",
  site_plan: "Site plan",
  cadastral: "Cadastral plan",
  indenture: "Indenture / Lease",
  concurrence: "Lands Commission concurrence",
  registration: "Registration (title/deed)",
  other: "Other",
};

// The real Kumasi/Ashanti stool-land documentation pipeline, modeled as
// ordered stages for a client. "Allocation" is special-cased in the UI —
// it's satisfied by the client having an allocation record (with its
// system-generated PDF) rather than a manually uploaded document, since
// that's produced automatically the moment a plot is bought.
export const DOCUMENTATION_STAGES = [
  { key: "allocation", label: "Allocation", docType: null },
  { key: "site_plan", label: "Site plan", docType: "site_plan" },
  { key: "cadastral", label: "Cadastral plan", docType: "cadastral" },
  { key: "indenture", label: "Indenture / Lease", docType: "indenture" },
  { key: "concurrence", label: "Lands Commission concurrence", docType: "concurrence" },
  { key: "registration", label: "Registration (title/deed)", docType: "registration" },
];

export function formatGHS(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `GHS ${value.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Looks up a client by phone number, or creates one. Never overwrites an
 * existing client's details on repeat lookups — the first record for a
 * given phone number wins, since edits go through the dedicated Clients
 * page rather than silently through whatever form happens to submit next.
 */
export async function findOrCreateClient(db, { name, phone, email, address, userId, userName }) {
  const normalizedPhone = String(phone ?? "").trim();
  if (!normalizedPhone) throw new Error("Client phone is required");

  const { data: existing, error: findError } = await db
    .from(CLIENTS_TABLE)
    .select("id")
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await db
    .from(CLIENTS_TABLE)
    .insert({
      name,
      phone: normalizedPhone,
      email: email || null,
      address: address || null,
      created_by: userId,
      created_by_name: userName,
    })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
}

const DEFAULT_SETTINGS = { reservation_deposit_percent: 40, reservation_payment_period_months: 3 };

export async function fetchSettings(db) {
  const { data, error } = await db.from(SETTINGS_TABLE).select("*").eq("id", true).maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return data;
}

export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + Number(months));
  return result;
}

// Aggregates one client's money-movement rows into list/detail-view totals.
// Only 'active' reservations count toward the outstanding balance —
// 'converted' ones were superseded by a full allocation (already counted
// there), and 'cancelled' ones never happened.
export function summarizeClientRecords({ allocations = [], reservations = [], transfers = [] }) {
  const plotIds = new Set();
  let totalPaid = 0;
  let totalRemaining = 0;

  allocations.forEach((a) => {
    if (a.plot_id) plotIds.add(a.plot_id);
    totalPaid += Number(a.amount) || 0;
  });
  reservations.forEach((r) => {
    if (r.plot_id) plotIds.add(r.plot_id);
    totalPaid += Number(r.amount_paid) || 0;
    if (r.status === "active") {
      totalRemaining += Math.max(Number(r.total_amount) - Number(r.amount_paid), 0);
    }
  });
  transfers.forEach((t) => {
    if (t.plot_id) plotIds.add(t.plot_id);
    totalPaid += Number(t.payment_amount) || 0;
  });

  return { plotCount: plotIds.size, totalPaid, totalRemaining };
}
