import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
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
      required: true,
      trim: true,
      uppercase: true,
    },
    answerType: {
      type: String,
      required: true,
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

const ConsentSchema = new mongoose.Schema(
  {
    consentGiven: {
      type: Boolean,
      default: false,
    },
    consentTimestamp: {
      type: Date,
      default: null,
    },
    consentLanguage: {
      type: String,
      default: "en",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const RevisionHistorySchema = new mongoose.Schema(
  {
    revision: {
      type: Number,
      required: true,
    },
    submittedAt: {
      type: Date,
      required: true,
    },
    answers: {
      type: [AnswerSchema],
      default: [],
    },
    amendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const SurveyResponseSchema = new mongoose.Schema(
  {
    responseCode: {
      type: String,
      required: [true, "Response code is required"],
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
    category: {
      type: String,
      required: [true, "Questionnaire category is required"],
      enum: {
        values: ["family", "asha", "facility_staff", "light_touch", "govt_official", "doctor"],
        message: "{VALUE} is not a valid questionnaire category",
      },
      index: true,
    },
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      default: null,
    },
    stakeholderTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StakeholderTask",
      default: null,
    },
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
      default: null,
      index: true,
    },
    stakeholder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stakeholder",
      default: null,
      index: true,
    },
    fieldWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Field worker reference is required"],
      index: true,
    },
    respondentType: {
      type: String,
      trim: true,
      default: "",
    },
    respondentName: {
      type: String,
      trim: true,
      default: "",
    },
    language: {
      type: String,
      enum: ["en", "te"],
      default: "en",
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "submitted", "amended"],
        message: "{VALUE} is not a valid response status",
      },
      default: "draft",
      index: true,
    },
    answers: {
      type: [AnswerSchema],
      default: [],
    },
    consent: {
      type: ConsentSchema,
      default: () => ({}),
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastSavedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    revision: {
      type: Number,
      default: 1,
    },
    revisionHistory: {
      type: [RevisionHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate responses for the same family assignment and category
SurveyResponseSchema.index(
  { assignment: 1, category: 1 },
  {
    unique: true,
    partialFilterExpression: { assignment: { $exists: true, $ne: null } },
  }
);

// Prevent duplicate responses for the same shared stakeholder task
SurveyResponseSchema.index(
  { stakeholderTask: 1 },
  {
    unique: true,
    partialFilterExpression: { stakeholderTask: { $exists: true, $ne: null } },
  }
);

SurveyResponseSchema.index({ fieldWorker: 1, status: 1 });
SurveyResponseSchema.index({ project: 1, surveyRound: 1, category: 1 });

if (mongoose.models && mongoose.models.SurveyResponse) {
  delete mongoose.models.SurveyResponse;
}

const SurveyResponse = mongoose.model("SurveyResponse", SurveyResponseSchema);

export default SurveyResponse;
