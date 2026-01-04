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
}

interface EstimateBuilderProps {
  projectId: string;
}

export function EstimateBuilder({ projectId }: EstimateBuilderProps) {
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Save as draft
  const handleSave = async () => {
    if (items.length === 0) {
      setError("Добавьте хотя бы один элемент");
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
        setSuccess("Смета сохранена как черновик");
        setItems([]);
      } else {
        setError(result.error || "Ошибка при сохранении");
      }
    } catch (err) {
      setError("Ошибка при сохранении сметы");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save and send to client
  const handleSaveAndSend = async () => {
    if (items.length === 0) {
      setError("Добавьте хотя бы один элемент");
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
        setError(createResult.error || "Ошибка при сохранении");
        return;
      }

      // Then send to client
      const sendResult = await sendEstimateAction(createResult.data.id);

      if (sendResult.success) {
        setSuccess("Смета создана и отправлена клиенту");
        setItems([]);
      } else {
        setError(sendResult.error || "Ошибка при отправке");
      }
    } catch (err) {
      setError("Ошибка при создании и отправке сметы");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
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
                Тип
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Название
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Описание
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ед.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Кол-во
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Себест.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Клиент
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Итого (С)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Итого (К)
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
                    <option value="work">Работа</option>
                    <option value="material">Материал</option>
                    <option value="subcontractor">Субподряд</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, "name", e.target.value)
                    }
                    placeholder="Название"
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
                    placeholder="Описание"
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
                    placeholder="м2"
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
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Нет элементов. Добавьте работы, материалы или субподряд.
          </div>
        )}
      </div>

      {/* Add Item Button */}
      <div>
        <button
          onClick={addItem}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Добавить элемент
        </button>
      </div>

      {/* Totals Summary */}
      {items.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 space-y-2">
          <h3 className="text-lg font-semibold mb-4">Итого</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Себестоимость:</p>
              <p className="text-xl font-bold text-gray-900">
                {totals.totalCost.toFixed(2)} PLN
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Клиент (общая сумма):</p>
              <p className="text-xl font-bold text-green-600">
                {totals.totalClient.toFixed(2)} PLN
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Маржа:</p>
              <p className="text-xl font-bold text-blue-600">
                {totals.margin.toFixed(2)} PLN
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Маржа %:</p>
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
          {isSubmitting ? "Сохранение..." : "Сохранить черновик"}
        </button>

        <button
          onClick={handleSaveAndSend}
          disabled={isSubmitting || items.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Отправка..." : "Сохранить и отправить клиенту"}
        </button>
      </div>
    </div>
  );
}
