"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  UsersIcon,
  UserPlusIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "@/components/common/Icons";

export default function UserManager({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // New user form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("field_worker");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load users");
      }
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setActionMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, status: "active" }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create user");
      }

      setActionMessage(`User "${data.user.name}" created successfully!`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("field_worker");
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(userId, currentStatus) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setError("");
    setActionMessage("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      setActionMessage(`User status changed to ${newStatus}.`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          {actionMessage}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
          <AlertCircleIcon className="w-4 h-4 text-rose-600" />
          {error}
        </div>
      )}

      {/* Grid: Create User & User Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create User Form (4 cols) */}
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <UserPlusIcon className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Create New User</CardTitle>
                  <CardDescription>
                    Add a Field Worker or Donor account.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. worker@healthsurvey.org"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="field_worker">Field Worker (Survey Fieldwork)</option>
                    <option value="donor">Donor (Read-Only Impact Reports)</option>
                    <option value="superadmin">Superadmin (Full Admin Rights)</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="w-full mt-2"
                >
                  {isSubmitting ? "Creating User..." : "Add User"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* User Directory Table (8 cols) */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">User Directory & Status</CardTitle>
                <CardDescription>
                  Manage active credentials and role permissions.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500">
                      <th className="py-2.5 px-4 font-semibold">User</th>
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Last Login</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          {isLoading ? "Loading users..." : "No users found."}
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        const roleVariants = {
                          superadmin: "primary",
                          field_worker: "info",
                          donor: "neutral",
                        };

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">
                                {u.name} {isSelf && "(You)"}
                              </div>
                              <div className="text-slate-400 font-mono text-[11px]">
                                {u.email}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant={roleVariants[u.role] || "neutral"} size="sm">
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-3">
                              <Badge
                                variant={u.status === "active" ? "success" : "danger"}
                                size="sm"
                              >
                                {u.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {u.lastLoginAt
                                ? new Date(u.lastLoginAt).toLocaleDateString()
                                : "Never"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isSelf ? (
                                <span className="text-slate-400 text-[11px]">Active Admin</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u.id, u.status)}
                                  className={`font-semibold text-xs transition-colors ${
                                    u.status === "active"
                                      ? "text-rose-600 hover:text-rose-800"
                                      : "text-emerald-600 hover:text-emerald-800"
                                  }`}
                                >
                                  {u.status === "active" ? "Deactivate" : "Activate"}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
