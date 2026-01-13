"use client";

// BuildOS - Estimate Builder Component
// Client component with table for adding/editing estimate items

import { useState } from "react";
import { createEstimateAction, sendEstimateAction } from "@/app/actions/estimates";

type ItemType = "work" | "material" | "subcontractor";

interface EstimateItem {
  id: string; // temporary client-side ID
  type: ItemType;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  unitCost: number;
  unitClient: number;
  workTypeId?: string;
}

interface EstimateBuilderProps {
  projectId: string;
  workTypes: WorkTypeOption[];
  rooms: RoomOption[];
}

interface WorkTypeOption {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  clientUnitPrice: number;
}

interface RoomOption {
  id: string;
  name: string;
  area: number | null;
  perimeter: number | null;
  wallArea: number | null;
}

type SurfaceKey = "walls" | "floor" | "ceiling" | "perimeter" | "other";

const surfaceLabels: Record<SurfaceKey, string> = {
  walls: "Walls",
  floor: "Floor",
  ceiling: "Ceiling",
  perimeter: "Perimeter",
  other: "Other",
};

export function EstimateBuilder({
  projectId,
  workTypes,
  rooms,
}: EstimateBuilderProps) {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedWorkTypeId, setSelectedWorkTypeId] = useState(
    workTypes[0]?.id || ""
  );
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    rooms[0]?.id || ""
  );
  const [selectedWorkTypeIds, setSelectedWorkTypeIds] = useState<Set<string>>(
    new Set()
  );

  // Add new empty row
  const addItem = () => {
    const newItem: EstimateItem = {
      id: crypto.randomUUID(),
      type: "work",
      name: "",
      description: "",
      unit: "m2",
      quantity: 1,
      unitCost: 0,
      unitClient: 0,
    };
    setItems([...items, newItem]);
  };

  const addFromCatalog = () => {
    const workType = workTypes.find((item) => item.id === selectedWorkTypeId);
    if (!workType) {
      setError("Select a work type from the catalog");
      return;
    }

    const newItem: EstimateItem = {
      id: crypto.randomUUID(),
      type: "work",
      name: workType.name,
      description: "",
      unit: workType.unit,
      quantity: 1,
      unitCost: workType.unitCost,
      unitClient: workType.clientUnitPrice,
      workTypeId: workType.id,
    };

    setItems([...items, newItem]);
  };

  const toggleWorkTypeSelection = (id: string) => {
    setSelectedWorkTypeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const inferSurface = (name: string): SurfaceKey => {
    const lower = name.toLowerCase();
    if (lower.includes("wall") || lower.includes("ścian") || lower.includes("стен")) {
      return "walls";
    }
    if (lower.includes("ceiling") || lower.includes("sufit") || lower.includes("потол")) {
      return "ceiling";
    }
    if (lower.includes("floor") || lower.includes("podłog") || lower.includes("пол")) {
      return "floor";
    }
    return "other";
  };

  const getSurfaceMeta = (workType: WorkTypeOption, room: RoomOption | null) => {
    const unit = workType.unit.toLowerCase();
    if (unit === "m2") {
      const surface = inferSurface(workType.name);
      const quantity =
        surface === "walls"
          ? room?.wallArea ?? null
          : surface === "ceiling"
            ? room?.area ?? null
            : surface === "floor"
              ? room?.area ?? null
              : room?.area ?? null;
      const formula =
        surface === "walls"
          ? "wallArea"
          : surface === "ceiling"
            ? "ceilingArea"
            : surface === "floor"
              ? "floorArea"
              : "area";
      return {
        surface,
        formula,
        quantity,
        unitLabel: "m²",
        missing: quantity === null,
      };
    }
    if (unit === "m") {
      return {
        surface: "perimeter" as const,
        formula: "perimeter",
        quantity: room?.perimeter ?? null,
        unitLabel: "m",
        missing: room?.perimeter == null,
      };
    }
    return {
      surface: "other" as const,
      formula: "unit",
      quantity: 1,
      unitLabel: unit,
      missing: false,
    };
  };

  const getQuantityForWorkType = (workType: WorkTypeOption, room: RoomOption) => {
    const unit = workType.unit.toLowerCase();
    if (unit === "m2") {
      const surface = inferSurface(workType.name);
      const area =
        surface === "walls" ? room.wallArea : surface === "ceiling" ? room.area : room.area;
      return area ?? null;
    }
    if (unit === "m") {
      return room.perimeter ?? null;
    }
    return 1;
  };

  const generateFromRoom = () => {
    setError(null);
    setSuccess(null);

    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room) {
      setError("Select a room to generate items");
      return;
    }

    if (selectedWorkTypeIds.size === 0) {
      setError("Select at least one work type");
      return;
    }

    const selectedWorkTypes = workTypes.filter((item) =>
      selectedWorkTypeIds.has(item.id)
    );

    const newItems: EstimateItem[] = [];

    for (const workType of selectedWorkTypes) {
      const quantity = getQuantityForWorkType(workType, room);
      if (quantity === null) {
        setError("Room geometry is missing for the selected work types");
        return;
      }

      newItems.push({
        id: crypto.randomUUID(),
        type: "work",
        name: workType.name,
        description: `Room: ${room.name}`,
        unit: workType.unit,
        quantity,
        unitCost: workType.unitCost,
        unitClient: workType.clientUnitPrice,
        workTypeId: workType.id,
      });
    }

    setItems([...items, ...newItems]);
    setSelectedWorkTypeIds(new Set());
    setSuccess("Items generated from room");
  };

  // Update item field
  const updateItem = (id: string, field: keyof EstimateItem, value: any) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Delete item
  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalCost = 0;
    let totalClient = 0;

    items.forEach((item) => {
      totalCost += item.quantity * item.unitCost;
      totalClient += item.quantity * item.unitClient;
    });

    const margin = totalClient - totalCost;
    const marginPercent = totalCost > 0 ? (margin / totalCost) * 100 : 0;

    return { totalCost, totalClient, margin, marginPercent };
  };

  const totals = calculateTotals();
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  // Save as draft
  const handleSave = async () => {
    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createEstimateAction({
        projectId,
        items: items.map(({ id, ...item }) => item), // Remove temp ID
      });

      if (result.success) {
        setSuccess("Estimate saved as draft");
        setItems([]);
      } else {
        setError(result.error || "Failed to save estimate");
      }
    } catch (err) {
      setError("Failed to save estimate");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save and send to client
  const handleSaveAndSend = async () => {
    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // First create estimate
      const createResult = await createEstimateAction({
        projectId,
        items: items.map(({ id, ...item }) => item),
      });

      if (!createResult.success) {
        setError(createResult.error || "Failed to save estimate");
        return;
      }

      // Then send to client
      if (!createResult.data) {
        setError("Failed to create estimate: no data returned");
        return;
      }

      const sendResult = await sendEstimateAction(createResult.data.id);

      if (sendResult.success) {
        setSuccess("Estimate created and sent to client");
        setItems([]);
      } else {
        setError(sendResult.error || "Failed to send estimate");
      }
    } catch (err) {
      setError("Failed to create and send estimate");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {workTypes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Add from catalog</span>
            <select
              value={selectedWorkTypeId}
              onChange={(event) => setSelectedWorkTypeId(event.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {workTypes.map((workType) => (
                <option key={workType.id} value={workType.id}>
                  {workType.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addFromCatalog}
              className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add item
            </button>
          </div>

          {rooms.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Generate from room geometry
                </span>
                <select
                  value={selectedRoomId}
                  onChange={(event) => setSelectedRoomId(event.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={generateFromRoom}
                  className="rounded-full border border-blue-600 px-3 py-1 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Generate items
                </button>
              </div>

              {(() => {
                const room = rooms.find((item) => item.id === selectedRoomId) || null;
                const grouped = workTypes.reduce<Record<SurfaceKey, WorkTypeOption[]>>(
                  (acc, workType) => {
                    const meta = getSurfaceMeta(workType, room);
                    acc[meta.surface].push(workType);
                    return acc;
                  },
                  { walls: [], floor: [], ceiling: [], perimeter: [], other: [] }
                );

                const requiresGeometry = workTypes.some((workType) => {
                  const unit = workType.unit.toLowerCase();
                  return unit === "m2" || unit === "m";
                });
                const hasGeometry =
                  room?.area != null || room?.wallArea != null || room?.perimeter != null;

                return (
                  <div className="space-y-4">
                    {requiresGeometry && !hasGeometry && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Room dimensions are missing. Fill in room geometry to see accurate quantities.
                      </div>
                    )}

                    {(Object.keys(grouped) as SurfaceKey[]).map((groupKey) => {
                      const entries = grouped[groupKey];
                      if (entries.length === 0) {
                        return null;
                      }

                      return (
                        <div key={groupKey}>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            {surfaceLabels[groupKey]}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {entries.map((workType) => {
                              const meta = getSurfaceMeta(workType, room);
                              return (
                                <label
                                  key={workType.id}
                                  className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-700"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedWorkTypeIds.has(workType.id)}
                                    onChange={() => toggleWorkTypeSelection(workType.id)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                                  />
                                  <span className="flex-1">
                                    <span className="flex items-center gap-2">
                                      <span className="font-medium">{workType.name}</span>
                                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                        {meta.formula}
                                      </span>
                                    </span>
                                    <span className="mt-1 block text-xs text-gray-500">
                                      {meta.missing
                                        ? "Missing room geometry"
                                        : `Qty: ${meta.quantity} ${meta.unitLabel}`}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
      {/* Error/Success messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total (Cost)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total (Client)
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2">
                  <select
                    value={item.type}
                    onChange={(e) =>
                      updateItem(item.id, "type", e.target.value)
                    }
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="work">Labor</option>
                    <option value="material">Materials</option>
                    <option value="subcontractor">Subcontractor</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, "name", e.target.value)
                    }
                    placeholder="Name"
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.description || ""}
                    onChange={(e) =>
                      updateItem(item.id, "description", e.target.value)
                    }
                    placeholder="Description"
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) =>
                      updateItem(item.id, "unit", e.target.value)
                    }
                    placeholder="m2"
                    className="w-20 border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                    className="w-24 border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={item.unitCost}
                    onChange={(e) =>
                      updateItem(item.id, "unitCost", parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                    className="w-24 border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={item.unitClient}
                    onChange={(e) =>
                      updateItem(item.id, "unitClient", parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                    className="w-24 border rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">
                  {(item.quantity * item.unitCost).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-sm font-medium">
                  {(item.quantity * item.unitClient).toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items yet. Add labor, materials, or subcontractors.
          </div>
        )}
      </div>

      {/* Add Item Button */}
      <div>
        <button
          onClick={addItem}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Add Item
        </button>
      </div>

      {/* Totals Summary */}
      {items.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-2">
          <h3 className="text-lg font-semibold mb-4">Totals</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cost total:</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(totals.totalCost)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Client total:</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totals.totalClient)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Margin:</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(totals.margin)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Margin %:</p>
              <p className="text-xl font-bold text-blue-600">
                {totals.marginPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={isSubmitting || items.length === 0}
          className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Draft"}
        </button>

        <button
          onClick={handleSaveAndSend}
          disabled={isSubmitting || items.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Sending..." : "Save & Send to Client"}
        </button>
      </div>
    </div>
  );
}
