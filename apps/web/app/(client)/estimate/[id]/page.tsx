// BuildOS - Client Estimate View (Read-only)
// RBAC: Client-safe - NO cost/margin fields!

import { prisma } from "@buildos/database";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientEstimatePage({ params }: PageProps) {
  const { id } = await params;

  // Fetch estimate (client-safe query - no cost fields!)
  const estimate = await prisma.estimate.findFirst({
    where: {
      id,
      // Security: only sent or approved estimates are visible
      status: {
        in: ["sent", "approved"],
      },
      deletedAt: null,
    },
    select: {
      // Estimate fields - CLIENT SAFE (no cost/margin!)
      id: true,
      version: true,
      status: true,
      createdAt: true,
      sentAt: true,
      approvedAt: true,
      pdfUrl: true,
      pdfGeneratedAt: true,
      totalClient: true, // ✅ Client sees this
      // ❌ NO: totalCost, margin, marginPercent

      // Related data
      items: {
        where: {
          // Items don't have deletedAt, but include for consistency
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          unit: true,
          quantity: true,
          unitClient: true, // ✅ Client sees this
          totalClient: true, // ✅ Client sees this
          // ❌ NO: unitCost, totalCost, margin, marginPercent
        },
      },
      project: {
        select: {
          name: true,
          address: true,
        },
      },
    },
  });

  if (!estimate) {
    notFound();
  }

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  // Format currency
  const formatCurrency = (amount: number | string | { toNumber(): number }) => {
    let num: number;
    if (typeof amount === "string") {
      num = parseFloat(amount);
    } else if (typeof amount === "number") {
      num = amount;
    } else {
      // Prisma Decimal type
      num = amount.toNumber();
    }
    return `${num.toFixed(2)} PLN`;
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "work":
        return "Работа";
      case "material":
        return "Материал";
      case "subcontractor":
        return "Субподряд";
      default:
        return type;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Отправлено
          </span>
        );
      case "approved":
        return (
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            Утверждено
          </span>
        );
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Смета {estimate.project.name ? `на проект "${estimate.project.name}"` : ""}
              </h1>
              <p className="text-gray-600">
                Версия {estimate.version} • {formatDate(estimate.createdAt)}
              </p>
              {estimate.project.address && (
                <p className="text-gray-600 mt-1">
                  Адрес: {estimate.project.address}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 text-sm text-gray-600">
              {getStatusBadge(estimate.status)}
              {estimate.status === "approved" && estimate.approvedAt && (
                <div>Утверждено: {formatDate(estimate.approvedAt)}</div>
              )}
              {estimate.status === "sent" && estimate.sentAt && (
                <div>Отправлено: {formatDate(estimate.sentAt)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-8 py-6">
          <h2 className="text-xl font-semibold mb-4">Состав работ</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    №
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Наименование
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цена за ед.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Итого
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estimate.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {getTypeLabel(item.type)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {Number(item.quantity).toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(item.unitClient)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(item.totalClient)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 px-8 py-6 bg-gray-50">
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Итого:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(estimate.totalClient)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Download */}
        {estimate.pdfUrl && (
          <div className="border-t border-gray-200 px-8 py-6">
            <a
              href={estimate.pdfUrl}
              download
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Скачать PDF
            </a>
            {estimate.pdfGeneratedAt && (
              <p className="text-sm text-gray-500 mt-2">
                PDF сгенерирован: {formatDate(estimate.pdfGeneratedAt)}
              </p>
            )}
          </div>
        )}

        {/* Contact Manager */}
        <div className="border-t border-gray-200 px-8 py-6">
          <p className="text-sm text-gray-700 font-medium mb-2">Контакт менеджера</p>
          <p className="text-sm text-gray-600">
            Demo placeholder: contact@anchor-construction.pl, +48 500 000 000
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 bg-gray-50">
          <p className="text-sm text-gray-500 text-center">
            Если у вас есть вопросы по смете, свяжитесь с нами
          </p>
        </div>
      </div>
    </div>
  );
}
