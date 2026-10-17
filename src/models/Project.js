import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [150, "Project name cannot exceed 150 characters"],
    },
    code: {
      type: String,
      required: [true, "Project code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: [/^[A-Z0-9_-]+$/, "Project code must be alphanumeric with optional dashes or underscores"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "{VALUE} is not a valid status",
      },
      default: "active",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    description: this.description,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);

export default Project;
