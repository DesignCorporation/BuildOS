"use client";

// BuildOS - Work Catalog Client UI

import { useMemo, useState } from "react";
import {
  createWorkTypeAction,
  setWorkTypeActiveAction,
  updateWorkTypeAction,
} from "@/app/actions/work-types";

type WorkTypeTranslation = {
  locale: string;
  name: string;
  description?: string | null;
};

type WorkTypeRow = {
  id: string;
  code?: string | null;
  category?: string | null;
  unit: string;
  unitCost: number;
  clientUnitPrice: number;
  laborNormHoursPerUnit: number;
  isActive: boolean;
  translations: WorkTypeTranslation[];
};

const UNIT_OPTIONS = ["m2", "m", "pcs", "hour", "set"];

const emptyForm = {
  code: "",
  category: "",
  unit: "m2",
  unitCost: "0",
  clientUnitPrice: "0",
  laborNormHoursPerUnit: "0",
  namePl: "",
  nameRu: "",
};

export function WorkTypesClient({ initialWorkTypes }: { initialWorkTypes: WorkTypeRow[] }) {
  const [workTypes, setWorkTypes] = useState<WorkTypeRow[]>(initialWorkTypes);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const workTypeMap = useMemo(
    () => new Map(workTypes.map((workType) => [workType.id, workType])),
    [workTypes]
  );

  const getTranslation = (workType: WorkTypeRow, locale: string) =>
    workType.translations.find((t) => t.locale === locale)?.name || "";

  const getDisplayName = (workType: WorkTypeRow) =>
    getTranslation(workType, "pl") ||
    getTranslation(workType, "ru") ||
    workType.translations[0]?.name ||
    "Untitled";

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (id: string) => {
    const workType = workTypeMap.get(id);
    if (!workType) {
      return;
    }

    setEditingId(id);
    setForm({
      code: workType.code || "",
      category: workType.category || "",
      unit: workType.unit,
      unitCost: String(workType.unitCost),
      clientUnitPrice: String(workType.clientUnitPrice),
      laborNormHoursPerUnit: String(workType.laborNormHoursPerUnit || 0),
      namePl: getTranslation(workType, "pl"),
      nameRu: getTranslation(workType, "ru"),
    });
    setError(null);
    setSuccess(null);
  };

  const buildTranslations = () => {
    const translations: WorkTypeTranslation[] = [];
    if (form.namePl.trim()) {
      translations.push({ locale: "pl", name: form.namePl.trim() });
    }
    if (form.nameRu.trim()) {
      translations.push({ locale: "ru", name: form.nameRu.trim() });
    }
    return translations;
  };

  const upsertWorkType = async () => {
    setError(null);
    setSuccess(null);

    const translations = buildTranslations();
    if (translations.length === 0) {
      setError("Provide at least one translation (PL or RU).");
      return;
    }

    const payload = {
      code: form.code.trim() || undefined,
      category: form.category.trim() || undefined,
      unit: form.unit,
      unitCost: Number(form.unitCost || 0),
      clientUnitPrice: Number(form.clientUnitPrice || 0),
      laborNormHoursPerUnit: Number(form.laborNormHoursPerUnit || 0),
      translations,
    };

    const result = editingId
      ? await updateWorkTypeAction(editingId, payload)
      : await createWorkTypeAction(payload);

    if (!result.success || !result.data) {
      setError(result.error || "Failed to save work type.");
      return;
    }

    setWorkTypes((prev) => {
      const updated = result.data as WorkTypeRow;
      const exists = prev.some((item) => item.id === updated.id);
      if (exists) {
        return prev.map((item) => (item.id === updated.id ? updated : item));
      }
      return [updated, ...prev];
    });

    setSuccess(editingId ? "Work type updated." : "Work type created.");
    resetForm();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const result = await setWorkTypeActiveAction(id, isActive);
    if (!result.success || !result.data) {
      setError(result.error || "Failed to update status.");
      return;
    }

    setWorkTypes((prev) =>
      prev.map((item) => (item.id === id ? (result.data as WorkTypeRow) : item))
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Work Catalog</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage work types and pricing used in estimates.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">
              Name (PL)
            </label>
            <input
              value={form.namePl}
              onChange={(event) => setForm({ ...form, namePl: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Szpachlowanie ścian"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">
              Name (RU)
            </label>
            <input
              value={form.nameRu}
              onChange={(event) => setForm({ ...form, nameRu: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Шпаклевка стен"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">Code</label>
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="work-wall-putty"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">Category</label>
            <input
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Finishing"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">Unit</label>
            <select
              value={form.unit}
              onChange={(event) => setForm({ ...form, unit: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">
              Client Price / Unit
            </label>
            <input
              value={form.clientUnitPrice}
              onChange={(event) => setForm({ ...form, clientUnitPrice: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              type="number"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">
              Cost / Unit
            </label>
            <input
              value={form.unitCost}
              onChange={(event) => setForm({ ...form, unitCost: event.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              type="number"
              step="0.01"
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase text-gray-500">
              Labor Norm (hrs/unit)
            </label>
            <input
              value={form.laborNormHoursPerUnit}
              onChange={(event) =>
                setForm({ ...form, laborNormHoursPerUnit: event.target.value })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              type="number"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={upsertWorkType}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {editingId ? "Update Work Type" : "Create Work Type"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Catalog Items</h2>
          <p className="text-sm text-gray-500">Active and archived work types.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-left">Client Price</th>
                <th className="px-4 py-3 text-left">Cost</th>
                <th className="px-4 py-3 text-left">Norm</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workTypes.map((workType) => (
                <tr key={workType.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {getDisplayName(workType)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {workType.code || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{workType.unit}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {workType.clientUnitPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {workType.unitCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {workType.laborNormHoursPerUnit.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                        workType.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {workType.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(workType.id)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(workType.id, !workType.isActive)}
                      className="text-sm font-semibold text-gray-600 hover:text-gray-800"
                    >
                      {workType.isActive ? "Archive" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
              {workTypes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    No work types yet. Create the first entry above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
