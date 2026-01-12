"use client";

// BuildOS - Project Tabs Component
// Client component for tab navigation

import { useState, useTransition } from "react";
import Link from "next/link";
import { ProjectEditModal } from "./project-edit-modal";
import {
  archiveProjectAction,
  restoreProjectAction,
} from "@/app/actions/projects";
import { sendEstimateAction } from "@/app/actions/estimates";
import { createPhotoAction } from "@/app/actions/photos";
import { createRoomAction, updateRoomAction } from "@/app/actions/rooms";
import { useRouter } from "next/navigation";

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

interface Stage {
  id: string;
  roomId: string;
  name: string;
  description?: string | null;
  status: string;
  order: number;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  notes?: string | null;
}

interface Photo {
  id: string;
  stageId?: string | null;
  stageName?: string | null;
  filename: string;
  url: string;
  thumbnailUrl?: string | null;
  description?: string | null;
  capturedAt?: Date | string | null;
  createdAt?: Date | string | null;
}

interface Room {
  id: string;
  projectId: string;
  name: string;
  type?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  area?: number | null;
  perimeter?: number | null;
  wallArea?: number | null;
  tileHeightMode?: string | null;
  tileHeightValue?: number | null;
  tileWallsSelector?: string | null;
  notes?: string | null;
}

interface ProjectTabsProps {
  projectId: string;
  project: Project;
  estimates?: Estimate[];
  stages?: Stage[];
  photos?: Photo[];
  rooms?: Room[];
  canViewCost?: boolean;
}

type TabName = "details" | "estimates" | "stages" | "photos";

export function ProjectTabs({
  projectId,
  project,
  estimates = [],
  stages = [],
  photos = [],
  rooms = [],
  canViewCost = true,
}: ProjectTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabName>("details");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [sendingEstimateId, setSendingEstimateId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [isPhotoSubmitting, startPhotoSubmit] = useTransition();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoForm, setPhotoForm] = useState({
    stageId: "",
    description: "",
    capturedAt: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [roomsState, setRoomsState] = useState<Room[]>(rooms);
  const [roomForm, setRoomForm] = useState({
    name: "",
    type: "",
    length: "",
    width: "",
    height: "",
    tileHeightMode: "full",
    tileHeightValue: "",
    tileWallsSelector: "all",
  });
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomSuccess, setRoomSuccess] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const latestDraft = estimates
    .filter((estimate) => estimate.status === "draft")
    .sort((a, b) => b.version - a.version)[0];
  const hasClientEmail = Boolean(project.clientEmail);

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

  const handleCreatePhoto = () => {
    setPhotoError(null);
    setPhotoSuccess(null);

    if (!photoFile) {
      setPhotoError("Photo file is required");
      return;
    }

    startPhotoSubmit(async () => {
      const formData = new FormData();
      formData.append("projectId", projectId);
      if (photoForm.stageId) {
        formData.append("stageId", photoForm.stageId);
      }
      if (photoForm.description.trim()) {
        formData.append("description", photoForm.description.trim());
      }
      if (photoForm.capturedAt) {
        formData.append("capturedAt", photoForm.capturedAt);
      }
      formData.append("file", photoFile);

      const result = await createPhotoAction(formData);

      if (result.success) {
        setPhotoSuccess("Photo added");
        setPhotoForm({ stageId: "", description: "", capturedAt: "" });
        setPhotoFile(null);
        router.refresh();
      } else {
        setPhotoError(result.error || "Failed to add photo");
      }
    });
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

  const formatNumber = (value?: number | null) => {
    if (value === null || value === undefined) {
      return "—";
    }
    return new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const resetRoomForm = () => {
    setRoomForm({
      name: "",
      type: "",
      length: "",
      width: "",
      height: "",
      tileHeightMode: "full",
      tileHeightValue: "",
      tileWallsSelector: "all",
    });
    setEditingRoomId(null);
    setRoomError(null);
    setRoomSuccess(null);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setRoomForm({
      name: room.name,
      type: room.type || "",
      length: room.length ? String(room.length) : "",
      width: room.width ? String(room.width) : "",
      height: room.height ? String(room.height) : "",
      tileHeightMode: room.tileHeightMode || "full",
      tileHeightValue: room.tileHeightValue ? String(room.tileHeightValue) : "",
      tileWallsSelector: room.tileWallsSelector || "all",
    });
    setRoomError(null);
    setRoomSuccess(null);
  };

  const handleSaveRoom = async () => {
    setRoomError(null);
    setRoomSuccess(null);

    if (!roomForm.name.trim()) {
      setRoomError("Room name is required");
      return;
    }

    const payload = {
      projectId,
      name: roomForm.name.trim(),
      type: roomForm.type.trim() || undefined,
      length: roomForm.length ? Number(roomForm.length) : undefined,
      width: roomForm.width ? Number(roomForm.width) : undefined,
      height: roomForm.height ? Number(roomForm.height) : undefined,
      tileHeightMode: roomForm.tileHeightMode as "full" | "partial",
      tileHeightValue:
        roomForm.tileHeightMode === "partial" && roomForm.tileHeightValue
          ? Number(roomForm.tileHeightValue)
          : undefined,
      tileWallsSelector: roomForm.tileWallsSelector as "all" | "selected",
    };

    const result = editingRoomId
      ? await updateRoomAction(editingRoomId, payload)
      : await createRoomAction(payload);

    if (!result.success || !result.data) {
      setRoomError(result.error || "Failed to save room");
      return;
    }

    setRoomsState((prev) => {
      const updated = result.data as Room;
      if (editingRoomId) {
        return prev.map((room) => (room.id === updated.id ? updated : room));
      }
      return [updated, ...prev];
    });

    setRoomSuccess(editingRoomId ? "Room updated" : "Room added");
    resetRoomForm();
    router.refresh();
  };

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

  const getStageStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Planned",
      in_progress: "In Progress",
      completed: "Done",
    };
    return labels[status] || status;
  };

  const getStageStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const sanitizeStageNotes = (notes?: string | null) => {
    if (!notes) {
      return null;
    }
    const cleaned = notes
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return false;
        }
        if (trimmed.startsWith("Photos:")) {
          return false;
        }
        if (trimmed.includes("http://") || trimmed.includes("https://")) {
          return false;
        }
        return true;
      })
      .join("\n")
      .trim();
    return cleaned || null;
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
    { id: "photos", label: "Photos" },
  ];

  return (
    <>
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

              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rooms</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  {roomsState.map((room) => (
                    <div
                      key={room.id}
                      className="rounded-lg border border-gray-200 p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {room.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {room.type || "General"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>Length: {formatNumber(room.length)} m</div>
                        <div>Width: {formatNumber(room.width)} m</div>
                        <div>Height: {formatNumber(room.height)} m</div>
                        <div>Floor: {formatNumber(room.area)} m²</div>
                        <div>Walls: {formatNumber(room.wallArea)} m²</div>
                        <div>Perimeter: {formatNumber(room.perimeter)} m</div>
                      </div>
                    </div>
                  ))}
                  {roomsState.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                      No rooms yet. Add the first room below.
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-500">
                        Room name
                      </label>
                      <input
                        value={roomForm.name}
                        onChange={(event) =>
                          setRoomForm({ ...roomForm, name: event.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                        placeholder="Bathroom"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-500">
                        Room type
                      </label>
                      <input
                        value={roomForm.type}
                        onChange={(event) =>
                          setRoomForm({ ...roomForm, type: event.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                        placeholder="Bathroom"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-500">
                        Length (m)
                      </label>
                      <input
                        value={roomForm.length}
                        onChange={(event) =>
                          setRoomForm({ ...roomForm, length: event.target.value })
                        }
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-500">
                        Width (m)
                      </label>
                      <input
                        value={roomForm.width}
                        onChange={(event) =>
                          setRoomForm({ ...roomForm, width: event.target.value })
                        }
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-500">
                        Height (m)
                      </label>
                      <input
                        value={roomForm.height}
                        onChange={(event) =>
                          setRoomForm({ ...roomForm, height: event.target.value })
                        }
                        type="number"
                        step="0.01"
                        min="0"
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase text-gray-500">
                        Tile height mode
                      </label>
                      <select
                        value={roomForm.tileHeightMode}
                        onChange={(event) =>
                          setRoomForm({ ...roomForm, tileHeightMode: event.target.value })
                        }
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                      >
                        <option value="full">Full height</option>
                        <option value="partial">Partial height</option>
                      </select>
                    </div>
                    {roomForm.tileHeightMode === "partial" && (
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-500">
                          Tile height (m)
                        </label>
                        <input
                          value={roomForm.tileHeightValue}
                          onChange={(event) =>
                            setRoomForm({ ...roomForm, tileHeightValue: event.target.value })
                          }
                          type="number"
                          step="0.01"
                          min="0"
                          className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {roomError && (
                    <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {roomError}
                    </div>
                  )}
                  {roomSuccess && (
                    <div className="mt-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      {roomSuccess}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={handleSaveRoom}
                      className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      {editingRoomId ? "Update Room" : "Add Room"}
                    </button>
                    {editingRoomId && (
                      <button
                        onClick={resetRoomForm}
                        className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
                  disabled={!hasClientEmail || sendingEstimateId === latestDraft.id}
                  className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded hover:bg-blue-50 transition-colors disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
                  title={!hasClientEmail ? "Add client email to send estimate" : undefined}
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
                      {canViewCost && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client Price
                      </th>
                      {canViewCost && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Margin
                        </th>
                      )}
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
                        {canViewCost && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatCurrency(estimate.totalCost)}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCurrency(estimate.totalClient)}
                        </td>
                        {canViewCost && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={
                                toNumber(estimate.margin) >= 0
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {formatCurrency(estimate.margin)} (
                              {formatPercent(estimate.marginPercent)}%)
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(estimate.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {estimate.status === "draft" && (
                              <button
                                onClick={() => handleSendEstimate(estimate.id)}
                                disabled={!hasClientEmail || sendingEstimateId === estimate.id}
                                className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title={!hasClientEmail ? "Add client email to send estimate" : undefined}
                              >
                                {sendingEstimateId === estimate.id
                                  ? "Sending..."
                                  : "Send to client"}
                              </button>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              <Link
                                href={`/projects/${projectId}/estimates/${estimate.id}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View →
                              </Link>
                              {(estimate.status === "sent" ||
                                estimate.status === "approved") && (
                                <Link
                                  href={`/estimate/${estimate.id}`}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  Client view
                                </Link>
                              )}
                            </div>
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

            {stages.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No stages yet for this project.
              </div>
            ) : (
              <div className="space-y-4">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {stage.name}
                        </h3>
                        {stage.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {stage.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStageStatusBadge(
                          stage.status
                        )}`}
                      >
                        {getStageStatusLabel(stage.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>Start: {formatDate(stage.startedAt)}</span>
                      <span>Completed: {formatDate(stage.completedAt)}</span>
                    </div>

                    {sanitizeStageNotes(stage.notes) && (
                      <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
                        {sanitizeStageNotes(stage.notes)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "photos" && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Photo Timeline</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <select
                  value={photoForm.stageId}
                  onChange={(event) =>
                    setPhotoForm((prev) => ({ ...prev, stageId: event.target.value }))
                  }
                  className="border rounded px-3 py-2 text-sm"
                >
                  <option value="">General (no stage)</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  className="border rounded px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={photoForm.capturedAt}
                  onChange={(event) =>
                    setPhotoForm((prev) => ({
                      ...prev,
                      capturedAt: event.target.value,
                    }))
                  }
                  className="border rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={photoForm.description}
                  onChange={(event) =>
                    setPhotoForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  className="border rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreatePhoto}
                  disabled={isPhotoSubmitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isPhotoSubmitting ? "Uploading..." : "Add photo"}
                </button>
                {photoError && <span className="text-sm text-red-600">{photoError}</span>}
                {photoSuccess && (
                  <span className="text-sm text-green-600">{photoSuccess}</span>
                )}
              </div>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No photos yet for this project.
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  photos.reduce<Record<string, Photo[]>>((groups, photo) => {
                    const key = photo.stageName || "General";
                    if (!groups[key]) {
                      groups[key] = [];
                    }
                    groups[key].push(photo);
                    return groups;
                  }, {})
                ).map(([groupName, groupPhotos]) => (
                  <div key={groupName}>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {groupName}
                    </h3>
                    <div className="space-y-4">
                      {groupPhotos
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(a.capturedAt || a.createdAt || "").getTime() -
                            new Date(b.capturedAt || b.createdAt || "").getTime()
                        )
                        .map((photo) => (
                          <div
                            key={photo.id}
                            className="flex gap-4 items-start border border-gray-200 rounded-lg p-4 bg-white"
                          >
                            <button
                              type="button"
                              onClick={() => setLightboxPhoto(photo)}
                              className="flex-shrink-0"
                            >
                              <img
                                src={encodeURI(photo.thumbnailUrl || photo.url)}
                                alt={photo.description || photo.filename}
                                className="h-28 w-40 object-cover rounded"
                                loading="lazy"
                              />
                            </button>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {photo.description || photo.filename}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(photo.capturedAt || photo.createdAt)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {photo.stageName || "General"}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="max-w-4xl w-full" onClick={(event) => event.stopPropagation()}>
            <img
              src={encodeURI(lightboxPhoto.url)}
              alt={lightboxPhoto.description || lightboxPhoto.filename}
              className="w-full h-auto rounded shadow-lg"
            />
            <div className="text-white text-sm mt-3">
              {lightboxPhoto.description || lightboxPhoto.filename} •{" "}
              {formatDate(lightboxPhoto.capturedAt || lightboxPhoto.createdAt)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
