"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  ShieldCheckIcon,
  BarChartIcon,
  FolderIcon,
  CalendarIcon,
  MapPinIcon,
  ActivityIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@/components/common/Icons";

export default function ProjectImpactOverview({ projectId }) {
  const [activeTab, setActiveTab] = useState("coverage"); // "coverage" | "comparison" | "questions" | "quality"
  const [selectedRoundId, setSelectedRoundId] = useState("");

  const [overviewData, setOverviewData] = useState(null);
  const [roundComparisonData, setRoundComparisonData] = useState(null);
  const [geographicData, setGeographicData] = useState(null);
  const [questionAnalyticsData, setQuestionAnalyticsData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAllData = useCallback(async () => {
    try {
      // 1. Overview
      const ovRes = await fetch(`/api/donor/projects/${projectId}/overview${selectedRoundId ? `?roundId=${selectedRoundId}` : ""}`);
      if (!ovRes.ok) {
        const err = await ovRes.json();
        throw new Error(err.error || "Failed to load project overview");
      }
      const ov = await ovRes.json();
      setOverviewData(ov.data);
      setError("");

      // 2. Geographic coverage
      const geoRes = await fetch(`/api/donor/projects/${projectId}/geographic-coverage${selectedRoundId ? `?roundId=${selectedRoundId}` : ""}`);
      if (geoRes.ok) {
        const g = await geoRes.json();
        setGeographicData(g.data);
      }

      // 3. Round comparison
      const rcRes = await fetch(`/api/donor/projects/${projectId}/round-comparison`);
      if (rcRes.ok) {
        const rc = await rcRes.json();
        setRoundComparisonData(rc.data);
      }

      // 4. Question analytics
      const qaRes = await fetch(`/api/donor/projects/${projectId}/question-analytics${selectedRoundId ? `?roundId=${selectedRoundId}` : ""}`);
      if (qaRes.ok) {
        const qa = await qaRes.json();
        setQuestionAnalyticsData(qa.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRoundId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllData();
  }, [loadAllData]);

  if (loading && !overviewData) {
    return (
      <div className="py-24 text-center text-xs text-slate-400">
        Loading project impact metrics and survey analytics...
      </div>
    );
  }

  if (error && !overviewData) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12">
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs">
          <div className="font-bold text-sm mb-1">Access Restricted</div>
          <p>{error}</p>
        </div>
        <Link href="/donor/dashboard">
          <Button variant="outline" size="sm" className="text-xs">
            ← Back to Authorized Projects
          </Button>
        </Link>
      </div>
    );
  }

  const proj = overviewData?.project;
  const household = overviewData?.householdCoverage || {};
  const stakeholder = overviewData?.stakeholderInterviews || {};
  const quality = overviewData?.dataQualitySummary || { severityCounts: {} };

  return (
    <div className="space-y-6">
      {/* Top Header & Project Identity */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/donor/dashboard" className="text-xs text-slate-400 hover:text-slate-600 font-medium">
              ← Projects
            </Link>
            <span className="text-slate-300">/</span>
            <Badge variant="outline" size="sm" className="font-mono">{proj?.code}</Badge>
            <Badge variant="primary" size="sm">Donor Observatory</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{proj?.name}</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{proj?.description || "Project impact and survey monitoring overview."}</p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/api/donor/reports/export?projectId=${projectId}${selectedRoundId ? `&roundId=${selectedRoundId}` : ""}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Export CSV Report
            </Button>
          </a>
        </div>
      </div>

      {/* Survey Round Filter & Tab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          {[
            { key: "coverage", label: "Survey Coverage & Progress" },
            { key: "comparison", label: "Round Comparison (M0 / M3 / M6)" },
            { key: "questions", label: "Question Analytics" },
            { key: "quality", label: "Data Quality Indicators" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Survey Round Filter Dropdown */}
        {activeTab !== "comparison" && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Round Scope:</span>
            <select
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="rounded-lg border border-slate-200 py-1 px-2.5 text-xs bg-white text-slate-800"
            >
              <option value="">All Survey Rounds</option>
              {overviewData?.surveyRounds?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: SURVEY COVERAGE & PROGRESS */}
      {activeTab === "coverage" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-slate-200 bg-slate-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Eligible Households</div>
                <div className="text-2xl font-bold text-slate-900">{household.totalEligible || 0}</div>
                <div className="text-[10px] text-slate-400">Assigned + in-progress + completed</div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Completed Surveys</div>
                <div className="text-2xl font-bold text-emerald-950">{household.completed || 0}</div>
                <div className="text-[10px] text-emerald-700">Verified household submissions</div>
              </CardContent>
            </Card>

            <Card className="border-indigo-200 bg-indigo-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Completion Percentage</div>
                <div className="text-2xl font-bold text-indigo-950">{household.completionPercentage || 0}%</div>
                <div className="text-[10px] text-indigo-700">{household.completed} of {household.totalEligible} eligible</div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Cancelled Tasks</div>
                <div className="text-2xl font-bold text-amber-950">{household.cancelled || 0}</div>
                <div className="text-[10px] text-amber-700">Excluded from denominator</div>
              </CardContent>
            </Card>
          </div>

          {/* Denominator Transparency Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] flex items-center justify-between">
            <span>
              <strong>Denominator Definition:</strong> {household.denominatorDefinition}
            </span>
            <span className="text-slate-400 font-mono text-[10px]">P08_AUDIT_VERIFIED</span>
          </div>

          {/* Stakeholder Tasks Breakdown (Separate from Families) */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Stakeholder Interview Coverage</h4>
                  <p className="text-xs text-slate-500">
                    Tracked in separate quotas to prevent conflation with family household counts.
                  </p>
                </div>
                <Badge variant="outline" size="sm">Non-Household Interviews</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(stakeholder).map(([cat, data]) => (
                  <div key={cat} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {cat.replace(/_/g, " ")}
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      {data.completed} <span className="text-xs font-normal text-slate-400">/ {data.eligible}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, data.completionPercentage)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500">{data.completionPercentage}% completion rate</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Coverage (Mandal & Facility Breakdown with Suppression) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mandals */}
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">Mandal Coverage</h4>
                  <span className="text-[11px] text-slate-400">N &lt; 5 suppressed</span>
                </div>

                <div className="space-y-2.5">
                  {geographicData?.mandals?.length > 0 ? (
                    geographicData.mandals.map((m) => (
                      <div key={m.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{m.name}</span>
                          {m.suppressed ? (
                            <Badge variant="warning" size="sm">[Suppressed - N &lt; 5]</Badge>
                          ) : (
                            <span className="font-bold text-emerald-800">{m.completed} / {m.eligible} ({m.completionPercentage}%)</span>
                          )}
                        </div>
                        {!m.suppressed && (
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, m.completionPercentage)}%` }}
                            />
                          </div>
                        )}
                        {m.suppressed && (
                          <p className="text-[10px] text-amber-700 italic">{m.message}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-4">No mandals registered</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Facilities */}
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800">PHC / Facility Coverage</h4>
                  <span className="text-[11px] text-slate-400">N &lt; 5 suppressed</span>
                </div>

                <div className="space-y-2.5">
                  {geographicData?.facilities?.length > 0 ? (
                    geographicData.facilities.map((f) => (
                      <div key={f.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{f.name}</span>
                          {f.suppressed ? (
                            <Badge variant="warning" size="sm">[Suppressed - N &lt; 5]</Badge>
                          ) : (
                            <span className="font-bold text-emerald-800">{f.completed} / {f.eligible} ({f.completionPercentage}%)</span>
                          )}
                        </div>
                        {!f.suppressed && (
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, f.completionPercentage)}%` }}
                            />
                          </div>
                        )}
                        {f.suppressed && (
                          <p className="text-[10px] text-amber-700 italic">{f.message}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-4">No facilities registered</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ROUND COMPARISON (BASELINE / MIDLINE / ENDLINE) */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          {/* Causal Disclaimer Alert */}
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60 text-indigo-950 text-xs flex items-center justify-between shadow-xs">
            <span>
              <strong>Ethical Notice:</strong> {roundComparisonData?.disclaimer || "Aggregated comparisons indicate measured survey distribution changes across rounds. They do not claim clinical causation or direct programmatic attribution."}
            </span>
          </div>

          {/* Side by Side Round Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {roundComparisonData?.roundSummaries?.length > 0 ? (
              roundComparisonData.roundSummaries.map((r) => (
                <Card key={r.roundId} className="border-slate-200 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{r.name}</span>
                      <Badge variant="primary" size="sm">{r.code}</Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Target Timing</span>
                        <span className="font-medium text-slate-700">{r.targetTiming || "Standard"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Eligible Households</span>
                        <span className="font-bold text-slate-900">{r.eligibleHouseholds}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Completed Surveys</span>
                        <span className="font-bold text-emerald-800">{r.completedHouseholds}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-500">Completion Rate</span>
                        <span className="font-bold text-indigo-900">{r.completionPercentage}%</span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-500">Stakeholder Interviews</span>
                        <span className="font-bold text-slate-800">{r.completedStakeholderInterviews}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-xs text-slate-400">
                No survey rounds configured for comparison.
              </div>
            )}
          </div>

          {/* Comparable Questions Comparison Table */}
          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Comparable Questions Across Rounds</h4>
                <p className="text-xs text-slate-500">
                  Evaluates question comparability across rounds. Incompatible version options are excluded from direct comparison.
                </p>
              </div>

              <div className="space-y-4">
                {roundComparisonData?.questionComparisons?.length > 0 ? (
                  roundComparisonData.questionComparisons.map((qc) => (
                    <div key={qc.questionCode} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800 mr-2">{qc.questionCode}</span>
                          <span className="text-xs text-slate-600 font-medium">{qc.textEn}</span>
                        </div>
                        {qc.isComparable ? (
                          <Badge variant="primary" size="sm">Comparable Across Versions</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Warning: Incompatible Versions</Badge>
                        )}
                      </div>

                      {!qc.isComparable && (
                        <div className="p-2 rounded bg-amber-50 text-amber-800 text-[11px]">
                          <strong>Notice:</strong> {qc.incomparableReason || "Question options or answer types differ across rounds."}
                        </div>
                      )}

                      {/* Side by side metric breakdown for this question */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {Object.entries(qc.roundMetrics || {}).map(([rCode, m]) => (
                          <div key={rCode} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                            <div className="text-[11px] font-bold text-slate-700">{rCode}</div>
                            {m.suppressed ? (
                              <div className="text-[11px] text-amber-700 italic">[Suppressed - N &lt; 5]</div>
                            ) : qc.answerType === "yes_no" ? (
                              <div className="font-semibold text-emerald-800">
                                Yes: {m.yesPercentage}% <span className="text-[10px] text-slate-500">({m.yesCount} of {m.respondentCount})</span>
                              </div>
                            ) : qc.answerType === "number" || qc.answerType === "rating_scale" ? (
                              <div className="font-semibold text-indigo-900">
                                Average: {m.average} <span className="text-[10px] text-slate-500">(N={m.respondentCount})</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5 text-[11px] text-slate-700">
                                {Object.entries(m.optionCounts || {}).map(([opt, cnt]) => (
                                  <div key={opt} className="flex justify-between">
                                    <span>{opt}:</span>
                                    <strong>{cnt}</strong>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400">
                    No comparable indicator questions found in this project.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: QUESTION ANALYTICS */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-800">Aggregated Question Responses</h4>
              <p className="text-xs text-slate-500">
                Calculated strictly from submitted responses. Subgroups with N &lt; 5 are suppressed.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Total Questions: {questionAnalyticsData?.totalQuestions || 0}
            </span>
          </div>

          <div className="space-y-3">
            {questionAnalyticsData?.analytics?.length > 0 ? (
              questionAnalyticsData.analytics.map((q) => (
                <Card key={q.questionId || q.code} className="border-slate-200 shadow-xs">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{q.code}</span>
                        <Badge variant="outline" size="sm" className="capitalize">{q.category}</Badge>
                        <Badge variant="neutral" size="sm" className="text-[10px]">{q.answerType}</Badge>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Total Respondents: <strong>{q.totalRespondents || q.totalAnswered || 0}</strong>
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800">{q.textEn}</div>

                    {/* Free Text Suppressed */}
                    {q.freeTextSuppressed && (
                      <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                        <ShieldCheckIcon className="w-4 h-4 inline mr-1.5 text-amber-700" />
                        {q.message}
                      </div>
                    )}

                    {/* Group Size Suppressed */}
                    {q.suppressed && (
                      <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                        <span className="font-semibold">{q.message}</span>
                      </div>
                    )}

                    {/* Yes/No Visual Breakdown */}
                    {!q.suppressed && q.summary?.type === "yes_no" && (
                      <div className="space-y-2 pt-1 text-xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">Yes ({q.summary.yesPercentage}%)</span>
                          <span className="text-slate-700 font-medium">No ({q.summary.noPercentage}%)</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
                          <div
                            className="bg-emerald-600 h-full transition-all"
                            style={{ width: `${q.summary.yesPercentage}%` }}
                          />
                          <div
                            className="bg-slate-400 h-full transition-all"
                            style={{ width: `${q.summary.noPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{q.summary.yesCount} responses</span>
                          <span>{q.summary.noCount} responses</span>
                        </div>
                      </div>
                    )}

                    {/* Single / Multiple Choice Options Breakdown */}
                    {!q.suppressed && (q.summary?.type === "single_choice" || q.summary?.type === "multiple_choice") && (
                      <div className="space-y-2.5 pt-1">
                        {q.summary.options?.map((opt) => {
                          const pct = opt.percentage !== undefined ? opt.percentage : opt.respondentPercentage;
                          return (
                            <div key={opt.code} className="space-y-1">
                              <div className="flex justify-between text-xs text-slate-700">
                                <span>{opt.label || opt.code}</span>
                                <span className="font-semibold">{opt.count} ({pct}%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {q.summary?.note && (
                          <p className="text-[10px] text-slate-400 italic pt-1">{q.summary.note}</p>
                        )}
                      </div>
                    )}

                    {/* Numeric / Rating Scale Summary */}
                    {!q.suppressed && (q.summary?.type === "number" || q.summary?.type === "rating_scale") && (
                      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Average</span>
                          <span className="text-base font-bold text-slate-900">{q.summary.average}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Minimum</span>
                          <span className="text-base font-bold text-slate-900">{q.summary.minimum}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Maximum</span>
                          <span className="text-base font-bold text-slate-900">{q.summary.maximum}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">
                No active questions found for the selected scope.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DATA QUALITY INDICATORS */}
      {activeTab === "quality" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-xs text-emerald-950 space-y-1 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
              <span>Independent Data Quality Verification Statement</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {quality.assuranceStatement || "Automated rule validation monitors consistency, completeness, and consent compliance across all survey records."}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-rose-200 bg-rose-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Critical Anomalies</div>
                <div className="text-2xl font-bold text-rose-900">{quality.severityCounts?.critical || 0}</div>
                <div className="text-[10px] text-rose-600">Integrity / Authorization</div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">High Severity</div>
                <div className="text-2xl font-bold text-amber-900">{quality.severityCounts?.high || 0}</div>
                <div className="text-[10px] text-amber-600">Business validation flags</div>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-yellow-800 uppercase tracking-wider">Medium Severity</div>
                <div className="text-2xl font-bold text-yellow-900">{quality.severityCounts?.medium || 0}</div>
                <div className="text-[10px] text-yellow-700">Inconsistencies under review</div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/40">
              <CardContent className="p-4 space-y-1">
                <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Low Severity</div>
                <div className="text-2xl font-bold text-slate-800">{quality.severityCounts?.low || 0}</div>
                <div className="text-[10px] text-slate-500">Non-blocking warnings</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
