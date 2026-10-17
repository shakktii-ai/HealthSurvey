import mongoose from "mongoose";

const VillageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Village name is required"],
      trim: true,
      maxlength: [120, "Village name cannot exceed 120 characters"],
    },
    code: {
      type: String,
      required: [true, "Village code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: [/^[A-Z0-9_-]+$/, "Village code must be alphanumeric with optional dashes or underscores"],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Associated project is required"],
      index: true,
    },
    mandalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandal",
      required: [true, "Associated mandal is required"],
      index: true,
    },
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: [true, "Associated facility/PHC is required"],
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

VillageSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    projectId: this.projectId?._id ? this.projectId._id.toString() : this.projectId?.toString(),
    project: this.projectId?.name ? { id: this.projectId._id.toString(), name: this.projectId.name, code: this.projectId.code } : undefined,
    mandalId: this.mandalId?._id ? this.mandalId._id.toString() : this.mandalId?.toString(),
    mandal: this.mandalId?.name ? { id: this.mandalId._id.toString(), name: this.mandalId.name, code: this.mandalId.code } : undefined,
    facilityId: this.facilityId?._id ? this.facilityId._id.toString() : this.facilityId?.toString(),
    facility: this.facilityId?.name ? { id: this.facilityId._id.toString(), name: this.facilityId.name, code: this.facilityId.code } : undefined,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Village =
  mongoose.models.Village || mongoose.model("Village", VillageSchema);

export default Village;
