import mongoose from "mongoose";

const FacilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Facility name is required"],
      trim: true,
      maxlength: [120, "Facility name cannot exceed 120 characters"],
    },
    code: {
      type: String,
      required: [true, "Facility code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      match: [/^[A-Z0-9_-]+$/, "Facility code must be alphanumeric with optional dashes or underscores"],
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
    facilityType: {
      type: String,
      enum: {
        values: ["PHC", "AH", "CHC", "Sub-Center", "Other"],
        message: "{VALUE} is not a valid facility type",
      },
      default: "PHC",
    },
    serviceCategory: {
      type: String,
      enum: {
        values: ["Deep-dive", "Light-touch", "Standard"],
        message: "{VALUE} is not a valid service category",
      },
      default: "Standard",
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

FacilitySchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    projectId: this.projectId?._id ? this.projectId._id.toString() : this.projectId?.toString(),
    project: this.projectId?.name ? { id: this.projectId._id.toString(), name: this.projectId.name, code: this.projectId.code } : undefined,
    mandalId: this.mandalId?._id ? this.mandalId._id.toString() : this.mandalId?.toString(),
    mandal: this.mandalId?.name ? { id: this.mandalId._id.toString(), name: this.mandalId.name, code: this.mandalId.code } : undefined,
    facilityType: this.facilityType,
    serviceCategory: this.serviceCategory,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Facility =
  mongoose.models.Facility || mongoose.model("Facility", FacilitySchema);

export default Facility;
