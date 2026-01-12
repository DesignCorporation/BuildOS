// BuildOS - Dashboard

import Link from "next/link";
import { prisma, UserRepository } from "@buildos/database";
import { getDemoContext } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (value?: Date | null) => {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Warsaw",
  }).format(value);
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const decimal = value as { toNumber: () => number };
    return decimal.toNumber();
  }
  return 0;
};

export default async function DashboardPage() {
  const context = await getDemoContext();
  const userRepo = new UserRepository(prisma, context);
  const user = await userRepo.findById(context.userId);
  const greetingName = user?.name?.split(" ")[0] || "there";

  const canViewProjects = await userRepo.hasPermission(
    context.userId,
    "projects",
    "view"
  );
  const canViewEstimates = await userRepo.hasPermission(
    context.userId,
    "estimates",
    "view"
  );
  const canViewCost = await userRepo.hasPermission(
    context.userId,
    "estimates",
    "view_cost"
  );

  if (!canViewProjects) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          You don&apos;t have access to the dashboard yet.
        </div>
      </div>
    );
  }

  const [projectsByStatus, totalProjects, activeProjects, recentProjects] =
    await Promise.all([
      prisma.project.groupBy({
        by: ["status"],
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.project.count({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
        },
      }),
      prisma.project.count({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
          status: "active",
        },
      }),
      prisma.project.findMany({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          name: true,
          address: true,
          status: true,
          clientName: true,
          updatedAt: true,
          createdAt: true,
        },
      }),
    ]);

  const [estimateTotals, lastEstimate] = canViewEstimates
    ? await Promise.all([
        prisma.estimate.aggregate({
          where: {
            tenantId: context.tenantId,
            deletedAt: null,
            status: "approved",
          },
          _sum: {
            totalClient: true,
            totalCost: true,
          },
          _count: {
            _all: true,
          },
        }),
        prisma.estimate.findFirst({
          where: {
            tenantId: context.tenantId,
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
          },
        }),
      ])
    : [null, null];

  const approvedTotalClient = toNumber(estimateTotals?._sum?.totalClient);
  const approvedTotalCost = toNumber(estimateTotals?._sum?.totalCost);
  const approvedCount = estimateTotals?._count?._all ?? 0;

  const statusSummary = ["draft", "active", "completed", "archived"].map(
    (status) => {
      const match = projectsByStatus.find((item) => item.status === status);
      return {
        status,
        count: match?._count?._all ?? 0,
      };
    }
  );

  const statusTotal = statusSummary.reduce((sum, item) => sum + item.count, 0) || 1;

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Dashboard</p>
          <h1 className="text-3xl font-semibold text-gray-900 mt-2">
            Good afternoon, {greetingName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
            defaultValue="last-week"
          >
            <option value="last-week">Last week</option>
            <option value="last-month">Last month</option>
            <option value="last-quarter">Last quarter</option>
          </select>
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New project
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Create estimate
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Overview</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">Total projects</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {totalProjects}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {activeProjects} active
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">Approved value</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {canViewEstimates ? formatCurrency(approvedTotalClient) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {canViewEstimates ? `${approvedCount} estimates approved` : "No access"}
            </p>
            {canViewCost && (
              <p className="text-xs text-gray-500">
                Cost total: {formatCurrency(approvedTotalCost)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">Active projects</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {activeProjects}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {totalProjects > 0
                ? `${Math.round((activeProjects / totalProjects) * 100)}% of total`
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-gray-500">Last estimate</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2">
              {canViewEstimates ? formatDate(lastEstimate?.createdAt ?? null) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Latest client-ready update
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Recent projects</h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Project</th>
                  <th className="px-2 py-2 text-left font-medium">Client</th>
                  <th className="px-2 py-2 text-left font-medium">Status</th>
                  <th className="px-2 py-2 text-left font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentProjects.length === 0 ? (
                  <tr>
                    <td className="px-2 py-4 text-gray-500" colSpan={4}>
                      No projects yet.
                    </td>
                  </tr>
                ) : (
                  recentProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-2 py-3">
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {project.name}
                        </Link>
                        {project.address && (
                          <div className="text-xs text-gray-500">{project.address}</div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-gray-600">
                        {project.clientName || "—"}
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                          {project.status}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-600">
                        {formatDate(project.updatedAt || project.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Project status</h2>
          <div className="space-y-4">
            {statusSummary.map((item) => {
              const percent = Math.round((item.count / statusTotal) * 100);
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span className="capitalize">{item.status}</span>
                    <span className="text-gray-500">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-xs text-gray-500">
            Status distribution across active portfolio.
          </div>
        </div>
      </div>
    </div>
  );
}
