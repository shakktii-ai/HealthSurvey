import mongoose from "mongoose";

/**
 * DonorProjectAccess Schema.
 * Defines explicit project-level authorization grants for Donor accounts.
 * Donors can only view analytics and reports for projects explicitly granted by a Superadmin.
 */
const DonorProjectAccessSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Donor user reference is required"],
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "revoked"],
        message: "{VALUE} is not a valid access status",
      },
      default: "active",
      index: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Granting superadmin reference is required"],
    },
    grantedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique pair of donor and project to prevent duplicate grants
DonorProjectAccessSchema.index({ donor: 1, project: 1 }, { unique: true });

DonorProjectAccessSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    donorId: this.donor?._id ? this.donor._id.toString() : this.donor?.toString(),
    donor: this.donor?.name
      ? {
          id: this.donor._id.toString(),
          name: this.donor.name,
          email: this.donor.email,
        }
      : this.donor,
    projectId: this.project?._id ? this.project._id.toString() : this.project?.toString(),
    project: this.project?.name
      ? {
          id: this.project._id.toString(),
          name: this.project.name,
          code: this.project.code,
        }
      : this.project,
    status: this.status,
    grantedBy: this.grantedBy?._id ? this.grantedBy._id.toString() : this.grantedBy?.toString(),
    grantedAt: this.grantedAt,
    revokedBy: this.revokedBy?._id ? this.revokedBy._id.toString() : this.revokedBy?.toString(),
    revokedAt: this.revokedAt,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

if (mongoose.models && mongoose.models.DonorProjectAccess) {
  delete mongoose.models.DonorProjectAccess;
}

const DonorProjectAccess = mongoose.model("DonorProjectAccess", DonorProjectAccessSchema);

export default DonorProjectAccess;
