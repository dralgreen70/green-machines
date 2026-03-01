"use client";

import { useState, useEffect, useCallback } from "react";

interface Swimmer {
  id: number;
  firstName: string;
  lastName: string;
  usaSwimmingId: string;
  _count: { times: number };
}

interface SwimmerRequest {
  id: number;
  firstName: string;
  lastName: string;
  usaSwimmingId: string;
  requestedAt: string;
  status: string;
}

interface AdminData {
  swimmers: Swimmer[];
  requests: {
    pending: SwimmerRequest[];
    synced: SwimmerRequest[];
    failed: SwimmerRequest[];
  };
  lastSyncDate: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 border border-yellow-300",
    synced:
      "bg-green-100 text-green-800 border border-green-300",
    failed:
      "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
        styles[status] || "bg-gray-100 text-gray-700 border border-gray-300"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RequestTable({
  title,
  requests,
  status,
  icon,
}: {
  title: string;
  requests: SwimmerRequest[];
  status: string;
  icon: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span>{icon}</span> {title}
          <span className="ml-auto text-sm font-normal text-gray-400">
            0 requests
          </span>
        </h3>
        <p className="text-gray-400 text-sm text-center py-4">
          No {status} requests.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>{icon}</span> {title}
          <span className="ml-auto text-sm font-normal text-gray-400">
            {requests.length} request{requests.length !== 1 ? "s" : ""}
          </span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wider">
              <th className="px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">USA Swimming ID</th>
              <th className="px-6 py-3 font-semibold">Requested</th>
              <th className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 font-medium text-gray-900">
                  {req.firstName} {req.lastName}
                </td>
                <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                  {req.usaSwimmingId || "---"}
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {formatDate(req.requestedAt)}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge status={req.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoginScreen({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Invalid password. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              Admin Access
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Enter the admin password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function Dashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/data");
      if (!res.ok) {
        if (res.status === 401) {
          window.location.reload();
          return;
        }
        throw new Error("Failed to fetch admin data");
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load admin data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading admin data...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const totalRequests =
    data.requests.pending.length +
    data.requests.synced.length +
    data.requests.failed.length;

  const totalTimes = data.swimmers.reduce(
    (sum, s) => sum + s._count.times,
    0
  );

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 via-green-500 to-cyan-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Admin Dashboard
          </h1>
          <p className="text-green-100 text-sm">
            Manage swimmers, review requests, and monitor sync status.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Last Sync */}
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Last Sync
            </p>
            <p className="text-lg font-bold text-gray-900">
              {data.lastSyncDate
                ? formatDate(data.lastSyncDate)
                : "Never"}
            </p>
            {data.lastSyncDate && (
              <p className="text-xs text-gray-400 mt-1">
                {timeAgo(data.lastSyncDate)}
              </p>
            )}
          </div>

          {/* Swimmers Tracked */}
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Swimmers Tracked
            </p>
            <p className="text-3xl font-extrabold text-green-600">
              {data.swimmers.length}
            </p>
          </div>

          {/* Total Times */}
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Total Times
            </p>
            <p className="text-3xl font-extrabold text-green-600">
              {totalTimes.toLocaleString()}
            </p>
          </div>

          {/* Total Requests */}
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Total Requests
            </p>
            <p className="text-3xl font-extrabold text-green-600">
              {totalRequests}
            </p>
          </div>
        </div>

        {/* Swimmer Requests by Status */}
        <div className="mb-8">
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">
            Swimmer Requests
          </h2>
          <div className="space-y-6">
            <RequestTable
              title="Pending Requests"
              requests={data.requests.pending}
              status="pending"
              icon="&#9203;"
            />
            <RequestTable
              title="Synced Requests"
              requests={data.requests.synced}
              status="synced"
              icon="&#9989;"
            />
            <RequestTable
              title="Failed Requests"
              requests={data.requests.failed}
              status="failed"
              icon="&#10060;"
            />
          </div>
        </div>

        {/* Tracked Swimmers */}
        <div className="mb-12">
          <h2 className="text-xl font-extrabold text-gray-900 mb-4">
            Tracked Swimmers
          </h2>
          {data.swimmers.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <p className="text-gray-400">No swimmers being tracked yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wider">
                      <th className="px-6 py-3 font-semibold">ID</th>
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-6 py-3 font-semibold">
                        USA Swimming ID
                      </th>
                      <th className="px-6 py-3 font-semibold text-right">
                        Times Recorded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.swimmers.map((swimmer) => (
                      <tr
                        key={swimmer.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                          #{swimmer.id}
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {swimmer.firstName} {swimmer.lastName}
                        </td>
                        <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                          {swimmer.usaSwimmingId || "---"}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="inline-flex items-center justify-center bg-green-50 text-green-700 font-semibold text-xs px-3 py-1 rounded-full border border-green-200">
                            {swimmer._count.times} time
                            {swimmer._count.times !== 1 ? "s" : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  // On mount, check if already authenticated by hitting the data endpoint
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/admin/data", { method: "GET" });
        if (res.ok) {
          setAuthenticated(true);
        }
      } catch {
        // Not authenticated, show login
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      </main>
    );
  }

  if (!authenticated) {
    return <LoginScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
