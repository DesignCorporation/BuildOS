"use client";

// BuildOS - Project Tabs Component
// Client component for tab navigation

import { useState } from "react";
import Link from "next/link";
import { ProjectEditModal } from "./project-edit-modal";
import {
  archiveProjectAction,
  restoreProjectAction,
} from "@/app/actions/projects";
import { sendEstimateAction } from "@/app/actions/estimates";

interface Project {
  id: string;
  name: string;
  address?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  status: string;
  notes?: string | null;
  tags?: string[];
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  deletedAt?: Date | string | null;
}

interface Estimate {
  id: string;
  projectId: string;
  version: number;
  status: string;
  totalCost: number | { toString(): string };
  totalClient: number | { toString(): string };
  margin: number | { toString(): string };
  marginPercent: number | { toString(): string };
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  deletedAt?: Date | string | null;
}

interface ProjectTabsProps {
  projectId: string;
  project: Project;
  estimates?: Estimate[];
}

type TabName = "details" | "estimates" | "stages";

export function ProjectTabs({ projectId, project, estimates = [] }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>("details");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [sendingEstimateId, setSendingEstimateId] = useState<string | null>(null);
  const latestDraft = estimates
    .filter((estimate) => estimate.status === "draft")
    .sort((a, b) => b.version - a.version)[0];

  const isArchived = project.deletedAt !== null && project.deletedAt !== undefined;

  const formatDate = (value?: Date | string | null) => {
    if (!value) {
      return "—";
    }
    return new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Warsaw",
    }).format(new Date(value));
  };

  const toNumber = (value: number | { toString(): string }) => {
    if (typeof value === "number") {
      return value;
    }
    const parsed = Number(value.toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: number | { toString(): string }) =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(toNumber(value));

  const formatPercent = (value: number | { toString(): string }) =>
    new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(toNumber(value));

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      approved: "Approved",
      rejected: "Rejected",
    };
    return labels[status] || status;
  };

  const getProjectStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      active: "Active",
      completed: "Completed",
      archived: "Archived",
    };
    return labels[status] || status;
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this project?")) {
      return;
    }
    setIsArchiving(true);
    try {
      await archiveProjectAction(projectId);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async () => {
    setIsArchiving(true);
    try {
      await restoreProjectAction(projectId);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSendEstimate = async (estimateId: string) => {
    setSendingEstimateId(estimateId);
    try {
      await sendEstimateAction(estimateId);
    } finally {
      setSendingEstimateId(null);
    }
  };

  const tabs: { id: TabName; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "estimates", label: "Estimates" },
    { id: "stages", label: "Stages" },
  ];

  return (
    <div>
      {/* Tab Headers */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "details" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Project Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <p className="text-gray-900">{project.name}</p>
              </div>

              {project.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <p className="text-gray-900">{project.address}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <p className="text-gray-900">{getProjectStatusLabel(project.status)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <p className="text-gray-900">{formatDate(project.createdAt)}</p>
                </div>
              </div>

              {project.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {project.notes}
                  </p>
                </div>
              )}

              {project.tags && project.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(true)}
                disabled={isArchived}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Edit Project
              </button>

              {latestDraft && (
                <button
                  onClick={() => handleSendEstimate(latestDraft.id)}
                  disabled={sendingEstimateId === latestDraft.id}
                  className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded hover:bg-blue-50 transition-colors disabled:text-gray-400 disabled:border-gray-200"
                >
                  {sendingEstimateId === latestDraft.id
                    ? "Sending..."
                    : "Send estimate to client"}
                </button>
              )}

              {!isArchived && (
                <button
                  onClick={handleArchive}
                  disabled={isArchiving}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isArchiving ? "Archiving..." : "Archive"}
                </button>
              )}

              {isArchived && (
                <button
                  onClick={handleRestore}
                  disabled={isArchiving}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isArchiving ? "Restoring..." : "Restore"}
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === "estimates" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Estimates</h2>
              <Link
                href={`/projects/${projectId}/estimates/new`}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                + Create Estimate
              </Link>
            </div>

            {estimates.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-20 h-20 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No estimates yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create your first estimate for this project
                </p>
                <Link
                  href={`/projects/${projectId}/estimates/new`}
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                >
                  Create Estimate
                </Link>
              </div>
            ) : (
              /* Estimates Table */
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Margin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {estimates.map((estimate) => (
                      <tr key={estimate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          v{estimate.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              estimate.status
                            )}`}
                          >
                            {getStatusLabel(estimate.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(estimate.totalCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(estimate.totalClient)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={
                              toNumber(estimate.margin) >= 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {formatCurrency(estimate.margin)} ({formatPercent(estimate.marginPercent)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(estimate.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {estimate.status === "draft" && (
                              <button
                                onClick={() => handleSendEstimate(estimate.id)}
                                disabled={sendingEstimateId === estimate.id}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                              >
                                {sendingEstimateId === estimate.id
                                  ? "Sending..."
                                  : "Send to client"}
                              </button>
                            )}
                            <Link
                              href={`/projects/${projectId}/estimates/${estimate.id}`}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "stages" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6">Project Stages</h2>

            {/* Placeholder */}
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-20 h-20 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Coming Soon
              </h3>
              <p className="text-gray-600">
                Project stages will be available in Issue #18
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ProjectEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        projectId={projectId}
      />
    </div>
  );
}
