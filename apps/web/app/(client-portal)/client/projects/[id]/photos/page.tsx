// BuildOS - Client Project Photos

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PhotoService, ProjectService } from "@buildos/services";
import { getClientContext, hasPermission } from "../../../lib/client-portal";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientProjectPhotosPage({ params }: PageProps) {
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
  const canViewPhotos = await hasPermission(user.id, context, "photos", "view");
  if (!canViewProjects || !canViewPhotos) {
    redirect("/client/unauthorized");
  }

  const projectService = new ProjectService(context);
  const project = await projectService.getProjectForClient(id, user.email);
  if (!project) {
    notFound();
  }

  const photoService = new PhotoService(context);
  const photos = await photoService.getPhotosByProjectId(project.id);

  const grouped = photos.reduce<Record<string, typeof photos>>((acc, photo) => {
    const key = photo.stage?.name || "General";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(photo);
    return acc;
  }, {});

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
        <span className="text-gray-900">Photos</span>
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
          className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Estimates
        </Link>
        <Link
          href={`/client/projects/${project.id}/photos`}
          className="px-3 py-1 rounded-full bg-blue-600 text-white"
        >
          Photos
        </Link>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          No photos available yet.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([stageName, items]) => (
            <div key={stageName} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {stageName} ({items.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((photo) => (
                  <div
                    key={photo.id}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.description || "Project photo"}
                      className="w-full h-48 object-cover"
                      loading="lazy"
                    />
                    {photo.description && (
                      <div className="p-3 text-sm text-gray-600">
                        {photo.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
