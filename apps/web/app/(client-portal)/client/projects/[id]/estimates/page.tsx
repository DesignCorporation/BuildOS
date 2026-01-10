// BuildOS - Client Project Estimates

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EstimateService, ProjectService } from "@buildos/services";
import { getClientContext, hasPermission } from "../../../lib/client-portal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProjectEstimatesPage({ params }: PageProps) {
  const { id } = await params;
  const { context, user } = await getClientContext();
  if (!user?.email) {
    redirect("/client/unauthorized");
  }

  const canViewProjects = await hasPermission(
    user.id,
    context,
    "projects",
    "view"
  );
  const canViewEstimates = await hasPermission(
    user.id,
    context,
    "estimates",
    "view"
  );
  if (!canViewProjects || !canViewEstimates) {
    redirect("/client/unauthorized");
  }

  const projectService = new ProjectService(context);
  const project = await projectService.getProjectForClient(id, user.email);
  if (!project) {
    notFound();
  }

  const estimateService = new EstimateService(context);
  const estimatesResult = await estimateService.getClientEstimatesByProjectId(
    project.id,
    user.id,
    { page: 1, limit: 100 }
  );
  const estimates = estimatesResult.data || [];

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      currencyDisplay: "code",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        <Link href="/client/projects" className="hover:text-blue-600">
          Projects
        </Link>
        {" > "}
        <Link href={`/client/projects/${project.id}`} className="hover:text-blue-600">
          {project.name}
        </Link>
        {" > "}
        <span className="text-gray-900">Estimates</span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={`/client/projects/${project.id}`}
          className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Overview
        </Link>
        <Link
          href={`/client/projects/${project.id}/estimates`}
          className="px-3 py-1 rounded-full bg-blue-600 text-white"
        >
          Estimates
        </Link>
        <Link
          href={`/client/projects/${project.id}/photos`}
          className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Photos
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {estimates.length === 0 ? (
              <tr>
                <td className="px-6 py-6 text-sm text-gray-600" colSpan={5}>
                  No estimates available yet.
                </td>
              </tr>
            ) : (
              estimates.map((estimate: any) => (
                <tr key={estimate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    v{estimate.version}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {estimate.status}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatCurrency(Number(estimate.totalClient || 0))}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(estimate.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/estimate/${estimate.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
