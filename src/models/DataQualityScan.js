import mongoose from "mongoose";

const DataQualityScanSchema = new mongoose.Schema(
  {
    scanCode: {
      type: String,
      required: [true, "Scan code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
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
    status: {
      type: String,
      enum: {
        values: ["running", "completed", "failed"],
        message: "{VALUE} is not a valid scan status",
      },
      default: "running",
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    totalScanned: {
      type: Number,
      default: 0,
    },
    recordsProcessed: {
      responses: { type: Number, default: 0 },
      assignments: { type: Number, default: 0 },
      stakeholderTasks: { type: Number, default: 0 },
    },
    issuesDetected: {
      type: Number,
      default: 0,
    },
    issuesCountBySeverity: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    newIssuesCount: {
      type: Number,
      default: 0,
    },
    reopenedIssuesCount: {
      type: Number,
      default: 0,
    },
    resolvedIssuesCount: {
      type: Number,
      default: 0,
    },
    unchangedIssuesCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Initiator is required"],
    },
  },
  {
    timestamps: true,
  }
);

DataQualityScanSchema.index({ project: 1, surveyRound: 1, createdAt: -1 });

DataQualityScanSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    scanCode: this.scanCode,
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
    status: this.status,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    totalScanned: this.totalScanned,
    recordsProcessed: this.recordsProcessed,
    issuesDetected: this.issuesDetected,
    issuesCountBySeverity: this.issuesCountBySeverity,
    newIssuesCount: this.newIssuesCount,
    reopenedIssuesCount: this.reopenedIssuesCount,
    resolvedIssuesCount: this.resolvedIssuesCount,
    unchangedIssuesCount: this.unchangedIssuesCount,
    errorMessage: this.errorMessage,
    initiatedBy: this.initiatedBy
      ? this.initiatedBy._id
        ? { id: this.initiatedBy._id.toString(), name: this.initiatedBy.name, email: this.initiatedBy.email }
        : this.initiatedBy.toString()
      : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

if (mongoose.models && mongoose.models.DataQualityScan) {
  delete mongoose.models.DataQualityScan;
}

const DataQualityScan = mongoose.model("DataQualityScan", DataQualityScanSchema);

export default DataQualityScan;
