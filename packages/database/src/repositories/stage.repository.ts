// BuildOS - Stage Repository
// Handles database operations for project stages

import { Stage } from "../generated/client";
import { BaseRepository } from "./base.repository";

export class StageRepository extends BaseRepository {
  /**
   * Find stages by project ID (via room relation)
   */
  async findByProjectId(projectId: string): Promise<Stage[]> {
    return this.prisma.stage.findMany({
      where: {
        ...this.createBaseFilter(),
        room: {
          projectId,
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }
}
