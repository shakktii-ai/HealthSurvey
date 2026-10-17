"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import {
  ShieldCheckIcon,
  UsersIcon,
  FolderIcon,
  CheckCircleIcon,
  PlusIcon,
} from "@/components/common/Icons";

export default function DonorAccessManager() {
  const [grants, setGrants] = useState([]);
  const [donors, setDonors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [filterDonor, setFilterDonor] = useState("");
  const [filterProject, setFilterProject] = useState("");

  // Grant modal state
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [grantNotes, setGrantNotes] = useState("");
  const [submittingGrant, setSubmittingGrant] = useState(false);

  // Revoke confirmation modal state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [grantToRevoke, setGrantToRevoke] = useState(null);
  const [submittingRevoke, setSubmittingRevoke] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (filterDonor) q.append("donorId", filterDonor);
      if (filterProject) q.append("projectId", filterProject);

      const res = await fetch(`/api/admin/donor-access?${q.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load donor access records");
      }
      const data = await res.json();
      setGrants(data.data.grants || []);
      setDonors(data.data.donors || []);
      setProjects(data.data.projects || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterDonor, filterProject]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!selectedDonorId || !selectedProjectId) {
      setError("Please select both a donor user and an active project.");
      return;
    }

    setSubmittingGrant(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/donor-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorId: selectedDonorId,
          projectId: selectedProjectId,
          notes: grantNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to grant donor access");
      }

      setSuccessMsg("Donor project access granted successfully.");
      setGrantModalOpen(false);
      setSelectedDonorId("");
      setSelectedProjectId("");
      setGrantNotes("");
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingGrant(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!grantToRevoke) return;

    setSubmittingRevoke(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/admin/donor-access/${grantToRevoke.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke access");
      }

      setSuccessMsg(`Project access revoked for ${grantToRevoke.donorName}.`);
      setRevokeModalOpen(false);
      setGrantToRevoke(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingRevoke(false);
    }
  };

  const activeGrantsCount = grants.filter((g) => g.status === "active").length;
  const uniqueAuthorizedDonors = new Set(grants.filter((g) => g.status === "active").map((g) => g.donorId)).size;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">Donor Project Authorization</h3>
          <p className="text-xs text-slate-500">
            Grant and revoke explicit project-level access for Donor accounts. Donors have zero visibility by default.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setError("");
            setSuccessMsg("");
            setGrantModalOpen(true);
          }}
          className="text-xs bg-emerald-600 hover:bg-emerald-700"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Grant Project Access
        </Button>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Total Donor Accounts</div>
            <div className="text-2xl font-bold text-indigo-900">{donors.length}</div>
            <div className="text-[11px] text-indigo-600">Registered with &apos;donor&apos; role</div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Active Project Grants</div>
            <div className="text-2xl font-bold text-emerald-900">{activeGrantsCount}</div>
            <div className="text-[11px] text-emerald-700">Project-donor authorizations</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50/40">
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Donors With Active Access</div>
            <div className="text-2xl font-bold text-slate-800">{uniqueAuthorizedDonors}</div>
            <div className="text-[11px] text-slate-500">Distinct authorized users</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-500 font-medium mb-1">Filter by Donor</label>
            <select
              value={filterDonor}
              onChange={(e) => setFilterDonor(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
            >
              <option value="">All Donors</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-slate-500 font-medium mb-1">Filter by Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
              ))}
            </select>
          </div>

          {(filterDonor || filterProject) && (
            <div className="pt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterDonor("");
                  setFilterProject("");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grants Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                <th className="py-3 px-4">Donor User</th>
                <th className="py-3 px-3">Target Project</th>
                <th className="py-3 px-3">Granted By</th>
                <th className="py-3 px-3">Granted At</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading access authorization grants...
                  </td>
                </tr>
              ) : grants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No donor project grants found. Click &quot;Grant Project Access&quot; to authorize a donor.
                  </td>
                </tr>
              ) : (
                grants.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{g.donorName}</div>
                      <div className="text-[11px] text-slate-400">{g.donorEmail}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{g.projectName}</div>
                      <div className="text-[11px] text-slate-400">{g.projectCode}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{g.grantedByName}</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {new Date(g.grantedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {g.status === "active" ? (
                        <Badge variant="primary" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">Revoked</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {g.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGrantToRevoke(g);
                            setRevokeModalOpen(true);
                          }}
                          className="text-[11px] py-1 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Revoke Access
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Revoked on {g.revokedAt ? new Date(g.revokedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grant Access Modal */}
      {grantModalOpen && (
        <Modal
          isOpen={grantModalOpen}
          onClose={() => setGrantModalOpen(false)}
          title="Grant Project Access to Donor"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleGrantAccess} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Select a Donor user and the specific active project they are authorized to inspect.
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Donor User <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDonorId}
                onChange={(e) => setSelectedDonorId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
              >
                <option value="">-- Select Donor Account --</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Target Project <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
              >
                <option value="">-- Select Active Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Authorization Notes (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Institutional grant ID, agreement reference, or scope notes..."
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs bg-white text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setGrantModalOpen(false)}
                disabled={submittingGrant}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={submittingGrant}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submittingGrant ? "Authorizing..." : "Authorize Project Access"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Revoke Confirmation Modal */}
      {revokeModalOpen && grantToRevoke && (
        <Modal
          isOpen={revokeModalOpen}
          onClose={() => setRevokeModalOpen(false)}
          title="Revoke Donor Project Access"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700">
              Are you sure you want to revoke project access for <strong>{grantToRevoke.donorName}</strong> to project <strong>{grantToRevoke.projectName} ({grantToRevoke.projectCode})</strong>?
            </p>
            <p className="text-rose-600 font-medium">
              This will immediately terminate their ability to view analytics and download reports for this project.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevokeModalOpen(false)}
                disabled={submittingRevoke}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRevoke}
                disabled={submittingRevoke}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submittingRevoke ? "Revoking..." : "Confirm Immediate Revocation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
