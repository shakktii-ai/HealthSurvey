"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function BulkImportManager() {
  const [file, setFile] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingErrors, setIsExportingErrors] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Table filter states
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fileInputRef = useRef(null);

  const handleDownloadTemplate = () => {
    window.location.href = "/api/admin/bulk-import/template";
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationData(null);
      setImportReport(null);
      setErrorMessage("");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setValidationData(null);
      setImportReport(null);
      setErrorMessage("");
    }
  };

  const handleValidate = async () => {
    if (!file) {
      setErrorMessage("Please select an Excel workbook (.xlsx) to validate.");
      return;
    }

    setIsValidating(true);
    setErrorMessage("");
    setValidationData(null);
    setImportReport(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/bulk-import/validate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to validate workbook.");
      }

      setValidationData(data);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred during validation.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationData || !validationData.previewRows) return;

    setIsImporting(true);
    setShowConfirmModal(false);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/bulk-import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewRows: validationData.previewRows }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to execute bulk import.");
      }

      setImportReport(data.report);
      setValidationData(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setErrorMessage(err.message || "Failed to execute bulk import.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportErrors = async (errorsToExport) => {
    if (!errorsToExport || errorsToExport.length === 0) return;

    setIsExportingErrors(true);
    try {
      const res = await fetch("/api/admin/bulk-import/export-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errors: errorsToExport }),
      });

      if (!res.ok) throw new Error("Failed to export errors.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "healthsurvey-import-errors.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Error generating error report: " + err.message);
    } finally {
      setIsExportingErrors(false);
    }
  };

  // Filter preview rows
  const filteredRows = (validationData?.previewRows || []).filter((row) => {
    if (selectedTypeFilter !== "ALL" && row.entityType !== selectedTypeFilter) return false;
    if (selectedStatusFilter !== "ALL" && row.importStatus !== selectedStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (row.name || "").toLowerCase().includes(q);
      const matchCode = (row.code || "").toLowerCase().includes(q);
      const matchParent = (row.parentCode || "").toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchParent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Overview & Template Download Hero Card */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Single-Sheet Unified Engine
              </span>
              <span className="text-xs text-slate-500">All 6 Master Data Modules</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Bulk Master Data Import
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Import Projects, Mandals, Facilities, Villages, Stakeholders, and Families using{" "}
              <strong>one Excel workbook containing exactly one worksheet</strong>. Dependencies are automatically resolved regardless of row order.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleDownloadTemplate}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold"
            >
              <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Master Data Excel Template
            </Button>
          </div>
        </div>

        {/* Structure Reference Quick Guide */}
        <div className="p-6 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-600">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Single Sheet & Dropdowns
            </div>
            <p>
              Exactly ONE worksheet named <strong>Master Data</strong> with built-in Excel dropdowns for Entity Type, Status, Facility Type, and Stakeholder Type.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Parent-Child Resolution
            </div>
            <p>
              Use <strong>Parent Code</strong> to link records. Parents can appear later in the worksheet; dependencies are resolved top-down automatically.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Clean Master Data Scope
            </div>
            <p>
              Streamlined 18-column layout. Survey-only responses (PHC visits, drone receipt, questionnaire answers) are collected separately during field survey rounds.
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Safe Deduplication
            </div>
            <p>
              Full preview before database changes. Existing database records are automatically detected and safely skipped without overwriting survey data.
            </p>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div className="p-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? "border-emerald-400 bg-emerald-50/20" : "border-slate-300 hover:border-slate-400 bg-slate-50/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="master-data-file-input"
            />
            <label
              htmlFor="master-data-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="text-sm font-medium text-slate-900">
                {file ? (
                  <span className="text-emerald-700 font-semibold">{file.name}</span>
                ) : (
                  <span>Click to select or drag & drop the Master Data Excel file (.xlsx)</span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports healthsurvey-master-data-demo.xlsx with 1 worksheet"}
              </p>
            </label>

            {file && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  isLoading={isValidating}
                  onClick={handleValidate}
                  className="font-semibold shadow-sm"
                >
                  {isValidating ? "Validating Workbook..." : "Validate & Preview Rows"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setFile(null);
                    setValidationData(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={isValidating}
                >
                  Clear File
                </Button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="mt-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Validation Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Validation & Preview Section */}
      {validationData && (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Rows in Sheet</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{validationData.summary.totalRows}</div>
              <div className="text-xs text-slate-400 mt-1">Worksheet: {validationData.sheetName}</div>
            </Card>

            <Card className="p-4 bg-white border-emerald-200 shadow-sm bg-emerald-50/20">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Ready to Import</div>
              <div className="text-2xl font-bold text-emerald-800 mt-1">{validationData.summary.validRows}</div>
              <div className="text-xs text-emerald-600 mt-1">All dependency checks passed</div>
            </Card>

            <Card className="p-4 bg-white border-amber-200 shadow-sm bg-amber-50/20">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Duplicates / Skipped</div>
              <div className="text-2xl font-bold text-amber-800 mt-1">{validationData.summary.duplicateRows}</div>
              <div className="text-xs text-amber-600 mt-1">Existing records safe</div>
            </Card>

            <Card className="p-4 bg-white border-rose-200 shadow-sm bg-rose-50/20">
              <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Validation Errors</div>
              <div className="text-2xl font-bold text-rose-800 mt-1">{validationData.summary.invalidRows}</div>
              <div className="text-xs text-rose-600 mt-1">Require correction</div>
            </Card>
          </div>

          {/* Entity Type Breakdown Matrix */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Breakdown by Master Data Entity
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Dependencies are processed top-down: Projects $\rightarrow$ Mandals $\rightarrow$ Facilities $\rightarrow$ Villages $\rightarrow$ Stakeholders $\rightarrow$ Families
                  </CardDescription>
                </div>

                <div className="flex items-center gap-3">
                  {(validationData.summary.invalidRows > 0 || validationData.summary.duplicateRows > 0) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isLoading={isExportingErrors}
                      onClick={() => {
                        const errorRows = (validationData.previewRows || [])
                          .filter((r) => r.importStatus === "invalid" || r.importStatus === "duplicate_skipped")
                          .map((r) => ({
                            rowNumber: r.rowNumber,
                            entityType: r.entityType,
                            code: r.code,
                            name: r.name,
                            parentCode: r.parentCode,
                            reason: r.errors.length ? r.errors.join("; ") : r.warnings.join("; "),
                          }));
                        handleExportErrors(errorRows);
                      }}
                      className="text-xs"
                    >
                      <svg className="w-3.5 h-3.5 mr-1 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Error Report
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={validationData.summary.validRows === 0 || isImporting}
                    isLoading={isImporting}
                    onClick={() => setShowConfirmModal(true)}
                    className="font-semibold shadow-sm"
                  >
                    Confirm & Import {validationData.summary.validRows} Records
                  </Button>
                </div>
              </div>
            </CardHeader>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y lg:divide-y-0 divide-slate-100 text-center text-xs">
              {Object.entries(validationData.summary.byType).map(([type, stats]) => (
                <div key={type} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="font-semibold text-slate-800">{type}</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">{stats.total}</div>
                  <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px]">
                    <span className="text-emerald-700 font-medium">✓ {stats.valid}</span>
                    {stats.duplicate > 0 && <span className="text-amber-700 font-medium">↷ {stats.duplicate}</span>}
                    {stats.invalid > 0 && <span className="text-rose-700 font-medium">✕ {stats.invalid}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Interactive Preview Table */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider mr-1">Filter:</span>
                {["ALL", "Project", "Mandal", "Facility", "Village", "Stakeholder", "Family"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedTypeFilter === type
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">All Statuses ({validationData.previewRows.length})</option>
                  <option value="valid">Valid Ready ({validationData.summary.validRows})</option>
                  <option value="invalid">Invalid Errors ({validationData.summary.invalidRows})</option>
                  <option value="duplicate_skipped">Duplicates Skipped ({validationData.summary.duplicateRows})</option>
                </select>

                <input
                  type="text"
                  placeholder="Search code, name, parent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3 w-16 text-center">Row</th>
                    <th className="py-2.5 px-3 w-28">Entity Type</th>
                    <th className="py-2.5 px-3">Code / ID</th>
                    <th className="py-2.5 px-3">Name / Label</th>
                    <th className="py-2.5 px-3">Parent Reference</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                    <th className="py-2.5 px-3">Validation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No rows matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          row.importStatus === "invalid"
                            ? "bg-rose-50/20"
                            : row.importStatus === "duplicate_skipped"
                            ? "bg-amber-50/20"
                            : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono text-slate-500">{row.rowNumber}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-800">{row.entityType}</span>
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-900">{row.code || "-"}</td>
                        <td className="py-2 px-3 text-slate-800">{row.name || "-"}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <span className="font-mono text-slate-700">{row.parentCode || "-"}</span>
                            {row.facilityCode && (
                              <span className="text-[11px] text-slate-500">Fac: {row.facilityCode}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.importStatus === "valid" && (
                            <Badge variant="success" size="sm">Valid</Badge>
                          )}
                          {row.importStatus === "invalid" && (
                            <Badge variant="danger" size="sm">Error</Badge>
                          )}
                          {row.importStatus === "duplicate_skipped" && (
                            <Badge variant="warning" size="sm">Skipped</Badge>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.errors.length > 0 && (
                            <div className="text-rose-700 font-medium space-y-0.5">
                              {row.errors.map((err, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span>✕</span>
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {row.warnings.length > 0 && (
                            <div className="text-amber-700 font-medium space-y-0.5">
                              {row.warnings.map((warn, i) => (
                                <div key={i} className="flex items-center gap-1">
                                  <span>↷</span>
                                  <span>{warn}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {row.importStatus === "valid" && (
                            <span className="text-emerald-700">Ready to create</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Final Consolidated Import Report View */}
      {importReport && (
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden animate-fadeIn">
          <div className="border-b border-slate-100 bg-emerald-50/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                  Bulk Import Executed
                </span>
                <span className="text-xs text-slate-600">Audit trail logged</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                Consolidated Import Report
              </h3>
              <p className="text-sm text-slate-700 mt-1">
                Successfully created <strong>{importReport.successfullyImported}</strong> new records across master data modules. Existing database records and historical survey responses were strictly preserved.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {importReport.errors?.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={isExportingErrors}
                  onClick={() => handleExportErrors(importReport.errors)}
                  className="text-xs"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Error Report ({importReport.errors.length})
                </Button>
              )}

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setImportReport(null);
                  setValidationData(null);
                  setFile(null);
                }}
              >
                Upload Another Workbook
              </Button>
            </div>
          </div>

          {/* Report Breakdown */}
          <div className="p-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Import Outcome by Entity Type
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(importReport.byType).map(([type, stats]) => (
                <div key={type} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold text-slate-700">{type}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{stats.imported}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {stats.duplicateOrSkipped > 0 && <span className="text-amber-700 block">↷ {stats.duplicateOrSkipped} skipped</span>}
                    {stats.failed > 0 && <span className="text-rose-700 block">✕ {stats.failed} failed</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Navigation to Newly Imported Data */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Review Imported Master Data
              </h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <Link href="/admin/projects" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">
                  View Projects →
                </Link>
                <Link href="/admin/mandals" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">
                  View Mandals →
                </Link>
                <Link href="/admin/facilities" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">
                  View Facilities →
                </Link>
                <Link href="/admin/villages" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">
                  View Villages →
                </Link>
                <Link href="/admin/stakeholders" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">
                  View Stakeholders →
                </Link>
                <Link href="/admin/families" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">
                  View Families →
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Confirm Bulk Master Data Import
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                You are about to import <strong>{validationData?.summary?.validRows}</strong> records into the database.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div>• Entities will be created in strict dependency order.</div>
                <div>• {validationData?.summary?.duplicateRows || 0} existing records will be skipped safely.</div>
                <div>• Existing survey responses & field assignments remain unaffected.</div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  isLoading={isImporting}
                  onClick={handleConfirmImport}
                  className="font-semibold"
                >
                  Proceed with Import
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
