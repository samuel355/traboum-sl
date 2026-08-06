import { supabaseAdmin } from "./supabase";

export async function writeAuditLog({ actorId, actorName, actorRole, action, entityType, entityId, metadata }) {
  const { error } = await supabaseAdmin()
    .from("tsl_audit_log")
    .insert({
      actor_id: actorId,
      actor_name: actorName,
      actor_role: actorRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? {},
    });

  if (error) {
    // Audit logging should never break the primary action (allocation/
    // transfer already succeeded by the time this runs) — log and move on.
    console.error("Failed to write audit log", action, error);
  }
}
