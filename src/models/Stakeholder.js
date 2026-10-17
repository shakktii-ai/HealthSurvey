import mongoose from "mongoose";

const StakeholderSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [120, "Full name cannot exceed 120 characters"],
    },
    stakeholderType: {
      type: String,
      required: [true, "Stakeholder type is required"],
      enum: {
        values: ["asha", "facility_staff", "government_official"],
        message: "{VALUE} is not a valid stakeholder type",
      },
      index: true,
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
      default: null,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "",
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

StakeholderSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    stakeholderType: this.stakeholderType,
    projectId: this.projectId?._id ? this.projectId._id.toString() : this.projectId?.toString(),
    project: this.projectId?.name ? { id: this.projectId._id.toString(), name: this.projectId.name, code: this.projectId.code } : undefined,
    mandalId: this.mandalId?._id ? this.mandalId._id.toString() : this.mandalId?.toString(),
    mandal: this.mandalId?.name ? { id: this.mandalId._id.toString(), name: this.mandalId.name, code: this.mandalId.code } : undefined,
    facilityId: this.facilityId?._id ? this.facilityId._id.toString() : this.facilityId?.toString() || null,
    facility: this.facilityId?.name ? { id: this.facilityId._id.toString(), name: this.facilityId.name, code: this.facilityId.code } : null,
    phone: this.phone,
    designation: this.designation,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Stakeholder =
  mongoose.models.Stakeholder || mongoose.model("Stakeholder", StakeholderSchema);

export default Stakeholder;
