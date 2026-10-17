import mongoose from "mongoose";

const MandalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Mandal name is required"],
      trim: true,
      maxlength: [100, "Mandal name cannot exceed 100 characters"],
    },
    code: {
      type: String,
      required: [true, "Mandal code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: [/^[A-Z0-9_-]+$/, "Mandal code must be alphanumeric with optional dashes or underscores"],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Associated project is required"],
      index: true,
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
  },
  {
    timestamps: true,
  }
);

MandalSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    projectId: this.projectId?._id ? this.projectId._id.toString() : this.projectId?.toString(),
    project: this.projectId?.name ? { id: this.projectId._id.toString(), name: this.projectId.name, code: this.projectId.code } : undefined,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Mandal =
  mongoose.models.Mandal || mongoose.model("Mandal", MandalSchema);

export default Mandal;
