// BuildOS - Projects List Page
// Shows all projects for current tenant

import { getProjectsAction } from "@/app/actions/projects";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status;
  const page = params.page ? parseInt(params.page) : 1;

  // Fetch projects
  const result = await getProjectsAction({
    status,
    page,
    limit: 20,
  });

  if (!result.success) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error loading projects: {result.error}
        </div>
      </div>
    );
  }

  const projects = result.data || [];
  const pagination = result.pagination;

  // Status filter options
  const statuses = [
    { value: undefined, label: "All Projects" },
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "archived", label: "Archived" },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      archived: "bg-yellow-100 text-yellow-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: "Draft",
      active: "Active",
      completed: "Completed",
      archived: "Archived",
    };
    return labels[status] || status;
  };

  const formatDate = (value?: string | Date | null) => {
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

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-gray-500">Projects</p>
          <h1 className="text-3xl font-semibold text-gray-900 mt-2">Projects</h1>
          <p className="text-sm text-gray-600 mt-2">
            {pagination ? `${pagination.total} projects total` : "Loading..."}
          </p>
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => {
          const isActive = status === s.value;
          return (
            <Link
              key={s.label}
              href={`/projects${s.value ? `?status=${s.value}` : ""}`}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-24 h-24 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first project
          </p>
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-6 py-3 text-left font-medium">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left font-medium">
                  Client
                </th>
                <th className="px-6 py-3 text-left font-medium">
                  Address
                </th>
                <th className="px-6 py-3 text-left font-medium">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-medium">
                  Created
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project: any) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-gray-900 hover:text-blue-600 font-medium"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td
                    className="px-6 py-4 text-gray-600 max-w-[200px] truncate"
                    title={project.clientName || "-"}
                  >
                    {project.clientName || "-"}
                  </td>
                  <td
                    className="px-6 py-4 text-gray-600 max-w-[280px] truncate"
                    title={project.address || "-"}
                  >
                    {project.address || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                        project.status
                      )}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatDate(project.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (p) => (
              <Link
                key={p}
                href={`/projects?page=${p}${status ? `&status=${status}` : ""}`}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  p === pagination.page
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </Link>
            )
          )}
        </div>
      )}
    </div>
  );
}
