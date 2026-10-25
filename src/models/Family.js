import mongoose from "mongoose";

const FamilySchema = new mongoose.Schema(
  {
    familyCode: {
      type: String,
      required: [true, "Family code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Associated project is required"],
      index: true,
    },
    mandal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandal",
      required: [true, "Associated mandal is required"],
      index: true,
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: [true, "Associated facility is required"],
      index: true,
    },
    village: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: [true, "Associated village is required"],
      index: true,
    },
    asha: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stakeholder",
      default: null,
      index: true,
    },
    ashas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Stakeholder",
      },
    ],
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stakeholder",
      default: null,
      index: true,
    },
    householdHeadName: {
      type: String,
      required: [true, "Household head name is required"],
      trim: true,
      maxlength: [120, "Household head name cannot exceed 120 characters"],
      index: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    normalizedPhone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    phoneOwner: {
      type: String,
      enum: {
        values: ["own", "relative", "neighbour", "asha"],
        message: "{VALUE} is not a valid phone owner option",
      },
      default: "own",
    },
    householdCharacteristics: {
      type: [String],
      enum: {
        values: ["tribal", "women_headed", "elderly_60_plus"],
        message: "{VALUE} is not a valid household characteristic",
      },
      default: [],
    },
    visitedPHCLast3Months: {
      type: String,
      enum: {
        values: ["yes", "no"],
        message: "{VALUE} is not a valid answer for visitedPHCLast3Months (must be yes or no)",
      },
      required: [true, "Visited PHC in last 3 months response is required"],
    },
    agreesToContact: {
      type: String,
      enum: {
        values: ["yes", "no"],
        message: "{VALUE} is not a valid answer for agreesToContact (must be yes or no)",
      },
      required: [true, "Agrees to contact response is required"],
    },
    travelTimeToPHC: {
      type: String,
      enum: {
        values: ["under_30_min", "30_min_to_1_hour", "1_to_2_hours", "over_2_hours"],
        message: "{VALUE} is not a valid travel time",
      },
      required: [true, "Travel time to PHC is required"],
    },
    reasonsForRepeatedCare: {
      type: [String],
      enum: {
        values: ["pregnancy", "child_under_5", "chronic_illness", "elderly_care", "other"],
        message: "{VALUE} is not a valid care reason",
      },
      default: [],
    },
    otherCareReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: [250, "Other care reason cannot exceed 250 characters"],
    },
    receivedDroneService: {
      type: String,
      enum: {
        values: ["yes", "no", "dont_know"],
        message: "{VALUE} is not a valid drone service status",
      },
      required: [true, "Received drone service response is required"],
    },
    ashaRemarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "ASHA remarks cannot exceed 500 characters"],
    },
    shortlisted: {
      type: Boolean,
      default: false,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast searching and duplicate detection
FamilySchema.index({ village: 1, householdHeadName: 1 });
FamilySchema.index({ project: 1, normalizedPhone: 1 });
FamilySchema.index({ mandal: 1, facility: 1 });

/**
 * Normalizes phone numbers for duplicate detection and consistent formatting.
 * Keeps only the last 10 digits for standard mobile comparison.
 */
FamilySchema.statics.normalizePhone = function (phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/**
 * Returns a sanitized object according to the requesting user's role.
 * Masks PII for unauthorized or non-admin roles (e.g. donors).
 */
FamilySchema.methods.toSafeObject = function (options = {}) {
  const isSuperadmin = options.isSuperadmin !== false;

  const projectObj = this.project?._id
    ? { id: this.project._id.toString(), name: this.project.name, code: this.project.code }
    : undefined;

  const mandalObj = this.mandal?._id
    ? { id: this.mandal._id.toString(), name: this.mandal.name, code: this.mandal.code }
    : undefined;

  const facilityObj = this.facility?._id
    ? { id: this.facility._id.toString(), name: this.facility.name, code: this.facility.code, facilityType: this.facility.facilityType }
    : undefined;

  const villageObj = this.village?._id
    ? { id: this.village._id.toString(), name: this.village.name, code: this.village.code }
    : undefined;

  const ashaObj = this.asha?._id
    ? { id: this.asha._id.toString(), fullName: this.asha.fullName, designation: this.asha.designation, phone: this.asha.phone }
    : null;

  const doctorObj = this.doctor?._id
    ? { id: this.doctor._id.toString(), fullName: this.doctor.fullName, designation: this.doctor.designation, phone: this.doctor.phone }
    : null;

  // Support multiple ASHAs with backward compatibility to single asha
  let ashasList = [];
  if (Array.isArray(this.ashas) && this.ashas.length > 0) {
    ashasList = this.ashas
      .map((a) =>
        a?._id
          ? { id: a._id.toString(), fullName: a.fullName, designation: a.designation, phone: a.phone }
          : null
      )
      .filter(Boolean);
  } else if (ashaObj) {
    ashasList = [ashaObj];
  }

  const creatorObj = this.createdBy?._id
    ? { id: this.createdBy._id.toString(), name: this.createdBy.name, email: this.createdBy.email }
    : undefined;

  // Mask phone number and name for non-admin viewers
  let safePhone = this.phoneNumber || "";
  let safeName = this.householdHeadName;

  if (!isSuperadmin) {
    safePhone = safePhone ? "••••••••••" : "";
    safeName = "Household Head (Protected)";
  }

  return {
    id: this._id.toString(),
    familyCode: this.familyCode,
    projectId: this.project?._id ? this.project._id.toString() : this.project?.toString(),
    project: projectObj,
    mandalId: this.mandal?._id ? this.mandal._id.toString() : this.mandal?.toString(),
    mandal: mandalObj,
    facilityId: this.facility?._id ? this.facility._id.toString() : this.facility?.toString(),
    facility: facilityObj,
    villageId: this.village?._id ? this.village._id.toString() : this.village?.toString(),
    village: villageObj,
    ashaId: this.asha?._id ? this.asha._id.toString() : this.asha?.toString() || (ashasList[0]?.id || null),
    asha: ashaObj || ashasList[0] || null,
    ashas: ashasList,
    ashaIds: Array.isArray(this.ashas) && this.ashas.length > 0
      ? this.ashas.map((a) => (a?._id ? a._id.toString() : a?.toString())).filter(Boolean)
      : ashaObj ? [ashaObj.id] : [],
    doctorId: this.doctor?._id ? this.doctor._id.toString() : this.doctor?.toString() || null,
    doctor: doctorObj,
    householdHeadName: safeName,
    phoneNumber: safePhone,
    phoneOwner: this.phoneOwner,
    householdCharacteristics: this.householdCharacteristics,
    visitedPHCLast3Months: this.visitedPHCLast3Months,
    agreesToContact: this.agreesToContact,
    travelTimeToPHC: this.travelTimeToPHC,
    reasonsForRepeatedCare: this.reasonsForRepeatedCare,
    otherCareReason: this.otherCareReason,
    receivedDroneService: this.receivedDroneService,
    ashaRemarks: this.ashaRemarks,
    shortlisted: this.shortlisted,
    status: this.status,
    createdBy: creatorObj,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

FamilySchema.set("strictPopulate", false);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.Family;
}

const Family = mongoose.models.Family || mongoose.model("Family", FamilySchema);

export default Family;
