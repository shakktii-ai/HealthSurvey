"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  ShieldCheckIcon,
  FolderIcon,
  CalendarIcon,
  CheckCircleIcon,
  BarChartIcon,
} from "@/components/common/Icons";

export default function DonorReportCenter() {
  const [reportsData, setReportsData] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch("/api/donor/reports");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load report directory");
        }
        const data = await res.json();
        const list = data.data.availableReports || [];
        setReportsData(list);
        if (list.length > 0) {
          setSelectedProjectId(list[0].projectId);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const activeProject = reportsData.find((p) => p.projectId === selectedProjectId);

  const handleDownload = () => {
    if (!selectedProjectId) return;
    const q = new URLSearchParams();
    q.append("projectId", selectedProjectId);
    if (selectedRoundId) q.append("roundId", selectedRoundId);
    window.open(`/api/donor/reports/export?${q.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/donor/dashboard" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
              ← Dashboard
            </Link>
            <span className="text-slate-300">/</span>
            <Badge variant="primary" size="sm">Report Center</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Exportable Impact Dossiers
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Generate and download privacy-compliant aggregated impact reports, geographic coverage summaries, and survey round statistics.
          </p>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 space-y-1 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
          <span>Export Privacy & Spreadsheet Security Safeguards</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          All CSV reports enforce server-side small group suppression (N &lt; 5), exclude individual respondent PII, and
          are sanitized against spreadsheet formula injection attacks (leading =, +, -, @ characters escaped).
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Loading report repositories...
        </div>
      ) : reportsData.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="py-12 text-center space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FolderIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Reports Available</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              You do not have access to any project reports yet. Request project authorization from an administrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <Card className="border-slate-200 shadow-xs md:col-span-1">
            <CardContent className="p-5 space-y-4 text-xs">
              <h4 className="text-sm font-bold text-slate-800">Report Scope</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Target Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setSelectedRoundId("");
                    }}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
                  >
                    {reportsData.map((p) => (
                      <option key={p.projectId} value={p.projectId}>
                        {p.projectName} ({p.projectCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Survey Round (Optional)</label>
                  <select
                    value={selectedRoundId}
                    onChange={(e) => setSelectedRoundId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
                  >
                    <option value="">All Survey Rounds (Project Aggregate)</option>
                    {activeProject?.surveyRounds?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!selectedProjectId}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-semibold"
                >
                  Download CSV Report
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="border-slate-200 shadow-xs md:col-span-2">
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs text-slate-400 block">{activeProject?.projectCode}</span>
                  <h4 className="text-base font-bold text-slate-900">{activeProject?.projectName}</h4>
                </div>
                <Badge variant="primary" size="sm">Audited Summary</Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Eligible Households</span>
                  <div className="text-lg font-bold text-slate-900">{activeProject?.metrics.totalEligibleAssignments || 0}</div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-0.5">
                  <span className="text-[10px] text-emerald-700 uppercase font-semibold">Completed Surveys</span>
                  <div className="text-lg font-bold text-emerald-950">{activeProject?.metrics.completedAssignments || 0}</div>
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-0.5">
                  <span className="text-[10px] text-indigo-700 uppercase font-semibold">Coverage Rate</span>
                  <div className="text-lg font-bold text-indigo-950">{activeProject?.metrics.completionPercentage || 0}%</div>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="text-slate-700 font-semibold">Export Inclusions:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  <li>Household coverage and completion percentage breakdown.</li>
                  <li>Stakeholder interviews categorized by cadre (ASHA, PHC, Government).</li>
                  <li>Mandal-level geographic distribution with small group suppression.</li>
                  <li>Question-level option distributions, ratings, and averages.</li>
                  <li>Data quality issue summary counts by severity level.</li>
                  <li>Denominator definitions, methodology notes, and audit references.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
