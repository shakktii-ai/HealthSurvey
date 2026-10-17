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
    entityType: {
      type: String,
      required: true,
      enum: [
        "Project",
        "Mandal",
        "Facility",
        "Village",
        "Stakeholder",
        "Family",
        "User",
        "SurveyRound",
        "Question",
        "QuestionVersion",
        "Assignment",
        "StakeholderTask",
        "SurveyResponse",
        "DataQualityScan",
        "DataQualityIssue",
        "DonorProjectAccess",
      ],
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
      enum: [
        "CREATE",
        "UPDATE",
        "STATUS_CHANGE",
        "DELETE",
        "SCAN_START",
        "SCAN_COMPLETE",
        "ACKNOWLEDGE",
        "RESOLVE",
        "AMEND",
        "INSPECT",
        "EXPORT",
        "GRANT_ACCESS",
        "REVOKE_ACCESS",
        "NOT_REQUIRED",
      ],
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
    timestamps: false,
  }
);

if (mongoose.models && mongoose.models.AuditLog) {
  delete mongoose.models.AuditLog;
}

const AuditLog = mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
