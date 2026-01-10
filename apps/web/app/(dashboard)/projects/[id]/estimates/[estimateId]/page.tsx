// BuildOS - Internal Estimate View (Owner/PM)
// Shows full estimate details with cost breakdown (RBAC-aware)

import { prisma, UserRepository } from "@buildos/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDemoContext } from "@/lib/demo-context";

interface PageProps {
  params: Promise<{ id: string; estimateId: string }>;
}

export default async function EstimatePage({ params }: PageProps) {
  const { id: projectId, estimateId } = await params;
  const context = await getDemoContext();

  const estimate = await prisma.estimate.findFirst({
    where: {
      id: estimateId,
      projectId,
      tenantId: context.tenantId,
      deletedAt: null,
    },
    include: {
      items: {
        orderBy: { order: "asc" },
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

  const userRepo = new UserRepository(prisma, context);
  const canViewCost = await userRepo.hasPermission(
    context.userId,
    "estimates",
    "view_cost"
  );

  const toNumber = (value: unknown) => {
    if (value && typeof value === "object" && "toNumber" in value) {
      return (value as { toNumber: () => number }).toNumber();
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (typeof value === "number") {
      return value;
    }
    return 0;
  };

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

  const formatCurrency = (value: unknown) =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-600 mb-4">
        <Link href="/projects" className="hover:text-blue-600">
          Projects
        </Link>
        {" > "}
        <Link href={`/projects/${projectId}`} className="hover:text-blue-600">
          {estimate.project?.name || "Project"}
        </Link>
        {" > "}
        <span className="text-gray-900">Estimate v{estimate.version}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start gap-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Estimate v{estimate.version}
            </h1>
            <div className="text-sm text-gray-600 space-y-1">
              {estimate.project?.name && <div>{estimate.project.name}</div>}
              {estimate.project?.address && <div>{estimate.project.address}</div>}
              <div>Created: {formatDate(estimate.createdAt)}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(
                estimate.status
              )}`}
            >
              {estimate.status}
            </span>
            {estimate.sentAt && (
              <div className="text-sm text-gray-600">
                Sent: {formatDate(estimate.sentAt)}
              </div>
            )}
            {estimate.approvedAt && (
              <div className="text-sm text-gray-600">
                Approved: {formatDate(estimate.approvedAt)}
              </div>
            )}
            {estimate.validUntil && (
              <div className="text-sm text-gray-600">
                Valid until: {formatDate(estimate.validUntil)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Client total</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(estimate.totalClient)}
          </p>
        </div>
        {canViewCost ? (
          <>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total cost</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(estimate.totalCost)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Margin</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(estimate.margin)} (
                {toNumber(estimate.marginPercent).toFixed(1)}%)
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Margin</p>
            <p className="text-2xl font-bold text-gray-900">—</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unit
              </th>
              {canViewCost && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit Cost
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Unit Client
              </th>
              {canViewCost && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Cost
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total Client
              </th>
              {canViewCost && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Margin
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {estimate.items.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {item.name}
                  </div>
                  {item.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {item.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.type}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {toNumber(item.quantity).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                {canViewCost && (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatCurrency(item.unitCost)}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatCurrency(item.unitClient)}
                </td>
                {canViewCost && (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatCurrency(item.totalCost)}
                  </td>
                )}
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatCurrency(item.totalClient)}
                </td>
                {canViewCost && (
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatCurrency(item.margin)} (
                    {toNumber(item.marginPercent).toFixed(1)}%)
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
