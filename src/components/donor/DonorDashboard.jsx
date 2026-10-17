"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  ShieldCheckIcon,
  BarChartIcon,
  FolderIcon,
  CalendarIcon,
  ActivityIcon,
} from "@/components/common/Icons";

export default function DonorDashboard({ userName = "Donor" }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch("/api/donor/projects");
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load authorized projects");
        }
        const data = await res.json();
        setProjects(data.data.projects || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  return (
    <div className="space-y-6">
      {/* Donor Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-800 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">
                Donor Impact Observatory
              </Badge>
              <Badge variant="neutral" size="sm" className="bg-white/10 text-white border-white/20">
                Read-Only Access
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Welcome, {userName}
            </h2>
            <p className="text-xs text-slate-300">
              Aggregated community health impact indicators, survey progress, and round comparisons.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400">
            <BarChartIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* PII Privacy Safeguard Notice */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 space-y-1 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
          <span>Strict Privacy & Aggregation Policy</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          In compliance with ethical research standards and privacy laws, all household personally identifiable information (PII)
          such as names, phone numbers, and addresses is redacted. Sub-group sample sizes of fewer than 5 respondents (N &lt; 5)
          are automatically suppressed server-side to prevent identification.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
        </div>
      )}

      {/* Authorized Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Authorized Impact Projects</h3>
            <p className="text-xs text-slate-500">
              Projects explicitly granted to your donor account by the administration.
            </p>
          </div>
          <Link href="/donor/reports">
            <Button variant="outline" size="sm" className="text-xs border-slate-300 text-slate-700">
              Reports Center →
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Loading authorized project portfolios...
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed border-slate-200 bg-slate-50/50">
            <CardContent className="py-12 text-center space-y-3 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FolderIcon className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Authorized Projects</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your donor account does not currently have active access to any survey projects.
                Project authorization must be granted by a Superadmin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((proj) => (
              <Card key={proj.id} className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                <CardContent className="p-6 space-y-4">
                  {/* Project Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" size="sm" className="font-mono">{proj.code}</Badge>
                        <Badge variant="primary" size="sm">Active Program</Badge>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">{proj.name}</h4>
                      {proj.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{proj.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/donor/reports/export?projectId=${proj.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          Export CSV
                        </Button>
                      </a>
                      <Link href={`/donor/projects/${proj.id}`}>
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          View Impact Overview →
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Survey Rounds Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-400 font-medium">Survey Rounds:</span>
                    {proj.surveyRounds?.length > 0 ? (
                      proj.surveyRounds.map((r) => (
                        <span
                          key={r.id}
                          className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
                        >
                          {r.name} ({r.code}) • <span className="capitalize text-emerald-700">{r.status}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No rounds configured</span>
                    )}
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Eligible Households</div>
                      <div className="text-xl font-bold text-slate-900">{proj.metrics.totalEligibleAssignments}</div>
                      <div className="text-[10px] text-slate-400">Assigned + in-progress + done</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Surveys Completed</div>
                      <div className="text-xl font-bold text-emerald-950">{proj.metrics.completedAssignments}</div>
                      <div className="text-[10px] text-emerald-700">Verified household submissions</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                      <div className="text-[11px] font-semibold text-indigo-800 uppercase tracking-wider">Coverage Rate</div>
                      <div className="text-xl font-bold text-indigo-950">{proj.metrics.completionPercentage}%</div>
                      <div className="w-full bg-indigo-200/60 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, proj.metrics.completionPercentage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1">
                      <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Stakeholder Tasks</div>
                      <div className="text-xl font-bold text-amber-950">
                        {proj.metrics.stakeholderInterviews?.completed || 0}
                        <span className="text-xs font-normal text-slate-500"> / {proj.metrics.stakeholderInterviews?.totalEligible || 0}</span>
                      </div>
                      <div className="text-[10px] text-amber-700">{proj.metrics.stakeholderInterviews?.completionPercentage || 0}% completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
