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

const QuestionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: ["family", "asha", "facility_staff", "light_touch", "govt_official"],
        message: "{VALUE} is not a valid questionnaire category",
      },
      required: [true, "Questionnaire category is required"],
      index: true,
    },
    code: {
      type: String,
      required: [true, "Question code is required"],
      trim: true,
      uppercase: true,
      maxlength: [30, "Question code cannot exceed 30 characters"],
      match: [/^[A-Z0-9_-]+$/, "Question code must be alphanumeric with optional dashes or underscores"],
    },
    indicator: {
      type: String,
      trim: true,
      default: "",
      maxlength: [100, "Indicator cannot exceed 100 characters"],
    },
    text: {
      en: {
        type: String,
        required: [true, "English question text is required"],
        trim: true,
        maxlength: [1000, "English text cannot exceed 1000 characters"],
      },
      te: {
        type: String,
        default: "",
        trim: true,
        maxlength: [1500, "Telugu text cannot exceed 1500 characters"],
      },
    },
    answerType: {
      type: String,
      enum: {
        values: [
          "short_text",
          "long_text",
          "single_choice",
          "multiple_choice",
          "yes_no",
          "number",
          "date",
          "dropdown",
          "rating_scale",
          "image",
        ],
        message: "{VALUE} is not a valid answer type",
      },
      required: [true, "Answer type is required"],
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
      enum: {
        values: ["draft", "active", "archived"],
        message: "{VALUE} is not a valid question status",
      },
      default: "draft",
      index: true,
    },
    currentVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Enforce project and category aware question code uniqueness
QuestionSchema.index({ project: 1, category: 1, code: 1 }, { unique: true });

QuestionSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    projectId: this.project ? (this.project._id ? this.project._id.toString() : this.project.toString()) : null,
    project: this.project && this.project.name ? { id: this.project._id.toString(), name: this.project.name, code: this.project.code } : this.project,
    category: this.category,
    code: this.code,
    indicator: this.indicator,
    text: this.text,
    answerType: this.answerType,
    options: this.options || [],
    isRequired: this.isRequired,
    rounds: this.rounds ? this.rounds.map((r) => (r && r._id ? { id: r._id.toString(), name: r.name, code: r.code } : r.toString())) : [],
    conditions: this.conditions || [],
    status: this.status,
    currentVersion: this.currentVersion,
    usageCount: this.usageCount,
    createdBy: this.createdBy,
    updatedBy: this.updatedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

if (mongoose.models && mongoose.models.Question) {
  delete mongoose.models.Question;
}

const Question = mongoose.model("Question", QuestionSchema);

export default Question;
