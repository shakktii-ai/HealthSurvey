/**
 * Conditional Display Evaluation & Validation Engine
 * 
 * Used for Phase 04 Dynamic Questionnaire Management and future survey execution (Phase 05).
 * 
 * Rules:
 * 1. Conditions are stored in a simple, structured JSON array on each question.
 * 2. Self-referencing (question depending on itself) is strictly disallowed.
 * 3. Circular dependencies (A depends on B, B depends on A) are detected and disallowed.
 * 4. Referenced parent questions must exist in the exact same project & category scope.
 */

import { CONDITIONAL_OPERATORS } from "@/utils/constants";

/**
 * Validates a list of conditions for a question.
 *
 * @param {Object} params
 * @param {string} params.questionCode - The question code being edited/created (e.g. "FP-2")
 * @param {string} [params.questionId] - Existing question ID, if editing
 * @param {Array} params.conditions - List of condition rules
 * @param {Array} params.availableQuestions - Other questions in the same project & category
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateConditions({
  questionCode,
  questionId = null,
  conditions = [],
  availableQuestions = [],
}) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return { valid: true, error: null };
  }

  const normalizedCode = (questionCode || "").trim().toUpperCase();
  const validOperators = Object.values(CONDITIONAL_OPERATORS);
  const questionsByCode = new Map();

  for (const q of availableQuestions) {
    const code = (q.code || "").trim().toUpperCase();
    if (code) {
      questionsByCode.set(code, q);
    }
  }

  for (const cond of conditions) {
    const parentCode = (cond.dependsOnQuestionCode || "").trim().toUpperCase();

    if (!parentCode) {
      return {
        valid: false,
        error: "Condition is missing parent question code reference.",
      };
    }

    // 1. Prevent self-referencing
    if (parentCode === normalizedCode) {
      return {
        valid: false,
        error: `Question ${normalizedCode} cannot conditionally depend on itself.`,
      };
    }

    if (questionId && cond.dependsOnQuestionId && cond.dependsOnQuestionId.toString() === questionId.toString()) {
      return {
        valid: false,
        error: `Question cannot conditionally depend on itself (matching ID).`,
      };
    }

    // 2. Validate referenced parent exists in same context
    const parentQuestion = questionsByCode.get(parentCode);
    if (!parentQuestion) {
      return {
        valid: false,
        error: `Referenced question '${parentCode}' does not exist in this project & category questionnaire.`,
      };
    }

    // 3. Validate operator
    if (!validOperators.includes(cond.operator)) {
      return {
        valid: false,
        error: `Invalid conditional operator '${cond.operator}'. Allowed: ${validOperators.join(", ")}`,
      };
    }

    // 4. Circular dependency check
    // If parentQuestion depends on normalizedCode, circular dependency!
    const visited = new Set([normalizedCode]);
    let currentParentCode = parentCode;

    while (currentParentCode) {
      if (visited.has(currentParentCode)) {
        return {
          valid: false,
          error: `Circular dependency detected involving question '${parentCode}' and '${normalizedCode}'.`,
        };
      }
      visited.add(currentParentCode);

      const parentObj = questionsByCode.get(currentParentCode);
      if (parentObj && Array.isArray(parentObj.conditions) && parentObj.conditions.length > 0) {
        // Check next parent in the chain
        currentParentCode = (parentObj.conditions[0]?.dependsOnQuestionCode || "").trim().toUpperCase();
      } else {
        break;
      }
    }
  }

  return { valid: true, error: null };
}

/**
 * Evaluates a single condition against a map of respondent answers.
 *
 * @param {Object} condition - { dependsOnQuestionCode, operator, value }
 * @param {Record<string, any>} answers - Map of { [questionCode]: answerValue }
 * @returns {boolean} Whether the condition is met
 */
export function evaluateCondition(condition, answers = {}) {
  if (!condition || !condition.dependsOnQuestionCode) return true;

  const parentCode = condition.dependsOnQuestionCode.trim().toUpperCase();
  const rawAnswer = answers[parentCode];
  const expectedValue = (condition.value || "").trim().toLowerCase();

  switch (condition.operator) {
    case CONDITIONAL_OPERATORS.EQUALS: {
      if (rawAnswer === null || rawAnswer === undefined) return false;
      return String(rawAnswer).trim().toLowerCase() === expectedValue;
    }

    case CONDITIONAL_OPERATORS.NOT_EQUALS: {
      if (rawAnswer === null || rawAnswer === undefined) return true;
      return String(rawAnswer).trim().toLowerCase() !== expectedValue;
    }

    case CONDITIONAL_OPERATORS.CONTAINS: {
      if (!rawAnswer) return false;
      if (Array.isArray(rawAnswer)) {
        return rawAnswer.some((val) => String(val).trim().toLowerCase() === expectedValue);
      }
      return String(rawAnswer).toLowerCase().includes(expectedValue);
    }

    case CONDITIONAL_OPERATORS.IS_EMPTY: {
      return (
        rawAnswer === null ||
        rawAnswer === undefined ||
        rawAnswer === "" ||
        (Array.isArray(rawAnswer) && rawAnswer.length === 0)
      );
    }

    case CONDITIONAL_OPERATORS.IS_NOT_EMPTY: {
      return (
        rawAnswer !== null &&
        rawAnswer !== undefined &&
        rawAnswer !== "" &&
        (!Array.isArray(rawAnswer) || rawAnswer.length > 0)
      );
    }

    default:
      return true;
  }
}

/**
 * Helper for Future Survey UI (Phase 05):
 * Checks whether a question should be displayed given the current answers collected so far.
 *
 * @param {Object} question
 * @param {Record<string, any>} answers - Form answers object
 * @returns {boolean}
 */
export function shouldDisplayQuestion(question, answers = {}) {
  if (!question.conditions || question.conditions.length === 0) {
    return true;
  }

  // All conditions must evaluate to true (AND logic)
  return question.conditions.every((cond) => evaluateCondition(cond, answers));
}
