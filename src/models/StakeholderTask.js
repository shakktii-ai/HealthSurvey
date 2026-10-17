import mongoose from "mongoose";

const StakeholderReassignmentSchema = new mongoose.Schema(
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

const StakeholderTaskSchema = new mongoose.Schema(
  {
    taskCode: {
      type: String,
      required: [true, "Task code is required"],
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
    stakeholder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stakeholder",
      required: [true, "Stakeholder reference is required"],
      index: true,
    },
    category: {
      type: String,
      required: [true, "Questionnaire category is required"],
      enum: {
        values: ["asha", "facility_staff", "light_touch", "govt_official"],
        message: "{VALUE} is not a valid stakeholder questionnaire category",
      },
      index: true,
    },
    fieldWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned field worker is required"],
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
      type: [StakeholderReassignmentSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active/completed tasks for same stakeholder, project, round, and category
StakeholderTaskSchema.index(
  { project: 1, surveyRound: 1, stakeholder: 1, category: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["assigned", "pending", "in_progress", "completed"] },
    },
  }
);

StakeholderTaskSchema.index({ fieldWorker: 1, status: 1 });
StakeholderTaskSchema.index({ surveyRound: 1, status: 1 });

if (mongoose.models && mongoose.models.StakeholderTask) {
  delete mongoose.models.StakeholderTask;
}

const StakeholderTask =
  mongoose.models.StakeholderTask ||
  mongoose.model("StakeholderTask", StakeholderTaskSchema);

export default StakeholderTask;
