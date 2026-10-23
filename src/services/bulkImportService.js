import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import connectToDatabase from "@/lib/mongodb";
import Project from "@/models/Project";
import Mandal from "@/models/Mandal";
import Facility from "@/models/Facility";
import Village from "@/models/Village";
import Stakeholder from "@/models/Stakeholder";
import Family from "@/models/Family";
import Counter from "@/models/Counter";
import { logAudit } from "@/lib/audit";

/**
 * Simplified 18-column schema for master data creation and relationship resolution.
 * Survey-only fields (visit history, drone receipt, travel time, questionnaire answers)
 * are excluded from master data import and collected during survey rounds.
 */
export const BULK_IMPORT_COLUMNS = [
  "Entity Type",
  "Code",
  "Name",
  "Parent Code",
  "Facility Code",
  "Status",
  "Start Date",
  "End Date",
  "Description",
  "Facility Type",
  "Service Category",
  "Stakeholder Type",
  "Designation",
  "Phone Number",
  "Phone Owner",
  "Household Characteristics",
  "ASHA Worker Reference",
  "Shortlisted",
];

export const SUPPORTED_ENTITY_TYPES = [
  "Project",
  "Mandal",
  "Facility",
  "Village",
  "Stakeholder",
  "Family",
];

/**
 * Generates a professionally styled Excel workbook with EXACTLY ONE worksheet named 'Master Data'.
 * Includes:
 * - Frozen header row
 * - Table autofilters
 * - Data validation dropdowns for enumerated columns
 * - Cell notes (comments) with concise column instructions
 * - High-contrast, clean administrative styling (slate-900 header, white bold text)
 * - 6 consistent fictional demo records covering all six entity types
 */
export async function generateTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HealthSurvey Enterprise";
  workbook.lastModifiedBy = "HealthSurvey Enterprise";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Master Data", {
    views: [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: 1,
        activeCell: "A2",
      },
    ],
    properties: {
      defaultRowHeight: 20,
    },
  });

  worksheet.columns = [
    { header: "Entity Type *", key: "entityType", width: 16 },
    { header: "Code *", key: "code", width: 18 },
    { header: "Name *", key: "name", width: 32 },
    { header: "Parent Code", key: "parentCode", width: 18 },
    { header: "Facility Code", key: "facilityCode", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Start Date", key: "startDate", width: 14 },
    { header: "End Date", key: "endDate", width: 14 },
    { header: "Description", key: "description", width: 32 },
    { header: "Facility Type", key: "facilityType", width: 16 },
    { header: "Service Category", key: "serviceCategory", width: 18 },
    { header: "Stakeholder Type", key: "stakeholderType", width: 20 },
    { header: "Designation", key: "designation", width: 22 },
    { header: "Phone Number", key: "phoneNumber", width: 16 },
    { header: "Phone Owner", key: "phoneOwner", width: 14 },
    { header: "Household Characteristics", key: "householdCharacteristics", width: 28 },
    { header: "ASHA Worker Reference", key: "ashaRef", width: 22 },
    { header: "Shortlisted", key: "shortlisted", width: 14 },
  ];

  // Header row visual styling
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.font = {
    name: "Calibri",
    size: 10,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Slate-900
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: false,
  };

  // Header cell notes (concise instructions)
  worksheet.getCell("A1").note = "Mandatory: Select from dropdown (Project, Mandal, Facility, Village, Stakeholder, Family)";
  worksheet.getCell("B1").note = "Mandatory: Unique business code (e.g. PRJ001, MAN001, FAC001, VIL001, STK001, FAM001)";
  worksheet.getCell("C1").note = "Mandatory: Entity Name or Household Head Name";
  worksheet.getCell("D1").note = "Primary Parent: Project Code for Mandal; Mandal Code for Facility/Village/Stakeholder; Village Code for Family";
  worksheet.getCell("E1").note = "Secondary Facility Reference: Required for Village; Optional for Stakeholder";
  worksheet.getCell("F1").note = "Status: 'active' or 'inactive' (default is 'active')";
  worksheet.getCell("G1").note = "Required for Project only: format YYYY-MM-DD";
  worksheet.getCell("H1").note = "Optional for Project: format YYYY-MM-DD";
  worksheet.getCell("I1").note = "Optional Project description";
  worksheet.getCell("J1").note = "For Facility only: PHC, AH, CHC, Sub-Center, Other";
  worksheet.getCell("K1").note = "For Facility only: Standard, Deep-dive, Light-touch";
  worksheet.getCell("L1").note = "Required for Stakeholder: asha, facility_staff, government_official";
  worksheet.getCell("M1").note = "Optional Stakeholder title/designation";
  worksheet.getCell("N1").note = "Optional 10-digit mobile number for Stakeholder or Family";
  worksheet.getCell("O1").note = "For Family: own, relative, neighbour, asha (default: own)";
  worksheet.getCell("P1").note = "For Family: comma-separated characteristics (tribal, women_headed, elderly_60_plus)";
  worksheet.getCell("Q1").note = "For Family: optional ASHA Code or Phone Number";
  worksheet.getCell("R1").note = "For Family: yes or no (default: no)";

  // 6 Fictional Demonstration Rows with Internally Consistent Codes & Hierarchy
  const demoRows = [
    {
      entityType: "Project",
      code: "PRJ-DEMO-01",
      name: "Tribal Health Impact Mission",
      parentCode: "",
      facilityCode: "",
      status: "active",
      startDate: "2026-01-01",
      endDate: "2027-12-31",
      description: "Integrated health monitoring and drone diagnostic delivery in tribal agency catchments",
      facilityType: "",
      serviceCategory: "",
      stakeholderType: "",
      designation: "",
      phoneNumber: "",
      phoneOwner: "",
      householdCharacteristics: "",
      ashaRef: "",
      shortlisted: "",
    },
    {
      entityType: "Mandal",
      code: "MAN-DEMO-01",
      name: "Araku Valley",
      parentCode: "PRJ-DEMO-01",
      facilityCode: "",
      status: "active",
      startDate: "",
      endDate: "",
      description: "",
      facilityType: "",
      serviceCategory: "",
      stakeholderType: "",
      designation: "",
      phoneNumber: "",
      phoneOwner: "",
      householdCharacteristics: "",
      ashaRef: "",
      shortlisted: "",
    },
    {
      entityType: "Facility",
      code: "FAC-DEMO-01",
      name: "Araku Valley PHC",
      parentCode: "MAN-DEMO-01",
      facilityCode: "",
      status: "active",
      startDate: "",
      endDate: "",
      description: "",
      facilityType: "PHC",
      serviceCategory: "Deep-dive",
      stakeholderType: "",
      designation: "",
      phoneNumber: "",
      phoneOwner: "",
      householdCharacteristics: "",
      ashaRef: "",
      shortlisted: "",
    },
    {
      entityType: "Village",
      code: "VIL-DEMO-01",
      name: "Padmapuram",
      parentCode: "MAN-DEMO-01",
      facilityCode: "FAC-DEMO-01",
      status: "active",
      startDate: "",
      endDate: "",
      description: "",
      facilityType: "",
      serviceCategory: "",
      stakeholderType: "",
      designation: "",
      phoneNumber: "",
      phoneOwner: "",
      householdCharacteristics: "",
      ashaRef: "",
      shortlisted: "",
    },
    {
      entityType: "Stakeholder",
      code: "STK-DEMO-01",
      name: "P. Sarada Devi",
      parentCode: "MAN-DEMO-01",
      facilityCode: "FAC-DEMO-01",
      status: "active",
      startDate: "",
      endDate: "",
      description: "",
      facilityType: "",
      serviceCategory: "",
      stakeholderType: "asha",
      designation: "Village ASHA Worker",
      phoneNumber: "9876543210",
      phoneOwner: "",
      householdCharacteristics: "",
      ashaRef: "",
      shortlisted: "",
    },
    {
      entityType: "Family",
      code: "FAM-DEMO-01",
      name: "P. Rama Rao",
      parentCode: "VIL-DEMO-01",
      facilityCode: "",
      status: "active",
      startDate: "",
      endDate: "",
      description: "",
      facilityType: "",
      serviceCategory: "",
      stakeholderType: "",
      designation: "",
      phoneNumber: "9123456789",
      phoneOwner: "own",
      householdCharacteristics: "tribal, elderly_60_plus",
      ashaRef: "STK-DEMO-01",
      shortlisted: "yes",
    },
  ];

  for (const rowData of demoRows) {
    const row = worksheet.addRow(rowData);
    row.font = { name: "Calibri", size: 10 };
    row.alignment = { vertical: "middle" };
  }

  // Set AutoFilter over demo rows
  worksheet.autoFilter = "A1:R7";

  // Configure Excel Data Validations (Dropdowns) for rows 2 to 500
  for (let r = 2; r <= 500; r++) {
    // Column A: Entity Type
    worksheet.getCell(`A${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Project,Mandal,Facility,Village,Stakeholder,Family"'],
      showErrorMessage: true,
      errorTitle: "Invalid Entity Type",
      error: "Please select one of the allowed entity types from the dropdown.",
    };

    // Column F: Status
    worksheet.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"active,inactive"'],
      showErrorMessage: true,
      errorTitle: "Invalid Status",
      error: "Status must be 'active' or 'inactive'.",
    };

    // Column J: Facility Type
    worksheet.getCell(`J${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"PHC,AH,CHC,Sub-Center,Other"'],
    };

    // Column K: Service Category
    worksheet.getCell(`K${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Standard,Deep-dive,Light-touch"'],
    };

    // Column L: Stakeholder Type
    worksheet.getCell(`L${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"asha,facility_staff,government_official"'],
    };

    // Column O: Phone Owner
    worksheet.getCell(`O${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"own,relative,neighbour,asha"'],
    };

    // Column R: Shortlisted
    worksheet.getCell(`R${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"yes,no"'],
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Normalizes string keys and values from arbitrary Excel input.
 */
function cleanString(val) {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

/**
 * Normalizes entity type names (e.g. "projects" -> "Project", "phc" -> "Facility").
 */
function normalizeEntityType(rawType) {
  const clean = cleanString(rawType).toLowerCase().replace(/[\s_-]+/g, "");
  if (clean === "project" || clean === "projects") return "Project";
  if (clean === "mandal" || clean === "mandals") return "Mandal";
  if (clean === "facility" || clean === "facilities" || clean === "phc") return "Facility";
  if (clean === "village" || clean === "villages") return "Village";
  if (clean === "stakeholder" || clean === "stakeholders") return "Stakeholder";
  if (clean === "family" || clean === "families" || clean === "household") return "Family";
  return cleanString(rawType);
}

/**
 * Normalizes column header matching by stripping asterisks and extra spaces.
 */
function normalizeHeaderName(header) {
  return cleanString(header).replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Parses an Excel buffer into normalized raw row items with original row indices.
 */
export function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("Uploaded Excel workbook contains no worksheets.");
  }

  // Strictly read the first worksheet (single-sheet workflow)
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawJson = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

  if (rawJson.length === 0) {
    return { sheetName, totalSheets: wb.SheetNames.length, rows: [] };
  }

  const rows = rawJson.map((row, idx) => {
    const normalizedRow = {
      _rowNumber: idx + 2, // Header is row 1, data starts row 2
    };

    const rowKeys = Object.keys(row);
    for (const expectedCol of BULK_IMPORT_COLUMNS) {
      const targetNorm = normalizeHeaderName(expectedCol);
      const matchKey = rowKeys.find(
        (k) => normalizeHeaderName(k) === targetNorm
      );
      normalizedRow[expectedCol] = matchKey ? cleanString(row[matchKey]) : "";
    }

    // Support legacy column mappings if user uploads old format
    if (!normalizedRow["Name"] && row["Household Head Name"]) {
      normalizedRow["Name"] = cleanString(row["Household Head Name"]);
    }
    if (!normalizedRow["ASHA Worker Reference"] && row["ASHA Reference"]) {
      normalizedRow["ASHA Worker Reference"] = cleanString(row["ASHA Reference"]);
    }

    return normalizedRow;
  });

  return {
    sheetName,
    totalSheets: wb.SheetNames.length,
    rows,
  };
}

/**
 * Parses comma-separated values into array of clean lowercase strings.
 */
function parseCommaList(val) {
  if (!val) return [];
  return String(val)
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/[\s-]+/g, "_"))
    .filter(Boolean);
}

/**
 * Validates, deduplicates, and resolves hierarchical dependencies across all 6 entity types.
 * Processes entities in topological order regardless of Excel row order.
 */
export async function validateBulkImportRows(parsedRows) {
  await connectToDatabase();

  const totalRows = parsedRows.length;
  if (totalRows === 0) {
    return {
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        byType: {},
      },
      previewRows: [],
      canImport: false,
    };
  }

  // Pre-fetch all active master data for relationship resolution & duplicate detection
  const [
    existingProjects,
    existingMandals,
    existingFacilities,
    existingVillages,
    existingStakeholders,
    existingFamilies,
  ] = await Promise.all([
    Project.find({}).lean(),
    Mandal.find({}).lean(),
    Facility.find({}).lean(),
    Village.find({}).lean(),
    Stakeholder.find({}).lean(),
    Family.find({}).lean(),
  ]);

  // Lookup maps for existing DB records (keyed by uppercase code or identifiers)
  const dbProjects = new Map(existingProjects.map((p) => [p.code.toUpperCase(), p]));
  const dbMandals = new Map(existingMandals.map((m) => [m.code.toUpperCase(), m]));
  const dbFacilities = new Map(existingFacilities.map((f) => [f.code.toUpperCase(), f]));
  const dbVillages = new Map(existingVillages.map((v) => [v.code.toUpperCase(), v]));
  const dbStakeholders = new Map(
    existingStakeholders.map((s) => [s.phone || s._id.toString(), s])
  );
  const dbFamiliesByCode = new Map(
    existingFamilies.filter((f) => f.familyCode).map((f) => [f.familyCode.toUpperCase(), f])
  );
  const dbFamiliesByPhone = new Map(
    existingFamilies
      .filter((f) => f.normalizedPhone)
      .map((f) => [f.normalizedPhone, f])
  );

  // In-batch maps to allow dependent entities to resolve parents defined later in the sheet
  const batchProjects = new Map();
  const batchMandals = new Map();
  const batchFacilities = new Map();
  const batchVillages = new Map();
  const batchStakeholders = new Map();
  const batchFamilies = new Map();

  // Intra-batch seen keys to catch duplicate codes within the uploaded file itself
  const seenBatchKeys = new Set();

  // First Pass: Classify rows, extract codes, and detect intra-batch duplicates
  const annotatedRows = parsedRows.map((row) => {
    const rawType = row["Entity Type"];
    const entityType = normalizeEntityType(rawType);
    const code = cleanString(row["Code"]).toUpperCase();
    const name = cleanString(row["Name"]);
    const parentCode = cleanString(row["Parent Code"]).toUpperCase();
    const facilityCode = cleanString(row["Facility Code"]).toUpperCase();
    const status = (cleanString(row["Status"]).toLowerCase() === "inactive") ? "inactive" : "active";

    const item = {
      rowNumber: row._rowNumber,
      entityType,
      rawType,
      code,
      name,
      parentCode,
      facilityCode,
      status,
      raw: row,
      errors: [],
      warnings: [],
      resolvedHierarchy: {},
      importStatus: "pending", // "valid" | "invalid" | "duplicate_skipped"
    };

    if (!rawType || !SUPPORTED_ENTITY_TYPES.includes(entityType)) {
      item.errors.push(
        `Invalid or unsupported Entity Type '${rawType}'. Must be one of: ${SUPPORTED_ENTITY_TYPES.join(", ")}`
      );
      item.importStatus = "invalid";
      return item;
    }

    if (code) {
      const batchKey = `${entityType}:${code}`;
      if (seenBatchKeys.has(batchKey)) {
        item.errors.push(`Duplicate ${entityType} code '${code}' appears multiple times in uploaded file.`);
        item.importStatus = "invalid";
        return item;
      }
      seenBatchKeys.add(batchKey);
    }

    return item;
  });

  // Index rows into batch candidate pools (only if no initial format errors)
  for (const row of annotatedRows) {
    if (row.importStatus === "invalid") continue;
    if (row.entityType === "Project" && row.code) batchProjects.set(row.code, row);
    if (row.entityType === "Mandal" && row.code) batchMandals.set(row.code, row);
    if (row.entityType === "Facility" && row.code) batchFacilities.set(row.code, row);
    if (row.entityType === "Village" && row.code) batchVillages.set(row.code, row);
    if (row.entityType === "Stakeholder") {
      const key = row.code || row.raw["Phone Number"] || `ROW_${row.rowNumber}`;
      batchStakeholders.set(key, row);
    }
    if (row.entityType === "Family" && row.code) batchFamilies.set(row.code, row);
  }

  // Code format validator: alphanumeric with optional dash/underscore
  const codeRegex = /^[A-Z0-9_-]+$/;

  // -------------------------------------------------------------
  // Dependency Order Validation: Projects -> Mandals -> Facilities -> Villages -> Stakeholders -> Families
  // -------------------------------------------------------------

  // Level 1: Projects
  for (const row of annotatedRows.filter((r) => r.entityType === "Project")) {
    if (row.importStatus === "invalid") continue;

    if (!row.code) {
      row.errors.push("Project Code is required.");
    } else if (!codeRegex.test(row.code)) {
      row.errors.push(`Project code '${row.code}' must be alphanumeric with optional dashes or underscores.`);
    }

    if (!row.name) {
      row.errors.push("Project Name is required.");
    } else if (row.name.length > 150) {
      row.errors.push("Project name cannot exceed 150 characters.");
    }

    const startDateStr = row.raw["Start Date"];
    if (!startDateStr) {
      row.errors.push("Start Date is required for Projects (format: YYYY-MM-DD).");
    } else {
      const d = new Date(startDateStr);
      if (isNaN(d.getTime())) {
        row.errors.push(`Invalid Start Date '${startDateStr}'. Use YYYY-MM-DD.`);
      }
    }

    const endDateStr = row.raw["End Date"];
    if (endDateStr) {
      const ed = new Date(endDateStr);
      if (isNaN(ed.getTime())) {
        row.errors.push(`Invalid End Date '${endDateStr}'. Use YYYY-MM-DD.`);
      }
    }

    // Check DB Duplicate
    if (row.code && dbProjects.has(row.code)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Project code '${row.code}' already exists in database. Skipped to prevent overwriting.`);
      continue;
    }

    if (row.errors.length > 0) {
      row.importStatus = "invalid";
    } else {
      row.importStatus = "valid";
    }
  }

  // Level 2: Mandals (Depends on Project)
  for (const row of annotatedRows.filter((r) => r.entityType === "Mandal")) {
    if (row.importStatus === "invalid") continue;

    if (!row.code) {
      row.errors.push("Mandal Code is required.");
    } else if (!codeRegex.test(row.code)) {
      row.errors.push(`Mandal code '${row.code}' must be alphanumeric with optional dashes or underscores.`);
    }

    if (!row.name) {
      row.errors.push("Mandal Name is required.");
    } else if (row.name.length > 100) {
      row.errors.push("Mandal name cannot exceed 100 characters.");
    }

    // Parent resolution (Project Code)
    const projCode = row.parentCode;
    if (!projCode) {
      row.errors.push("Parent Code (Project Code) is required for Mandals.");
    } else if (dbProjects.has(projCode)) {
      const proj = dbProjects.get(projCode);
      row.resolvedHierarchy.project = { id: proj._id.toString(), name: proj.name, code: proj.code, source: "db" };
    } else if (batchProjects.has(projCode)) {
      const batchProj = batchProjects.get(projCode);
      if (batchProj.importStatus === "invalid") {
        row.errors.push(`Dependency failure: Parent Project '${projCode}' in batch has validation errors.`);
      } else {
        row.resolvedHierarchy.project = { code: projCode, name: batchProj.name, source: "batch" };
      }
    } else {
      row.errors.push(`Referenced parent Project '${projCode}' not found in database or uploaded batch.`);
    }

    // Check DB Duplicate
    if (row.code && dbMandals.has(row.code)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Mandal code '${row.code}' already exists in database. Skipped to prevent overwriting.`);
      continue;
    }

    if (row.errors.length > 0) {
      row.importStatus = "invalid";
    } else {
      row.importStatus = "valid";
    }
  }

  // Level 3: Facilities (Depends on Mandal and indirectly Project)
  for (const row of annotatedRows.filter((r) => r.entityType === "Facility")) {
    if (row.importStatus === "invalid") continue;

    if (!row.code) {
      row.errors.push("Facility Code is required.");
    } else if (!codeRegex.test(row.code)) {
      row.errors.push(`Facility code '${row.code}' must be alphanumeric with optional dashes or underscores.`);
    }

    if (!row.name) {
      row.errors.push("Facility Name is required.");
    } else if (row.name.length > 120) {
      row.errors.push("Facility name cannot exceed 120 characters.");
    }

    const validFacTypes = ["PHC", "AH", "CHC", "Sub-Center", "Other"];
    const facType = cleanString(row.raw["Facility Type"]) || "PHC";
    if (!validFacTypes.includes(facType)) {
      row.errors.push(`Invalid Facility Type '${facType}'. Allowed: ${validFacTypes.join(", ")}`);
    }

    const validCats = ["Deep-dive", "Light-touch", "Standard"];
    const cat = cleanString(row.raw["Service Category"]) || "Standard";
    if (!validCats.includes(cat)) {
      row.errors.push(`Invalid Service Category '${cat}'. Allowed: ${validCats.join(", ")}`);
    }

    // Parent resolution (Mandal Code)
    const mandalCode = row.parentCode;
    if (!mandalCode) {
      row.errors.push("Parent Code (Mandal Code) is required for Facilities.");
    } else if (dbMandals.has(mandalCode)) {
      const mandal = dbMandals.get(mandalCode);
      const projId = mandal.projectId?._id ? mandal.projectId._id.toString() : mandal.projectId?.toString();
      row.resolvedHierarchy.mandal = { id: mandal._id.toString(), name: mandal.name, code: mandal.code, source: "db" };
      row.resolvedHierarchy.projectId = projId;
    } else if (batchMandals.has(mandalCode)) {
      const batchMandal = batchMandals.get(mandalCode);
      if (batchMandal.importStatus === "invalid") {
        row.errors.push(`Dependency failure: Parent Mandal '${mandalCode}' in batch has validation errors.`);
      } else {
        row.resolvedHierarchy.mandal = { code: mandalCode, name: batchMandal.name, source: "batch" };
        row.resolvedHierarchy.projectCode = batchMandal.parentCode;
      }
    } else {
      row.errors.push(`Referenced parent Mandal '${mandalCode}' not found in database or uploaded batch.`);
    }

    // Check DB Duplicate
    if (row.code && dbFacilities.has(row.code)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Facility code '${row.code}' already exists in database. Skipped to prevent overwriting.`);
      continue;
    }

    if (row.errors.length > 0) {
      row.importStatus = "invalid";
    } else {
      row.importStatus = "valid";
    }
  }

  // Level 4: Villages (Depends on Mandal and Facility)
  for (const row of annotatedRows.filter((r) => r.entityType === "Village")) {
    if (row.importStatus === "invalid") continue;

    if (!row.code) {
      row.errors.push("Village Code is required.");
    } else if (!codeRegex.test(row.code)) {
      row.errors.push(`Village code '${row.code}' must be alphanumeric with optional dashes or underscores.`);
    }

    if (!row.name) {
      row.errors.push("Village Name is required.");
    } else if (row.name.length > 120) {
      row.errors.push("Village name cannot exceed 120 characters.");
    }

    const mandalCode = row.parentCode;
    const facCode = row.facilityCode;

    if (!mandalCode) {
      row.errors.push("Parent Code (Mandal Code) is required for Villages.");
    } else if (dbMandals.has(mandalCode)) {
      const m = dbMandals.get(mandalCode);
      row.resolvedHierarchy.mandal = { id: m._id.toString(), name: m.name, code: m.code, source: "db" };
      row.resolvedHierarchy.projectId = m.projectId?.toString();
    } else if (batchMandals.has(mandalCode)) {
      const bm = batchMandals.get(mandalCode);
      if (bm.importStatus === "invalid") {
        row.errors.push(`Dependency failure: Parent Mandal '${mandalCode}' in batch has validation errors.`);
      } else {
        row.resolvedHierarchy.mandal = { code: mandalCode, name: bm.name, source: "batch" };
        row.resolvedHierarchy.projectCode = bm.parentCode;
      }
    } else {
      row.errors.push(`Referenced parent Mandal '${mandalCode}' not found in database or uploaded batch.`);
    }

    if (!facCode) {
      row.errors.push("Facility Code is required for Villages.");
    } else if (dbFacilities.has(facCode)) {
      const f = dbFacilities.get(facCode);
      row.resolvedHierarchy.facility = { id: f._id.toString(), name: f.name, code: f.code, source: "db" };
    } else if (batchFacilities.has(facCode)) {
      const bf = batchFacilities.get(facCode);
      if (bf.importStatus === "invalid") {
        row.errors.push(`Dependency failure: Associated Facility '${facCode}' in batch has validation errors.`);
      } else {
        row.resolvedHierarchy.facility = { code: facCode, name: bf.name, source: "batch" };
      }
    } else {
      row.errors.push(`Referenced Facility '${facCode}' not found in database or uploaded batch.`);
    }

    // Check DB Duplicate
    if (row.code && dbVillages.has(row.code)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Village code '${row.code}' already exists in database. Skipped to prevent overwriting.`);
      continue;
    }

    if (row.errors.length > 0) {
      row.importStatus = "invalid";
    } else {
      row.importStatus = "valid";
    }
  }

  // Level 5: Stakeholders (Depends on Mandal and optional Facility)
  for (const row of annotatedRows.filter((r) => r.entityType === "Stakeholder")) {
    if (row.importStatus === "invalid") continue;

    if (!row.name) {
      row.errors.push("Full Name is required for Stakeholders.");
    }

    const validTypes = ["asha", "facility_staff", "government_official"];
    const stType = cleanString(row.raw["Stakeholder Type"]).toLowerCase();
    if (!validTypes.includes(stType)) {
      row.errors.push(`Invalid Stakeholder Type '${stType}'. Allowed: ${validTypes.join(", ")}`);
    }

    const mandalCode = row.parentCode;
    if (!mandalCode) {
      row.errors.push("Parent Code (Mandal Code) is required for Stakeholders.");
    } else if (dbMandals.has(mandalCode)) {
      const m = dbMandals.get(mandalCode);
      row.resolvedHierarchy.mandal = { id: m._id.toString(), name: m.name, code: m.code, source: "db" };
      row.resolvedHierarchy.projectId = m.projectId?.toString();
    } else if (batchMandals.has(mandalCode)) {
      const bm = batchMandals.get(mandalCode);
      if (bm.importStatus === "invalid") {
        row.errors.push(`Dependency failure: Parent Mandal '${mandalCode}' in batch has validation errors.`);
      } else {
        row.resolvedHierarchy.mandal = { code: mandalCode, name: bm.name, source: "batch" };
        row.resolvedHierarchy.projectCode = bm.parentCode;
      }
    } else {
      row.errors.push(`Referenced parent Mandal '${mandalCode}' not found in database or uploaded batch.`);
    }

    const facCode = row.facilityCode;
    if (facCode) {
      if (dbFacilities.has(facCode)) {
        const f = dbFacilities.get(facCode);
        row.resolvedHierarchy.facility = { id: f._id.toString(), name: f.name, code: f.code, source: "db" };
      } else if (batchFacilities.has(facCode)) {
        const bf = batchFacilities.get(facCode);
        if (bf.importStatus === "invalid") {
          row.errors.push(`Dependency failure: Facility '${facCode}' in batch has validation errors.`);
        } else {
          row.resolvedHierarchy.facility = { code: facCode, name: bf.name, source: "batch" };
        }
      } else {
        row.errors.push(`Referenced Facility '${facCode}' not found in database or uploaded batch.`);
      }
    }

    // Check DB Duplicate by phone if phone is provided
    const phone = cleanString(row.raw["Phone Number"]);
    if (phone && dbStakeholders.has(phone)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Stakeholder with phone '${phone}' already exists in database. Skipped to prevent overwriting.`);
      continue;
    }

    if (row.errors.length > 0) {
      row.importStatus = "invalid";
    } else {
      row.importStatus = "valid";
    }
  }

  // Level 6: Families (Depends on Village)
  for (const row of annotatedRows.filter((r) => r.entityType === "Family")) {
    if (row.importStatus === "invalid") continue;

    if (!row.name) {
      row.errors.push("Household Head Name is required for Families.");
    }

    const vilCode = row.parentCode;
    if (!vilCode) {
      row.errors.push("Parent Code (Village Code) is required for Families.");
    } else if (dbVillages.has(vilCode)) {
      const v = dbVillages.get(vilCode);
      row.resolvedHierarchy.village = { id: v._id.toString(), name: v.name, code: v.code, source: "db" };
      row.resolvedHierarchy.facilityId = v.facilityId?.toString();
      row.resolvedHierarchy.mandalId = v.mandalId?.toString();
      row.resolvedHierarchy.projectId = v.projectId?.toString();
    } else if (batchVillages.has(vilCode)) {
      const bv = batchVillages.get(vilCode);
      if (bv.importStatus === "invalid") {
        row.errors.push(`Dependency failure: Parent Village '${vilCode}' in batch has validation errors.`);
      } else {
        row.resolvedHierarchy.village = { code: vilCode, name: bv.name, source: "batch" };
        row.resolvedHierarchy.facilityCode = bv.facilityCode;
        row.resolvedHierarchy.mandalCode = bv.parentCode;
      }
    } else {
      row.errors.push(`Referenced parent Village '${vilCode}' not found in database or uploaded batch.`);
    }

    const phone = cleanString(row.raw["Phone Number"]);
    const normalizedPhone = Family.normalizePhone(phone);
    if (normalizedPhone && dbFamiliesByPhone.has(normalizedPhone)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Household with phone '${phone}' already exists in database. Skipped to prevent duplicate creation.`);
      continue;
    }

    if (row.code && dbFamiliesByCode.has(row.code)) {
      row.importStatus = "duplicate_skipped";
      row.warnings.push(`Family code '${row.code}' already exists in database. Skipped to prevent duplicate creation.`);
      continue;
    }

    if (row.errors.length > 0) {
      row.importStatus = "invalid";
    } else {
      row.importStatus = "valid";
    }
  }

  // Compute final counts
  const validRows = annotatedRows.filter((r) => r.importStatus === "valid").length;
  const invalidRows = annotatedRows.filter((r) => r.importStatus === "invalid").length;
  const duplicateRows = annotatedRows.filter((r) => r.importStatus === "duplicate_skipped").length;

  const byType = {};
  for (const type of SUPPORTED_ENTITY_TYPES) {
    const subset = annotatedRows.filter((r) => r.entityType === type);
    byType[type] = {
      total: subset.length,
      valid: subset.filter((r) => r.importStatus === "valid").length,
      invalid: subset.filter((r) => r.importStatus === "invalid").length,
      duplicate: subset.filter((r) => r.importStatus === "duplicate_skipped").length,
    };
  }

  return {
    summary: {
      totalRows,
      validRows,
      invalidRows,
      duplicateRows,
      byType,
    },
    previewRows: annotatedRows,
    canImport: validRows > 0,
  };
}

/**
 * Extracts a 2-character prefix from Mandal for human-readable codes.
 */
function getMandalShortCode(mandal) {
  if (!mandal) return "MN";
  const source = (mandal.code || mandal.name || "").replace(/^MAN-/, "").replace(/[^A-Z0-9]/g, "");
  return (source.slice(0, 2) || "MN").toUpperCase();
}

/**
 * Executes the bulk import in strict topological order.
 * Only rows marked as "valid" are imported.
 */
export async function executeBulkImport({ previewRows }, actorUser) {
  await connectToDatabase();

  const actorUserId = actorUser?._id || actorUser?.id || null;
  const validRows = previewRows.filter((r) => r.importStatus === "valid");
  const duplicateRows = previewRows.filter((r) => r.importStatus === "duplicate_skipped");
  const initialInvalidRows = previewRows.filter((r) => r.importStatus === "invalid");

  const results = {
    totalRows: previewRows.length,
    successfullyImported: 0,
    duplicateOrSkippedRows: duplicateRows.length,
    invalidRows: initialInvalidRows.length,
    failedImports: 0,
    byType: {},
    importedItems: [],
    errors: [],
  };

  // Pre-seed errors with any invalid or duplicate rows from validation
  for (const row of initialInvalidRows) {
    results.errors.push({
      rowNumber: row.rowNumber,
      entityType: row.entityType || row.rawType || "Unknown",
      code: row.code || "",
      name: row.name || "",
      parentCode: row.parentCode || "",
      reason: row.errors.join("; "),
    });
  }

  for (const row of duplicateRows) {
    results.errors.push({
      rowNumber: row.rowNumber,
      entityType: row.entityType,
      code: row.code || "",
      name: row.name || "",
      parentCode: row.parentCode || "",
      reason: row.warnings.join("; ") || "Skipped: Record already exists in database.",
    });
  }

  for (const type of SUPPORTED_ENTITY_TYPES) {
    results.byType[type] = {
      total: previewRows.filter((r) => r.entityType === type).length,
      imported: 0,
      invalid: initialInvalidRows.filter((r) => r.entityType === type).length,
      duplicateOrSkipped: duplicateRows.filter((r) => r.entityType === type).length,
      failed: 0,
    };
  }

  // Created IDs lookup maps for hierarchical dependency injection
  const createdProjectIds = new Map();
  const createdMandalIds = new Map();
  const createdFacilityIds = new Map();
  const createdVillageIds = new Map();
  const createdStakeholderIds = new Map();
  const mandalDocsCache = new Map();

  async function getMandalDoc(mandalId) {
    if (!mandalId) return null;
    const key = mandalId.toString();
    if (mandalDocsCache.has(key)) return mandalDocsCache.get(key);
    const doc = await Mandal.findById(mandalId).lean();
    if (doc) mandalDocsCache.set(key, doc);
    return doc;
  }

  // Helper to resolve MongoDB ObjectId for Project
  async function resolveProjectId(row) {
    if (row.resolvedHierarchy?.projectId) return row.resolvedHierarchy.projectId;
    if (row.resolvedHierarchy?.project?.id) return row.resolvedHierarchy.project.id;
    const code = row.resolvedHierarchy?.projectCode || row.resolvedHierarchy?.project?.code;
    if (code && createdProjectIds.has(code)) return createdProjectIds.get(code);
    if (code) {
      const p = await Project.findOne({ code }).lean();
      if (p) {
        createdProjectIds.set(code, p._id.toString());
        return p._id.toString();
      }
    }
    return null;
  }

  // Helper to resolve MongoDB ObjectId for Mandal
  async function resolveMandalId(row) {
    if (row.resolvedHierarchy?.mandalId) return row.resolvedHierarchy.mandalId;
    if (row.resolvedHierarchy?.mandal?.id) return row.resolvedHierarchy.mandal.id;
    const code = row.resolvedHierarchy?.mandalCode || row.resolvedHierarchy?.mandal?.code || row.parentCode;
    if (code && createdMandalIds.has(code)) return createdMandalIds.get(code);
    if (code) {
      const m = await Mandal.findOne({ code }).lean();
      if (m) {
        createdMandalIds.set(code, m._id.toString());
        return m._id.toString();
      }
    }
    return null;
  }

  // Helper to resolve MongoDB ObjectId for Facility
  async function resolveFacilityId(row) {
    if (row.resolvedHierarchy?.facilityId) return row.resolvedHierarchy.facilityId;
    if (row.resolvedHierarchy?.facility?.id) return row.resolvedHierarchy.facility.id;
    const code = row.resolvedHierarchy?.facilityCode || row.resolvedHierarchy?.facility?.code || row.facilityCode;
    if (code && createdFacilityIds.has(code)) return createdFacilityIds.get(code);
    if (code) {
      const f = await Facility.findOne({ code }).lean();
      if (f) {
        createdFacilityIds.set(code, f._id.toString());
        return f._id.toString();
      }
    }
    return null;
  }

  // Helper to resolve MongoDB ObjectId for Village
  async function resolveVillageId(row) {
    if (row.resolvedHierarchy?.villageId) return row.resolvedHierarchy.villageId;
    if (row.resolvedHierarchy?.village?.id) return row.resolvedHierarchy.village.id;
    const code = row.resolvedHierarchy?.villageCode || row.resolvedHierarchy?.village?.code || row.parentCode;
    if (code && createdVillageIds.has(code)) return createdVillageIds.get(code);
    if (code) {
      const v = await Village.findOne({ code }).lean();
      if (v) {
        createdVillageIds.set(code, v._id.toString());
        return v._id.toString();
      }
    }
    return null;
  }

  // 1. Level 1: Import Projects
  const projectRows = validRows.filter((r) => r.entityType === "Project");
  for (const row of projectRows) {
    try {
      const project = await Project.create({
        code: row.code,
        name: row.name,
        description: cleanString(row.raw["Description"]),
        startDate: new Date(row.raw["Start Date"]),
        endDate: row.raw["End Date"] ? new Date(row.raw["End Date"]) : null,
        status: row.status,
        createdBy: actorUserId,
      });

      createdProjectIds.set(row.code, project._id.toString());
      results.successfullyImported++;
      results.byType.Project.imported++;
      results.importedItems.push({ id: project._id, entityType: "Project", code: row.code, name: row.name });

      await logAudit({
        actor: actorUser,
        entityType: "Project",
        entityId: project._id,
        action: "CREATE",
        after: project,
      });
    } catch (err) {
      results.failedImports++;
      results.byType.Project.failed++;
      results.errors.push({
        rowNumber: row.rowNumber,
        entityType: "Project",
        code: row.code,
        name: row.name,
        parentCode: row.parentCode,
        reason: `Database insertion error: ${err.message}`,
      });
    }
  }

  // 2. Level 2: Import Mandals
  const mandalRows = validRows.filter((r) => r.entityType === "Mandal");
  for (const row of mandalRows) {
    try {
      const projectId = await resolveProjectId(row);
      if (!projectId) {
        throw new Error(`Unable to resolve associated Project ID for code '${row.parentCode}'`);
      }

      const mandal = await Mandal.create({
        code: row.code,
        name: row.name,
        projectId,
        status: row.status,
      });

      createdMandalIds.set(row.code, mandal._id.toString());
      results.successfullyImported++;
      results.byType.Mandal.imported++;
      results.importedItems.push({ id: mandal._id, entityType: "Mandal", code: row.code, name: row.name });

      await logAudit({
        actor: actorUser,
        entityType: "Mandal",
        entityId: mandal._id,
        action: "CREATE",
        after: mandal,
      });
    } catch (err) {
      results.failedImports++;
      results.byType.Mandal.failed++;
      results.errors.push({
        rowNumber: row.rowNumber,
        entityType: "Mandal",
        code: row.code,
        name: row.name,
        parentCode: row.parentCode,
        reason: `Database insertion error: ${err.message}`,
      });
    }
  }

  // 3. Level 3: Import Facilities
  const facilityRows = validRows.filter((r) => r.entityType === "Facility");
  for (const row of facilityRows) {
    try {
      const mandalId = await resolveMandalId(row);
      if (!mandalId) {
        throw new Error(`Unable to resolve associated Mandal ID for code '${row.parentCode}'`);
      }

      const mandalDoc = await getMandalDoc(mandalId);
      const projectId = mandalDoc ? mandalDoc.projectId.toString() : await resolveProjectId(row);

      const facility = await Facility.create({
        code: row.code,
        name: row.name,
        mandalId,
        projectId,
        facilityType: cleanString(row.raw["Facility Type"]) || "PHC",
        serviceCategory: cleanString(row.raw["Service Category"]) || "Standard",
        status: row.status,
      });

      createdFacilityIds.set(row.code, facility._id.toString());
      results.successfullyImported++;
      results.byType.Facility.imported++;
      results.importedItems.push({ id: facility._id, entityType: "Facility", code: row.code, name: row.name });

      await logAudit({
        actor: actorUser,
        entityType: "Facility",
        entityId: facility._id,
        action: "CREATE",
        after: facility,
      });
    } catch (err) {
      results.failedImports++;
      results.byType.Facility.failed++;
      results.errors.push({
        rowNumber: row.rowNumber,
        entityType: "Facility",
        code: row.code,
        name: row.name,
        parentCode: row.parentCode,
        reason: `Database insertion error: ${err.message}`,
      });
    }
  }

  // 4. Level 4: Import Villages
  const villageRows = validRows.filter((r) => r.entityType === "Village");
  for (const row of villageRows) {
    try {
      const mandalId = await resolveMandalId(row);
      const facilityId = await resolveFacilityId(row);
      if (!mandalId) throw new Error(`Unable to resolve associated Mandal ID for code '${row.parentCode}'`);
      if (!facilityId) throw new Error(`Unable to resolve associated Facility ID for code '${row.facilityCode}'`);

      const mandalDoc = await getMandalDoc(mandalId);
      const projectId = mandalDoc ? mandalDoc.projectId.toString() : await resolveProjectId(row);

      const village = await Village.create({
        code: row.code,
        name: row.name,
        mandalId,
        facilityId,
        projectId,
        status: row.status,
      });

      createdVillageIds.set(row.code, village._id.toString());
      results.successfullyImported++;
      results.byType.Village.imported++;
      results.importedItems.push({ id: village._id, entityType: "Village", code: row.code, name: row.name });

      await logAudit({
        actor: actorUser,
        entityType: "Village",
        entityId: village._id,
        action: "CREATE",
        after: village,
      });
    } catch (err) {
      results.failedImports++;
      results.byType.Village.failed++;
      results.errors.push({
        rowNumber: row.rowNumber,
        entityType: "Village",
        code: row.code,
        name: row.name,
        parentCode: row.parentCode,
        reason: `Database insertion error: ${err.message}`,
      });
    }
  }

  // 5. Level 5: Import Stakeholders
  const stakeholderRows = validRows.filter((r) => r.entityType === "Stakeholder");
  for (const row of stakeholderRows) {
    try {
      const mandalId = await resolveMandalId(row);
      if (!mandalId) throw new Error(`Unable to resolve associated Mandal ID for code '${row.parentCode}'`);

      const mandalDoc = await getMandalDoc(mandalId);
      const projectId = mandalDoc ? mandalDoc.projectId.toString() : await resolveProjectId(row);
      const facilityId = row.facilityCode ? await resolveFacilityId(row) : null;

      const stakeholder = await Stakeholder.create({
        fullName: row.name,
        stakeholderType: cleanString(row.raw["Stakeholder Type"]).toLowerCase(),
        mandalId,
        projectId,
        facilityId,
        phone: cleanString(row.raw["Phone Number"]),
        designation: cleanString(row.raw["Designation"]),
        status: row.status,
      });

      const key = row.code || stakeholder.phone || stakeholder._id.toString();
      createdStakeholderIds.set(key, stakeholder._id.toString());
      results.successfullyImported++;
      results.byType.Stakeholder.imported++;
      results.importedItems.push({ id: stakeholder._id, entityType: "Stakeholder", code: row.code, name: row.name });

      await logAudit({
        actor: actorUser,
        entityType: "Stakeholder",
        entityId: stakeholder._id,
        action: "CREATE",
        after: stakeholder,
      });
    } catch (err) {
      results.failedImports++;
      results.byType.Stakeholder.failed++;
      results.errors.push({
        rowNumber: row.rowNumber,
        entityType: "Stakeholder",
        code: row.code,
        name: row.name,
        parentCode: row.parentCode,
        reason: `Database insertion error: ${err.message}`,
      });
    }
  }

  // 6. Level 6: Import Families
  const familyRows = validRows.filter((r) => r.entityType === "Family");
  for (const row of familyRows) {
    try {
      const villageId = await resolveVillageId(row);
      if (!villageId) throw new Error(`Unable to resolve associated Village ID for code '${row.parentCode}'`);

      const villageDoc = await Village.findById(villageId).lean();
      if (!villageDoc) throw new Error(`Village '${villageId}' does not exist.`);

      const mandalDoc = await Mandal.findById(villageDoc.mandalId).lean();

      // Resolve optional ASHA reference
      let ashaId = null;
      const ashaRef = cleanString(row.raw["ASHA Worker Reference"]);
      if (ashaRef) {
        if (createdStakeholderIds.has(ashaRef)) {
          ashaId = createdStakeholderIds.get(ashaRef);
        } else {
          const ashaDoc = await Stakeholder.findOne({
            $or: [{ phone: ashaRef }, { fullName: ashaRef }],
            stakeholderType: "asha",
          }).lean();
          if (ashaDoc) ashaId = ashaDoc._id.toString();
        }
      }

      // Generate or assign Family Code
      let familyCode = row.code;
      if (!familyCode) {
        const prefix = getMandalShortCode(mandalDoc);
        const seq = await Counter.getNextSequence(`family_${prefix}`);
        familyCode = `FAM-${prefix}-${seq.toString().padStart(5, "0")}`;
      }

      const phone = cleanString(row.raw["Phone Number"]);
      const normalizedPhone = Family.normalizePhone(phone);
      const phoneOwner = cleanString(row.raw["Phone Owner"]).toLowerCase() || "own";

      // Note: Survey-only questions (visit history, travel time, drone receipt)
      // are omitted from master data import. We provide safe initial baseline defaults
      // to preserve existing database schema without deleting any model fields.
      const family = await Family.create({
        familyCode,
        project: villageDoc.projectId,
        mandal: villageDoc.mandalId,
        facility: villageDoc.facilityId,
        village: villageDoc._id,
        asha: ashaId,
        householdHeadName: row.name,
        phoneNumber: phone,
        normalizedPhone,
        phoneOwner: ["own", "relative", "neighbour", "asha"].includes(phoneOwner) ? phoneOwner : "own",
        householdCharacteristics: parseCommaList(row.raw["Household Characteristics"]),
        visitedPHCLast3Months: "no",
        agreesToContact: "yes",
        travelTimeToPHC: "under_30_min",
        reasonsForRepeatedCare: [],
        otherCareReason: "",
        receivedDroneService: "dont_know",
        ashaRemarks: "Created via Master Data Bulk Import",
        shortlisted: cleanString(row.raw["Shortlisted"]).toLowerCase() === "yes",
        status: row.status,
        createdBy: actorUserId,
      });

      results.successfullyImported++;
      results.byType.Family.imported++;
      results.importedItems.push({ id: family._id, entityType: "Family", code: familyCode, name: row.name });

      await logAudit({
        actor: actorUser,
        entityType: "Family",
        entityId: family._id,
        action: "CREATE",
        after: family,
      });
    } catch (err) {
      results.failedImports++;
      results.byType.Family.failed++;
      results.errors.push({
        rowNumber: row.rowNumber,
        entityType: "Family",
        code: row.code,
        name: row.name,
        parentCode: row.parentCode,
        reason: `Database insertion error: ${err.message}`,
      });
    }
  }

  return results;
}

/**
 * Generates a clean Excel error report containing failed, skipped, or invalid rows.
 */
export async function generateErrorReportWorkbook(errors) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Import Errors", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });

  worksheet.columns = [
    { header: "Row Number", key: "rowNumber", width: 14 },
    { header: "Entity Type", key: "entityType", width: 18 },
    { header: "Code", key: "code", width: 18 },
    { header: "Name", key: "name", width: 30 },
    { header: "Parent Code", key: "parentCode", width: 18 },
    { header: "Failure Reason", key: "reason", width: 60 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBE123C" }, // Rose-700
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (const err of errors) {
    const row = worksheet.addRow({
      rowNumber: err.rowNumber || "-",
      entityType: err.entityType || "-",
      code: err.code || "-",
      name: err.name || "-",
      parentCode: err.parentCode || "-",
      reason: err.reason || "Validation or import error",
    });
    row.font = { name: "Calibri", size: 10 };
    row.alignment = { vertical: "middle" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
