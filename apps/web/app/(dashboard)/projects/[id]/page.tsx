// BuildOS - Project View Page
// Shows project details with tabs (Details, Estimates, Stages)

import { getProjectByIdAction } from "@/app/actions/projects";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ProjectTabs } from "./project-tabs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch project
  const result = await getProjectByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const project = result.data;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      archived: "bg-yellow-100 text-yellow-800",
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
        <span className="text-gray-900">{project.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              {project.address && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {project.address}
                </div>
              )}
              {project.clientName && (
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  {project.clientName}
                </div>
              )}
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(
              project.status
            )}`}
          >
            {project.status}
          </span>
        </div>

        {/* Contact Info */}
        {(project.clientEmail || project.clientPhone) && (
          <div className="flex gap-6 text-sm mt-4 pt-4 border-t">
            {project.clientEmail && (
              <div>
                <span className="text-gray-600">Email:</span>{" "}
                <a
                  href={`mailto:${project.clientEmail}`}
                  className="text-blue-600 hover:underline"
                >
                  {project.clientEmail}
                </a>
              </div>
            )}
            {project.clientPhone && (
              <div>
                <span className="text-gray-600">Phone:</span>{" "}
                <a
                  href={`tel:${project.clientPhone}`}
                  className="text-blue-600 hover:underline"
                >
                  {project.clientPhone}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <ProjectTabs projectId={project.id} project={project} />
    </div>
  );
}
