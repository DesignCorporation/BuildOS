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
}
