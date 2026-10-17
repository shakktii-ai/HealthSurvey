import mongoose from "mongoose";

const SurveyRoundSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Round name is required"],
      trim: true,
      maxlength: [100, "Round name cannot exceed 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Round code is required"],
      trim: true,
      uppercase: true,
      maxlength: [20, "Round code cannot exceed 20 characters"],
      match: [/^[A-Z0-9_-]+$/, "Round code must be alphanumeric with optional dashes or underscores"],
    },
    targetTiming: {
      type: String,
      trim: true,
      default: "",
      maxlength: [50, "Target timing cannot exceed 50 characters"],
    },
    plannedStartDate: {
      type: Date,
      default: null,
    },
    plannedEndDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["planned", "active", "completed", "cancelled"],
        message: "{VALUE} is not a valid round status",
      },
      default: "planned",
      index: true,
    },
    enableLightTouch: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Enforce uniqueness of round code within each project
SurveyRoundSchema.index({ project: 1, code: 1 }, { unique: true });

SurveyRoundSchema.pre("validate", function () {
  if (this.plannedStartDate && this.plannedEndDate && this.plannedEndDate < this.plannedStartDate) {
    throw new Error("Planned end date cannot be earlier than planned start date");
  }
});

SurveyRoundSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    projectId: this.project ? (this.project._id ? this.project._id.toString() : this.project.toString()) : null,
    project: this.project && this.project.name ? { id: this.project._id.toString(), name: this.project.name, code: this.project.code } : this.project,
    name: this.name,
    code: this.code,
    targetTiming: this.targetTiming,
    plannedStartDate: this.plannedStartDate,
    plannedEndDate: this.plannedEndDate,
    status: this.status,
    enableLightTouch: this.enableLightTouch,
    description: this.description,
    createdBy: this.createdBy,
    updatedBy: this.updatedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const SurveyRound =
  mongoose.models.SurveyRound || mongoose.model("SurveyRound", SurveyRoundSchema);

export default SurveyRound;
