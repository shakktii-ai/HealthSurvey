import mongoose from "mongoose";

/**
 * Lightweight audit trail for master data and administrative modifications.
 */
const AuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
    },
    actorRole: {
      type: String,
      default: "superadmin",
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ actorRole: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, timestamp: -1 });

if (mongoose.models && mongoose.models.AuditLog) {
  delete mongoose.models.AuditLog;
}

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
