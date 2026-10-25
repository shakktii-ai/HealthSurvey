/**
 * Application constants and system enums.
 */
export const APP_PHASES = {
  PHASE_00: "Foundation Setup",
  PHASE_01: "Authentication & Role Management",
  PHASE_02: "Family Verification",
  PHASE_03: "Questionnaire Engine",
  PHASE_04: "Survey Collection",
  PHASE_05: "Field Operations & Assignments",
  PHASE_06: "Analytics & Impact Reporting",
};

export const QUESTIONNAIRE_CATEGORIES = {
  FAMILY: "family",
  ASHA: "asha",
  FACILITY_STAFF: "facility_staff",
  LIGHT_TOUCH: "light_touch",
  GOVT_OFFICIAL: "govt_official",
  DOCTOR: "doctor",
};

export const QUESTIONNAIRE_CATEGORY_LABELS = {
  family: "Family",
  asha: "ASHA",
  facility_staff: "Facility Staff",
  light_touch: "Light-touch Phone Call",
  govt_official: "Government Official",
  doctor: "Doctor Interview",
};

export const ANSWER_TYPES = {
  SHORT_TEXT: "short_text",
  LONG_TEXT: "long_text",
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  YES_NO: "yes_no",
  NUMBER: "number",
  DATE: "date",
  DROPDOWN: "dropdown",
  RATING_SCALE: "rating_scale",
  IMAGE: "image",
};

export const ANSWER_TYPE_LABELS = {
  short_text: "Short text",
  long_text: "Long text",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  yes_no: "Yes / No",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  rating_scale: "Rating scale",
  image: "Image with Geotag",
};

export const QUESTION_STATUSES = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
};

export const SURVEY_ROUND_STATUSES = {
  PLANNED: "planned",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export const CONDITIONAL_OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  CONTAINS: "contains",
  IS_EMPTY: "is_empty",
  IS_NOT_EMPTY: "is_not_empty",
};
