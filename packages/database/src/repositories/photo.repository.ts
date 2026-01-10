// BuildOS - Photo Repository
// Handles database operations for project photos

import { Photo, Stage } from "../generated/client";
import { BaseRepository } from "./base.repository";

type PhotoWithStage = Photo & { stage: Stage | null };

export class PhotoRepository extends BaseRepository {
  /**
   * Find photos by project ID (tenant-isolated)
   */
  async findByProjectId(projectId: string): Promise<PhotoWithStage[]> {
    return this.prisma.photo.findMany({
      where: {
        ...this.createBaseFilter(),
        projectId,
      },
      include: {
        stage: true,
      },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Create a photo record (tenant-isolated)
   */
  async create(input: {
    projectId: string;
    stageId?: string | null;
    filename: string;
    url: string;
    thumbnailUrl?: string | null;
    description?: string | null;
    capturedAt?: Date | null;
    uploadedBy?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
  }): Promise<Photo> {
    return this.prisma.photo.create({
      data: {
        tenantId: this.getTenantId(),
        projectId: input.projectId,
        stageId: input.stageId ?? null,
        filename: input.filename,
        url: input.url,
        thumbnailUrl: input.thumbnailUrl ?? null,
        description: input.description ?? null,
        capturedAt: input.capturedAt ?? new Date(),
        uploadedBy: input.uploadedBy ?? this.getUserId(),
        fileSize: input.fileSize ?? null,
        mimeType: input.mimeType ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
      },
    });
  }
}
