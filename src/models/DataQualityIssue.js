import mongoose from "mongoose";

const DataQualityIssueSchema = new mongoose.Schema(
  {
    issueCode: {
      type: String,
      required: [true, "Issue code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: [true, "Issue fingerprint is required"],
      trim: true,
      index: true,
    },
    issueType: {
      type: String,
      required: [true, "Issue type is required"],
      enum: {
        values: [
          "missing_required_answer",
          "invalid_answer_type",
          "invalid_option_value",
          "question_out_of_scope",
          "question_version_mismatch",
          "conditional_visibility_violation",
          "missing_consent",
          "duplicate_response",
          "completed_task_missing_response",
          "submitted_response_task_incomplete",
          "disabled_light_touch_violation",
          "inconsistent_references",
          "draft_on_cancelled_task",
          "invalid_submission_timestamp",
        ],
        message: "{VALUE} is not a valid issue type",
      },
      index: true,
    },
    severity: {
      type: String,
      required: [true, "Severity is required"],
      enum: {
        values: ["critical", "high", "medium", "low"],
        message: "{VALUE} is not a valid severity level",
      },
      index: true,
    },
    entityType: {
      type: String,
      required: [true, "Entity type is required"],
      enum: {
        values: ["SurveyResponse", "Assignment", "StakeholderTask"],
        message: "{VALUE} is not a valid entity type",
      },
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Entity ID is required"],
      index: true,
    },
    entityCode: {
      type: String,
      trim: true,
      default: "",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    surveyRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyRound",
      default: null,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      default: null,
      index: true,
    },
    familyCode: {
      type: String,
      trim: true,
      default: "",
    },
    stakeholder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stakeholder",
      default: null,
    },
    fieldWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    questionCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    suggestedAction: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["detected", "acknowledged", "resolved", "no_longer_detected"],
        message: "{VALUE} is not a valid issue status",
      },
      default: "detected",
      index: true,
    },
    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },
    lastDetectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastScanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DataQualityScan",
      default: null,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying, filtering, and reconciliation
DataQualityIssueSchema.index({ fingerprint: 1, status: 1 });
DataQualityIssueSchema.index({ project: 1, surveyRound: 1, severity: 1 });
DataQualityIssueSchema.index({ status: 1, severity: 1 });
DataQualityIssueSchema.index({ entityType: 1, entityId: 1 });

DataQualityIssueSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    issueCode: this.issueCode,
    fingerprint: this.fingerprint,
    issueType: this.issueType,
    severity: this.severity,
    entityType: this.entityType,
    entityId: this.entityId ? this.entityId.toString() : null,
    entityCode: this.entityCode,
    project: this.project
      ? this.project._id
        ? { id: this.project._id.toString(), name: this.project.name, code: this.project.code }
        : this.project.toString()
      : null,
    surveyRound: this.surveyRound
      ? this.surveyRound._id
        ? { id: this.surveyRound._id.toString(), name: this.surveyRound.name, code: this.surveyRound.code }
        : this.surveyRound.toString()
      : null,
    category: this.category,
    family: this.family
      ? this.family._id
        ? { id: this.family._id.toString(), familyCode: this.family.familyCode }
        : this.family.toString()
      : null,
    familyCode: this.familyCode,
    stakeholder: this.stakeholder
      ? this.stakeholder._id
        ? { id: this.stakeholder._id.toString(), fullName: this.stakeholder.fullName }
        : this.stakeholder.toString()
      : null,
    fieldWorker: this.fieldWorker
      ? this.fieldWorker._id
        ? { id: this.fieldWorker._id.toString(), name: this.fieldWorker.name, email: this.fieldWorker.email }
        : this.fieldWorker.toString()
      : null,
    questionCode: this.questionCode,
    description: this.description,
    suggestedAction: this.suggestedAction,
    status: this.status,
    firstDetectedAt: this.firstDetectedAt,
    lastDetectedAt: this.lastDetectedAt,
    lastScanId: this.lastScanId ? this.lastScanId.toString() : null,
    acknowledgedBy: this.acknowledgedBy
      ? this.acknowledgedBy._id
        ? { id: this.acknowledgedBy._id.toString(), name: this.acknowledgedBy.name, email: this.acknowledgedBy.email }
        : this.acknowledgedBy.toString()
      : null,
    acknowledgedAt: this.acknowledgedAt,
    resolvedBy: this.resolvedBy
      ? this.resolvedBy._id
        ? { id: this.resolvedBy._id.toString(), name: this.resolvedBy.name, email: this.resolvedBy.email }
        : this.resolvedBy.toString()
      : null,
    resolvedAt: this.resolvedAt,
    resolutionReason: this.resolutionReason,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

if (mongoose.models && mongoose.models.DataQualityIssue) {
  delete mongoose.models.DataQualityIssue;
}

const DataQualityIssue = mongoose.model("DataQualityIssue", DataQualityIssueSchema);

export default DataQualityIssue;
