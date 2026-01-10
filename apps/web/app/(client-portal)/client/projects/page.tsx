// BuildOS - Client Projects List

import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectService } from "@buildos/services";
import { hasPermission, requireClientContext } from "../lib/client-portal";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  const { context, user } = await requireClientContext();

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
  const projectsResult = await projectService.getProjectsForClient(user.email, {
    page: 1,
    limit: 100,
  });
  const projects = projectsResult.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Your projects</h1>
          <p className="text-sm text-gray-600">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          No projects available for your account.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
              className="bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-transparent hover:border-blue-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {project.name}
                  </h2>
                  {project.address && (
                    <p className="text-sm text-gray-600 mt-1">{project.address}</p>
                  )}
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                  {project.status}
                </span>
              </div>
              {project.clientName && (
                <p className="text-sm text-gray-500 mt-4">
                  Client: {project.clientName}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
