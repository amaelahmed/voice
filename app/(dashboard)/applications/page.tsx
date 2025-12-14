"use client";

import { useEffect, useState, useCallback } from "react";
import { ApplicationStatus } from "@prisma/client";

interface ApplicationWithDetails {
  id: string;
  createdAt: string;
  status: ApplicationStatus;
  note?: string;
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
  };
  matchScore?: {
    score: number;
    telegramMessageTs?: string;
  };
}

interface DashboardStats {
  total: number;
  approved: number;
  skipped: number;
  notified: number;
  averageScore: number;
}

export default function ApplicationsDashboard() {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    approved: 0,
    skipped: 0,
    notified: 0,
    averageScore: 0,
  });
  const [filter, setFilter] = useState<ApplicationStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/applications?filter=${filter === "ALL" ? "" : filter}`
      );
      const data = await response.json();
      setApplications(data.applications || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return "bg-green-100 text-green-800";
      case ApplicationStatus.SKIPPED:
        return "bg-gray-100 text-gray-800";
      case ApplicationStatus.NOTIFIED:
        return "bg-blue-100 text-blue-800";
      case ApplicationStatus.QUEUED_FOR_SUBMISSION:
        return "bg-yellow-100 text-yellow-800";
      case ApplicationStatus.SUBMITTED:
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    return status.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Applications Dashboard
          </h1>
          <p className="text-gray-600">
            Track your job applications and match scores
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Applications"
            value={stats.total}
            bgColor="bg-blue-50"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            bgColor="bg-green-50"
          />
          <StatCard
            label="Skipped"
            value={stats.skipped}
            bgColor="bg-gray-50"
          />
          <StatCard
            label="Average Match Score"
            value={`${(stats.averageScore * 100).toFixed(0)}%`}
            bgColor="bg-purple-50"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <FilterButton
              label="All"
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            />
            <FilterButton
              label="Approved"
              active={filter === ApplicationStatus.APPROVED}
              onClick={() => setFilter(ApplicationStatus.APPROVED)}
            />
            <FilterButton
              label="Skipped"
              active={filter === ApplicationStatus.SKIPPED}
              onClick={() => setFilter(ApplicationStatus.SKIPPED)}
            />
            <FilterButton
              label="Notified"
              active={filter === ApplicationStatus.NOTIFIED}
              onClick={() => setFilter(ApplicationStatus.NOTIFIED)}
            />
            <FilterButton
              label="Queued"
              active={filter === ApplicationStatus.QUEUED_FOR_SUBMISSION}
              onClick={() => setFilter(ApplicationStatus.QUEUED_FOR_SUBMISSION)}
            />
          </div>
        </div>

        {/* Applications List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No applications found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Job Title
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Company
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Location
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Match Score
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-900">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {app.job.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {app.job.company}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {app.job.location || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {app.matchScore && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{
                                width: `${Math.round(app.matchScore.score * 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {Math.round(app.matchScore.score * 100)}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  bgColor,
}: {
  label: string;
  value: string | number;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-6`}>
      <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
