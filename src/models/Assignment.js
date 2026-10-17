import mongoose from "mongoose";

const ReassignmentHistorySchema = new mongoose.Schema(
  {
    previousWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reassignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reassignedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const AssignmentSchema = new mongoose.Schema(
  {
    assignmentCode: {
      type: String,
      required: [true, "Assignment code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    surveyRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyRound",
      required: [true, "Survey round reference is required"],
      index: true,
    },
    fieldWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned field worker is required"],
      index: true,
    },
    assignmentType: {
      type: String,
      enum: {
        values: ["single_family", "village_batch"],
        message: "{VALUE} is not a valid assignment type",
      },
      default: "single_family",
      index: true,
    },
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: [true, "Associated family reference is required"],
      index: true,
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      index: true,
    },
    mandal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandal",
      index: true,
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["assigned", "pending", "in_progress", "completed", "cancelled", "not_required"],
        message: "{VALUE} is not a valid status",
      },
      default: "assigned",
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notRequiredReason: {
      type: String,
      trim: true,
      default: "",
    },
    notRequiredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notRequiredAt: {
      type: Date,
      default: null,
    },
    roundStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
      index: true,
    },
    roundCompletedAt: {
      type: Date,
      default: null,
    },
    taskOverrides: [
      {
        taskKey: { type: String, required: true },
        status: { type: String, enum: ["pending", "in_progress", "completed", "not_required"], default: "not_required" },
        reason: { type: String, trim: true, default: "" },
        markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        markedAt: { type: Date, default: Date.now },
      },
    ],
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
    reassignmentHistory: {
      type: [ReassignmentHistorySchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator user reference is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate active/completed assignments for same family and round
AssignmentSchema.index(
  { project: 1, surveyRound: 1, family: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["assigned", "pending", "in_progress", "completed"] },
    },
  }
);

// Helpful lookup indexes
AssignmentSchema.index({ fieldWorker: 1, status: 1 });
AssignmentSchema.index({ surveyRound: 1, status: 1 });
AssignmentSchema.index({ village: 1, surveyRound: 1 });

/**
 * Transform lean or JSON representation
 */
AssignmentSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

if (mongoose.models && mongoose.models.Assignment) {
  delete mongoose.models.Assignment;
}

const Assignment =
  mongoose.models.Assignment || mongoose.model("Assignment", AssignmentSchema);

export default Assignment;
