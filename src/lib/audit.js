import { connectToDatabase } from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

function sanitizeData(data) {
  if (!data) return null;
  const obj = typeof data.toObject === "function" ? data.toObject() : { ...data };
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.phone; // Keep stakeholder phone numbers private from audit trails
  delete obj.phoneNumber; // Keep family phone numbers private from audit trails
  delete obj.normalizedPhone;
  if (obj.householdHeadName) {
    obj.householdHeadName = obj.householdHeadName.charAt(0) + "*** (Masked)";
  }
  if (obj.respondentName) {
    obj.respondentName = obj.respondentName.charAt(0) + "*** (Masked)";
  }
  if (Array.isArray(obj.answers)) {
    obj.answersCount = obj.answers.length;
    delete obj.answers;
  }
  delete obj.__v;
  return obj;
}

/**
 * Reusable audit logging utility.
 * Records actor, entity, action, and before/after values without blocking critical paths.
 */
export async function logAudit({ actor, entityType, entityId, action, before = null, after = null }) {
  try {
    await connectToDatabase();
    await AuditLog.create({
      actorId: actor.id || actor._id,
      actorEmail: actor.email,
      entityType,
      entityId,
      action,
      before: sanitizeData(before),
      after: sanitizeData(after),
      timestamp: new Date(),
    });
  } catch (error) {
    // Audit log error is logged without failing the user's primary action
    console.error("Audit log error:", error.message);
  }
}
