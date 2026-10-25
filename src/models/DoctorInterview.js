import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      default: null,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null,
    },
    questionVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionVersion",
      default: null,
    },
    versionNumber: {
      type: Number,
      default: 1,
    },
    questionCode: {
      type: String,
      default: "DOC_Q",
      trim: true,
      uppercase: true,
    },
    answerType: {
      type: String,
      default: "text",
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    questionTextSnapshot: {
      en: { type: String, default: "" },
      te: { type: String, default: "" },
    },
  },
  { _id: false }
);

const FamilyAssessmentSchema = new mongoose.Schema(
  {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      required: true,
    },
    healthStatus: {
      type: String,
      default: "",
    },
    treatmentAdherence: {
      type: String,
      default: "",
    },
    droneMedicineReceived: {
      type: String,
      default: "",
    },
    clinicalObservations: {
      type: String,
      default: "",
    },
    recommendations: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const DoctorInterviewSchema = new mongoose.Schema(
  {
    interviewCode: {
      type: String,
      required: [true, "Interview code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stakeholder",
      required: [true, "Doctor stakeholder reference is required"],
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      required: [true, "Facility reference is required"],
      index: true,
    },
    mandal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandal",
      default: null,
      index: true,
    },
    surveyRound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyRound",
      default: null,
      index: true,
    },
    interviewDate: {
      type: Date,
      default: Date.now,
      required: [true, "Interview date is required"],
      index: true,
    },
    interviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Interviewer user reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "in_progress", "completed"],
        message: "{VALUE} is not a valid interview status",
      },
      default: "draft",
      index: true,
    },
    answers: {
      type: [AnswerSchema],
      default: [],
    },
    linkedFamilies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Family",
        index: true,
      },
    ],
    familyAssessments: {
      type: [FamilyAssessmentSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
    completionNotes: {
      type: String,
      trim: true,
      default: "",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

DoctorInterviewSchema.index({ project: 1, facility: 1 });
DoctorInterviewSchema.index({ doctor: 1, interviewDate: -1 });
DoctorInterviewSchema.index({ linkedFamilies: 1 });

DoctorInterviewSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    interviewCode: this.interviewCode,
    doctor: this.doctor?._id
      ? {
          id: this.doctor._id.toString(),
          fullName: this.doctor.fullName,
          designation: this.doctor.designation,
          phone: this.doctor.phone,
          stakeholderType: this.doctor.stakeholderType,
        }
      : this.doctor?.toString() || null,
    doctorId: this.doctor?._id ? this.doctor._id.toString() : this.doctor?.toString() || null,
    project: this.project?._id
      ? { id: this.project._id.toString(), name: this.project.name, code: this.project.code }
      : this.project?.toString() || null,
    projectId: this.project?._id ? this.project._id.toString() : this.project?.toString() || null,
    facility: this.facility?._id
      ? {
          id: this.facility._id.toString(),
          name: this.facility.name,
          code: this.facility.code,
          facilityType: this.facility.facilityType,
        }
      : this.facility?.toString() || null,
    facilityId: this.facility?._id ? this.facility._id.toString() : this.facility?.toString() || null,
    mandal: this.mandal?._id
      ? { id: this.mandal._id.toString(), name: this.mandal.name, code: this.mandal.code }
      : this.mandal?.toString() || null,
    mandalId: this.mandal?._id ? this.mandal._id.toString() : this.mandal?.toString() || null,
    surveyRound: this.surveyRound?._id
      ? { id: this.surveyRound._id.toString(), name: this.surveyRound.name, code: this.surveyRound.code }
      : this.surveyRound?.toString() || null,
    surveyRoundId: this.surveyRound?._id ? this.surveyRound._id.toString() : this.surveyRound?.toString() || null,
    interviewDate: this.interviewDate,
    interviewer: this.interviewer?._id
      ? { id: this.interviewer._id.toString(), name: this.interviewer.name, email: this.interviewer.email, role: this.interviewer.role }
      : this.interviewer?.toString() || null,
    status: this.status,
    answers: this.answers || [],
    linkedFamilies: Array.isArray(this.linkedFamilies)
      ? this.linkedFamilies.map((f) =>
          f?._id
            ? {
                id: f._id.toString(),
                familyCode: f.familyCode,
                householdHeadName: f.householdHeadName,
                phoneNumber: f.phoneNumber,
                village: f.village?.name ? { id: f.village._id.toString(), name: f.village.name } : f.village,
              }
            : f?.toString()
        )
      : [],
    linkedFamilyIds: Array.isArray(this.linkedFamilies)
      ? this.linkedFamilies.map((f) => (f?._id ? f._id.toString() : f?.toString())).filter(Boolean)
      : [],
    notes: this.notes || "",
    completionNotes: this.completionNotes || "",
    familyAssessments: Array.isArray(this.familyAssessments)
      ? this.familyAssessments.map((a) => ({
          familyId: a.familyId?.toString(),
          healthStatus: a.healthStatus || "",
          treatmentAdherence: a.treatmentAdherence || "",
          droneMedicineReceived: a.droneMedicineReceived || "",
          clinicalObservations: a.clinicalObservations || "",
          recommendations: a.recommendations || "",
          notes: a.notes || "",
          updatedAt: a.updatedAt,
        }))
      : [],
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    createdAt: this.createdAt,
  };
};

DoctorInterviewSchema.set("strictPopulate", false);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.DoctorInterview;
}

const DoctorInterview =
  mongoose.models.DoctorInterview || mongoose.model("DoctorInterview", DoctorInterviewSchema);

export default DoctorInterview;
