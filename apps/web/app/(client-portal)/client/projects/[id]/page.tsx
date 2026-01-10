// BuildOS - Client Project Overview

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EstimateService, PhotoService, ProjectService, StageService } from "@buildos/services";
import { getClientContext, hasPermission } from "../../lib/client-portal";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProjectPage({ params }: PageProps) {
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
  if (!canViewProjects) {
    redirect("/client/unauthorized");
  }

  const projectService = new ProjectService(context);
  const project = await projectService.getProjectForClient(id, user.email);
  if (!project) {
    notFound();
  }

  const canViewEstimates = await hasPermission(
    user.id,
    context,
    "estimates",
    "view"
  );
  const canViewStages = await hasPermission(user.id, context, "stages", "view");

  const estimateService = new EstimateService(context);
  const stageService = new StageService(context);
  const photoService = new PhotoService(context);

  const [estimatesResult, stages, photos] = await Promise.all([
    canViewEstimates
      ? estimateService.getClientEstimatesByProjectId(project.id, user.id, {
          page: 1,
          limit: 50,
        })
      : Promise.resolve({ data: [] }),
    canViewStages ? stageService.getStagesByProjectId(project.id) : Promise.resolve([]),
    photoService.getPhotosByProjectId(project.id),
  ]);

  const estimates = estimatesResult.data || [];
  const totalClient = estimates.reduce(
    (sum, estimate: any) => sum + Number(estimate.totalClient || 0),
    0
  );
  const approvedClient = estimates.reduce(
    (sum, estimate: any) =>
      estimate.status === "approved" ? sum + Number(estimate.totalClient || 0) : sum,
    0
  );

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
      <div>
        <div className="text-sm text-gray-500 mb-2">
          <Link href="/client/projects" className="hover:text-blue-600">
            Projects
          </Link>
          {" > "}
          <span className="text-gray-900">{project.name}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
        {project.address && (
          <p className="text-sm text-gray-600 mt-1">{project.address}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={`/client/projects/${project.id}`}
          className="px-3 py-1 rounded-full bg-blue-600 text-white"
        >
          Overview
        </Link>
        <Link
          href={`/client/projects/${project.id}/estimates`}
          className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total estimates</p>
          <p className="text-2xl font-semibold text-gray-900">
            {canViewEstimates ? estimates.length : "—"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Approved / Total</p>
          <p className="text-2xl font-semibold text-gray-900">
            {canViewEstimates
              ? `${formatCurrency(approvedClient)} / ${formatCurrency(totalClient)}`
              : "—"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Photos</p>
          <p className="text-2xl font-semibold text-gray-900">{photos.length}</p>
        </div>
      </div>

      {canViewStages && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stages</h2>
          {stages.length === 0 ? (
            <p className="text-sm text-gray-600">No stages available.</p>
          ) : (
            <div className="space-y-3">
              {stages.map((stage) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{stage.name}</p>
                    {stage.description && (
                      <p className="text-xs text-gray-500">{stage.description}</p>
                    )}
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {stage.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
