import mongoose from "mongoose";

const OptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    textEn: { type: String, required: true, trim: true },
    textTe: { type: String, default: "", trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ConditionSchema = new mongoose.Schema(
  {
    dependsOnQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      default: null,
    },
    dependsOnQuestionCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    operator: {
      type: String,
      enum: ["equals", "not_equals", "contains", "is_empty", "is_not_empty"],
      required: true,
      default: "equals",
    },
    value: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const QuestionVersionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: [true, "Question reference is required"],
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["family", "asha", "facility_staff", "light_touch", "govt_official"],
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    indicator: {
      type: String,
      default: "",
      trim: true,
    },
    text: {
      en: {
        type: String,
        required: [true, "English question text is required"],
        trim: true,
      },
      te: {
        type: String,
        default: "",
        trim: true,
      },
    },
    answerType: {
      type: String,
      enum: [
        "short_text",
        "long_text",
        "single_choice",
        "multiple_choice",
        "yes_no",
        "number",
        "date",
        "dropdown",
        "rating_scale",
      ],
      required: true,
    },
    options: {
      type: [OptionSchema],
      default: [],
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    rounds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SurveyRound",
      },
    ],
    conditions: {
      type: [ConditionSchema],
      default: [],
    },
    isCoded: {
      type: Boolean,
      default: false,
    },
    isLightTouch: {
      type: Boolean,
      default: false,
    },
    translationStatus: {
      type: String,
      enum: ["draft", "interpreter_review_required", "approved"],
      default: "interpreter_review_required",
    },
    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },
    changeNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

QuestionVersionSchema.index({ questionId: 1, versionNumber: 1 }, { unique: true });

QuestionVersionSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    questionId: this.questionId ? this.questionId.toString() : null,
    versionNumber: this.versionNumber,
    projectId: this.project ? this.project.toString() : null,
    category: this.category,
    code: this.code,
    indicator: this.indicator,
    text: this.text,
    answerType: this.answerType,
    options: this.options || [],
    isRequired: this.isRequired,
    rounds: this.rounds ? this.rounds.map((r) => (r._id ? r._id.toString() : r.toString())) : [],
    conditions: this.conditions || [],
    status: this.status,
    changeNote: this.changeNote,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
  };
};

const QuestionVersion =
  mongoose.models.QuestionVersion ||
  mongoose.model("QuestionVersion", QuestionVersionSchema);

export default QuestionVersion;
