import connectToDatabase from "@/lib/mongodb";
import Question from "@/models/Question";
import QuestionVersion from "@/models/QuestionVersion";
import SurveyRound from "@/models/SurveyRound";
import Project from "@/models/Project";
import { logAudit } from "@/lib/audit";
import { validateConditions } from "@/utils/conditionEvaluator";
import {
  QUESTIONNAIRE_CATEGORIES,
  ANSWER_TYPES,
  QUESTION_STATUSES,
  SURVEY_ROUND_STATUSES,
} from "@/utils/constants";

// --- SURVEY ROUNDS LOGIC ---

/**
 * List all survey rounds with optional project filter and question count.
 */
export async function listSurveyRounds({ projectId = "", status = "", search = "" } = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.project = projectId;
  if (status) query.status = status;
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [{ name: regex }, { code: regex }, { targetTiming: regex }];
  }

  const rounds = await SurveyRound.find(query)
    .populate("project", "name code")
    .sort({ createdAt: -1 })
    .lean();

  // Attach question counts for each round
  const roundIds = rounds.map((r) => r._id);
  const questionCounts = await Question.aggregate([
    { $match: { rounds: { $in: roundIds }, status: { $ne: "archived" } } },
    { $unwind: "$rounds" },
    { $group: { _id: "$rounds", count: { $sum: 1 } } },
  ]);

  const countMap = new Map();
  for (const item of questionCounts) {
    countMap.set(item._id.toString(), item.count);
  }

  return rounds.map((r) => ({
    ...r,
    id: r._id.toString(),
    projectId: r.project?._id ? r.project._id.toString() : r.project?.toString(),
    questionCount: countMap.get(r._id.toString()) || 0,
  }));
}

/**
 * Get a single survey round by ID.
 */
export async function getSurveyRoundById(roundId) {
  await connectToDatabase();
  const round = await SurveyRound.findById(roundId).populate("project", "name code");
  if (!round) return null;

  const questionCount = await Question.countDocuments({
    rounds: round._id,
    status: { $ne: "archived" },
  });

  const safe = round.toSafeObject();
  safe.questionCount = questionCount;
  return safe;
}

/**
 * Create a new survey round.
 */
export async function createSurveyRound(data, actor) {
  await connectToDatabase();

  const {
    projectId,
    name,
    code,
    targetTiming = "",
    plannedStartDate = null,
    plannedEndDate = null,
    status = "planned",
    enableLightTouch = false,
    description = "",
  } = data;

  if (!projectId) throw new Error("Project selection is required");
  if (!name || !name.trim()) throw new Error("Round name is required");
  if (!code || !code.trim()) throw new Error("Round code is required (e.g. M0, M3, M6)");

  const project = await Project.findById(projectId);
  if (!project) throw new Error("Referenced project does not exist");

  const cleanCode = code.trim().toUpperCase();

  // Check unique code in project
  const existing = await SurveyRound.findOne({ project: projectId, code: cleanCode });
  if (existing) {
    throw new Error(`Round code '${cleanCode}' already exists for this project.`);
  }

  // Date validation
  const start = plannedStartDate ? new Date(plannedStartDate) : null;
  const end = plannedEndDate ? new Date(plannedEndDate) : null;
  if (start && end && end < start) {
    throw new Error("Planned end date cannot be earlier than planned start date.");
  }

  const round = await SurveyRound.create({
    project: projectId,
    name: name.trim(),
    code: cleanCode,
    targetTiming: targetTiming.trim(),
    plannedStartDate: start,
    plannedEndDate: end,
    status,
    enableLightTouch: Boolean(enableLightTouch),
    description: description.trim(),
    createdBy: actor.id || actor._id,
    updatedBy: actor.id || actor._id,
  });

  await logAudit({
    actor,
    entityType: "SurveyRound",
    entityId: round._id,
    action: "CREATE",
    after: round.toSafeObject(),
  });

  return round.toSafeObject();
}

/**
 * Update an existing survey round.
 */
export async function updateSurveyRound(roundId, data, actor) {
  await connectToDatabase();
  const round = await SurveyRound.findById(roundId);
  if (!round) throw new Error("Survey round not found");

  const before = round.toSafeObject();

  if (data.code && data.code.trim().toUpperCase() !== round.code) {
    const newCode = data.code.trim().toUpperCase();
    const existing = await SurveyRound.findOne({
      project: round.project,
      code: newCode,
      _id: { $ne: round._id },
    });
    if (existing) {
      throw new Error(`Round code '${newCode}' is already taken in this project.`);
    }
    round.code = newCode;
  }

  if (data.name !== undefined) round.name = data.name.trim();
  if (data.targetTiming !== undefined) round.targetTiming = data.targetTiming.trim();
  if (data.plannedStartDate !== undefined) {
    round.plannedStartDate = data.plannedStartDate ? new Date(data.plannedStartDate) : null;
  }
  if (data.plannedEndDate !== undefined) {
    round.plannedEndDate = data.plannedEndDate ? new Date(data.plannedEndDate) : null;
  }
  if (data.status !== undefined) {
    if (!Object.values(SURVEY_ROUND_STATUSES).includes(data.status)) {
      throw new Error(`Invalid round status: ${data.status}`);
    }
    round.status = data.status;
  }
  if (data.enableLightTouch !== undefined) {
    round.enableLightTouch = Boolean(data.enableLightTouch);
  }
  if (data.description !== undefined) round.description = data.description.trim();

  // Validate dates
  if (round.plannedStartDate && round.plannedEndDate && round.plannedEndDate < round.plannedStartDate) {
    throw new Error("Planned end date cannot be earlier than planned start date.");
  }

  round.updatedBy = actor.id || actor._id;
  await round.save();

  const after = round.toSafeObject();

  await logAudit({
    actor,
    entityType: "SurveyRound",
    entityId: round._id,
    action: "UPDATE",
    before,
    after,
  });

  return after;
}

// --- QUESTIONS & VERSIONING LOGIC ---

/**
 * List questions with rich filtering and pagination.
 */
export async function listQuestions({
  projectId = "",
  category = "",
  roundId = "",
  status = "",
  answerType = "",
  search = "",
  page = 1,
  limit = 20,
} = {}) {
  await connectToDatabase();
  const query = {};

  if (projectId) query.project = projectId;
  if (category) query.category = category;
  if (status) query.status = status;
  if (answerType) query.answerType = answerType;
  if (roundId) query.rounds = roundId;

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [
      { code: regex },
      { indicator: regex },
      { "text.en": regex },
      { "text.te": regex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Question.find(query)
      .populate("project", "name code")
      .populate("rounds", "name code targetTiming")
      .sort({ category: 1, code: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Question.countDocuments(query),
  ]);

  return {
    items: items.map((q) => ({
      ...q,
      id: q._id.toString(),
      projectId: q.project?._id ? q.project._id.toString() : q.project?.toString(),
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    limit: limitNum,
  };
}

/**
 * Get question by ID with populated details.
 */
export async function getQuestionById(questionId) {
  await connectToDatabase();
  const question = await Question.findById(questionId)
    .populate("project", "name code")
    .populate("rounds", "name code targetTiming enableLightTouch");

  if (!question) return null;
  return question.toSafeObject();
}

/**
 * Validates options array for choice-based questions.
 */
function validateAnswerOptions(answerType, options) {
  const choiceTypes = [
    ANSWER_TYPES.SINGLE_CHOICE,
    ANSWER_TYPES.MULTIPLE_CHOICE,
    ANSWER_TYPES.DROPDOWN,
  ];

  if (choiceTypes.includes(answerType)) {
    if (!Array.isArray(options) || options.length < 2) {
      throw new Error(`Choice-based questions (${answerType}) require at least 2 answer options.`);
    }

    const seenValues = new Set();
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      if (!opt.textEn || !opt.textEn.trim()) {
        throw new Error(`Option #${i + 1} is missing English text.`);
      }
      const val = (opt.value || opt.code || opt.textEn).trim().toLowerCase();
      if (!val) {
        throw new Error(`Option #${i + 1} has an empty value.`);
      }
      if (seenValues.has(val)) {
        throw new Error(`Duplicate option value detected: '${val}'. Each option value must be unique.`);
      }
      seenValues.add(val);
    }
  }
}

/**
 * Create a new question and initialize its version history (v1).
 */
export async function createQuestion(data, actor) {
  await connectToDatabase();

  const {
    projectId,
    category,
    code,
    indicator = "",
    text = {},
    answerType,
    options = [],
    isRequired = true,
    rounds = [],
    conditions = [],
    status = "draft",
  } = data;

  if (!projectId) throw new Error("Project selection is required");
  if (!category || !Object.values(QUESTIONNAIRE_CATEGORIES).includes(category)) {
    throw new Error(`Invalid questionnaire category: ${category}`);
  }
  if (!code || !code.trim()) throw new Error("Question code is required (e.g. B1, FP-1)");
  if (!text || !text.en || !text.en.trim()) {
    throw new Error("English question text is required");
  }
  if (!answerType || !Object.values(ANSWER_TYPES).includes(answerType)) {
    throw new Error(`Invalid answer type: ${answerType}`);
  }

  // Light-touch phone call category check
  if (category === QUESTIONNAIRE_CATEGORIES.LIGHT_TOUCH) {
    const lightTouchRounds = await SurveyRound.find({
      project: projectId,
      enableLightTouch: true,
      status: { $ne: "cancelled" },
    });
    if (lightTouchRounds.length === 0) {
      throw new Error(
        "Light-touch Phone Call category is only permitted when enabled on at least one survey round in this project."
      );
    }
  }

  const cleanCode = code.trim().toUpperCase();

  // Validate choice options
  const sanitizedOptions = (options || []).map((o, idx) => ({
    code: (o.code || `opt_${idx + 1}`).trim(),
    textEn: (o.textEn || "").trim(),
    textTe: (o.textTe || "").trim(),
    value: (o.value || o.code || o.textEn || `opt_${idx + 1}`).trim(),
  }));
  validateAnswerOptions(answerType, sanitizedOptions);

  // Validate conditional rules (checks self-referencing, operator validity, cycles)
  const availableQuestions = await Question.find({ project: projectId, category }).lean();
  const condValidation = validateConditions({
    questionCode: cleanCode,
    conditions,
    availableQuestions,
  });
  if (!condValidation.valid) {
    throw new Error(condValidation.error);
  }

  // Project + Category scoped uniqueness
  const existing = await Question.findOne({
    project: projectId,
    category,
    code: cleanCode,
  });
  if (existing) {
    throw new Error(`Question code '${cleanCode}' already exists for category '${category}' in this project.`);
  }

  // Create Question (Version 1)
  const question = await Question.create({
    project: projectId,
    category,
    code: cleanCode,
    indicator: (indicator || "").trim(),
    text: {
      en: text.en.trim(),
      te: (text.te || "").trim(),
    },
    answerType,
    options: sanitizedOptions,
    isRequired: Boolean(isRequired),
    rounds: Array.isArray(rounds)
      ? Array.from(new Set(rounds.map((r) => (r && r._id ? r._id.toString() : r ? r.toString() : "")).filter(Boolean)))
      : [],
    conditions: Array.isArray(conditions) ? conditions : [],
    status: Object.values(QUESTION_STATUSES).includes(status) ? status : "draft",
    currentVersion: 1,
    usageCount: 0,
    createdBy: actor.id || actor._id,
    updatedBy: actor.id || actor._id,
  });

  // Create immutable initial QuestionVersion (v1)
  await QuestionVersion.create({
    questionId: question._id,
    versionNumber: 1,
    project: projectId,
    category,
    code: cleanCode,
    indicator: question.indicator,
    text: question.text,
    answerType: question.answerType,
    options: question.options,
    isRequired: question.isRequired,
    rounds: question.rounds,
    conditions: question.conditions,
    status: question.status,
    changeNote: "Initial draft creation",
    createdBy: actor.id || actor._id,
  });

  await logAudit({
    actor,
    entityType: "Question",
    entityId: question._id,
    action: "CREATE",
    after: question.toSafeObject(),
  });

  return question.toSafeObject();
}

/**
 * Update a question with strict question versioning guarantees.
 * 
 * - Draft questions can be edited freely (updating version 1).
 * - Published / Active questions create a brand new version (v2, v3...),
 *   preserving the exact previous version in QuestionVersion.
 */
export async function updateQuestion(questionId, data, actor) {
  await connectToDatabase();
  const question = await Question.findById(questionId);
  if (!question) throw new Error("Question not found");

  if (question.status === "archived") {
    throw new Error("Archived questions cannot be modified.");
  }

  const before = question.toSafeObject();

  // Check code uniqueness if code changed
  let newCode = question.code;
  if (data.code && data.code.trim().toUpperCase() !== question.code) {
    newCode = data.code.trim().toUpperCase();
    const existing = await Question.findOne({
      project: question.project,
      category: question.category,
      code: newCode,
      _id: { $ne: question._id },
    });
    if (existing) {
      throw new Error(`Question code '${newCode}' already exists in this category.`);
    }
  }

  const newIndicator = data.indicator !== undefined ? data.indicator.trim() : question.indicator;
  const newText = {
    en: data.text?.en !== undefined ? data.text.en.trim() : question.text.en,
    te: data.text?.te !== undefined ? data.text.te.trim() : question.text.te,
  };
  if (!newText.en) throw new Error("English question text cannot be empty.");

  const newAnswerType = data.answerType || question.answerType;
  const newOptions = data.options !== undefined
    ? data.options.map((o, idx) => ({
        code: (o.code || `opt_${idx + 1}`).trim(),
        textEn: (o.textEn || "").trim(),
        textTe: (o.textTe || "").trim(),
        value: (o.value || o.code || o.textEn || `opt_${idx + 1}`).trim(),
      }))
    : question.options;

  validateAnswerOptions(newAnswerType, newOptions);

  const newIsRequired = data.isRequired !== undefined ? Boolean(data.isRequired) : question.isRequired;
  const newRounds =
    data.rounds !== undefined
      ? Array.from(new Set(data.rounds.map((r) => (r && r._id ? r._id.toString() : r ? r.toString() : "")).filter(Boolean)))
      : question.rounds;
  const newConditions = data.conditions !== undefined ? data.conditions : question.conditions;

  // Validate conditions
  const availableQuestions = await Question.find({
    project: question.project,
    category: question.category,
    _id: { $ne: question._id },
  }).lean();

  const condValidation = validateConditions({
    questionCode: newCode,
    questionId: question._id,
    conditions: newConditions,
    availableQuestions,
  });
  if (!condValidation.valid) {
    throw new Error(condValidation.error);
  }

  const wasActive = question.status === "active";
  const isPublishing = data.status === "active" && question.status === "draft";

  // Check if meaningful question contents changed
  const contentChanged =
    newCode !== question.code ||
    newIndicator !== question.indicator ||
    newText.en !== question.text.en ||
    newText.te !== question.text.te ||
    newAnswerType !== question.answerType ||
    JSON.stringify(newOptions) !== JSON.stringify(question.options) ||
    newIsRequired !== question.isRequired ||
    JSON.stringify(newRounds) !== JSON.stringify(question.rounds) ||
    JSON.stringify(newConditions) !== JSON.stringify(question.conditions);

  // If question was already published (active), content changes MUST create a new version!
  if (wasActive && contentChanged) {
    const nextVersion = question.currentVersion + 1;

    question.code = newCode;
    question.indicator = newIndicator;
    question.text = newText;
    question.answerType = newAnswerType;
    question.options = newOptions;
    question.isRequired = newIsRequired;
    question.rounds = newRounds;
    question.conditions = newConditions;
    question.currentVersion = nextVersion;
    if (data.status) question.status = data.status;
    question.updatedBy = actor.id || actor._id;

    await question.save();

    // Create new Version snapshot
    await QuestionVersion.create({
      questionId: question._id,
      versionNumber: nextVersion,
      project: question.project,
      category: question.category,
      code: newCode,
      indicator: newIndicator,
      text: newText,
      answerType: newAnswerType,
      options: newOptions,
      isRequired: newIsRequired,
      rounds: newRounds,
      conditions: newConditions,
      status: question.status,
      changeNote: data.changeNote || `Version ${nextVersion} update`,
      createdBy: actor.id || actor._id,
    });
  } else {
    // Draft question OR status change only without version increment
    question.code = newCode;
    question.indicator = newIndicator;
    question.text = newText;
    question.answerType = newAnswerType;
    question.options = newOptions;
    question.isRequired = newIsRequired;
    question.rounds = newRounds;
    question.conditions = newConditions;
    if (data.status) question.status = data.status;
    question.updatedBy = actor.id || actor._id;

    await question.save();

    // Update version 1 record if it's still draft
    if (question.currentVersion === 1) {
      await QuestionVersion.findOneAndUpdate(
        { questionId: question._id, versionNumber: 1 },
        {
          code: newCode,
          indicator: newIndicator,
          text: newText,
          answerType: newAnswerType,
          options: newOptions,
          isRequired: newIsRequired,
          rounds: newRounds,
          conditions: newConditions,
          status: question.status,
          changeNote: isPublishing ? "Published version 1" : "Draft update",
        }
      );
    }
  }

  const after = question.toSafeObject();

  await logAudit({
    actor,
    entityType: "Question",
    entityId: question._id,
    action: isPublishing ? "STATUS_CHANGE" : "UPDATE",
    before,
    after,
  });

  return after;
}

/**
 * Archive a question (soft deletion that preserves audit & survey integrity).
 */
export async function archiveQuestion(questionId, actor) {
  await connectToDatabase();
  const question = await Question.findById(questionId);
  if (!question) throw new Error("Question not found");

  const before = question.toSafeObject();
  question.status = "archived";
  question.updatedBy = actor.id || actor._id;
  await question.save();

  await QuestionVersion.create({
    questionId: question._id,
    versionNumber: question.currentVersion + 1,
    project: question.project,
    category: question.category,
    code: question.code,
    indicator: question.indicator,
    text: question.text,
    answerType: question.answerType,
    options: question.options,
    isRequired: question.isRequired,
    rounds: question.rounds,
    conditions: question.conditions,
    status: "archived",
    changeNote: "Question archived",
    createdBy: actor.id || actor._id,
  });

  const after = question.toSafeObject();

  await logAudit({
    actor,
    entityType: "Question",
    entityId: question._id,
    action: "STATUS_CHANGE",
    before,
    after,
  });

  return after;
}

/**
 * Retrieve all historical versions of a question.
 */
export async function getQuestionVersions(questionId) {
  await connectToDatabase();
  const versions = await QuestionVersion.find({ questionId })
    .populate("createdBy", "name email role")
    .populate("rounds", "name code targetTiming")
    .sort({ versionNumber: -1 })
    .lean();

  return versions.map((v) => ({
    ...v,
    id: v._id.toString(),
  }));
}

/**
 * Bulk update applicable survey rounds for multiple questions.
 * 
 * Supports:
 * - action: 'add' (adds selected rounds to existing rounds without duplicates)
 * - action: 'replace' (replaces existing rounds with selected rounds)
 * - action: 'remove' (removes selected rounds from questions)
 */
export async function bulkUpdateQuestionRounds(
  {
    questionIds = [],
    roundIds = [],
    action = "add", // 'add' | 'replace' | 'remove'
    projectId = "",
    category = "",
    status = "",
  },
  actor
) {
  await connectToDatabase();

  if (!Array.isArray(roundIds) || roundIds.length === 0) {
    throw new Error("At least one survey round must be specified.");
  }

  // Validate survey rounds exist
  const validRounds = await SurveyRound.find({ _id: { $in: roundIds } }).lean();
  if (validRounds.length === 0) {
    throw new Error("Specified survey rounds were not found.");
  }
  const validRoundIds = validRounds.map((r) => r._id);

  // Build question query
  const query = {};
  if (Array.isArray(questionIds) && questionIds.length > 0) {
    query._id = { $in: questionIds };
  } else {
    // If no specific questionIds, must provide at least projectId or category to prevent accidental global overrides
    if (!projectId && !category) {
      throw new Error("Either questionIds array or projectId filter must be provided.");
    }
    if (projectId) query.project = projectId;
    if (category) query.category = category;
  }
  if (status) {
    query.status = status;
  } else {
    // Avoid updating archived questions by default
    query.status = { $ne: "archived" };
  }

  const questions = await Question.find(query);
  if (questions.length === 0) {
    return {
      success: true,
      count: 0,
      message: "No matching questions found to update.",
    };
  }

  let updatedCount = 0;
  const validRoundIdStrings = new Set(validRoundIds.map((r) => r.toString()));

  for (const question of questions) {
    const existingRoundStrings = (question.rounds || []).map((r) => r.toString());
    let nextRoundStrings = [];

    if (action === "replace") {
      nextRoundStrings = Array.from(validRoundIdStrings);
    } else if (action === "remove") {
      nextRoundStrings = existingRoundStrings.filter((rId) => !validRoundIdStrings.has(rId));
    } else {
      // action === 'add' (default)
      const merged = new Set([...existingRoundStrings, ...validRoundIdStrings]);
      nextRoundStrings = Array.from(merged);
    }

    // Check if rounds actually changed
    const isUnchanged =
      existingRoundStrings.length === nextRoundStrings.length &&
      existingRoundStrings.every((id) => nextRoundStrings.includes(id));

    if (!isUnchanged) {
      question.rounds = nextRoundStrings;
      question.updatedBy = actor?.id || actor?._id;
      await question.save();

      // Keep latest QuestionVersion in sync
      await QuestionVersion.updateOne(
        { questionId: question._id, versionNumber: question.currentVersion || 1 },
        { rounds: nextRoundStrings }
      );

      updatedCount++;
    }
  }

  await logAudit({
    actor,
    entityType: "Question",
    entityId: questions[0]?._id,
    action: "BULK_UPDATE_ROUNDS",
    after: {
      action,
      updatedCount,
      targetQuestions: questions.length,
      roundCodes: validRounds.map((r) => r.code),
    },
  });

  return {
    success: true,
    count: updatedCount,
    totalTargeted: questions.length,
    message: `Successfully updated ${updatedCount} question(s) with ${validRounds.map((r) => r.code).join(", ")}.`,
  };
}

