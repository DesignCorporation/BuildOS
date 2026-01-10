// BuildOS - Stage Service
// Business logic for project stages

import { StageRepository, Stage, prisma } from "@buildos/database";
import { RepositoryContext } from "@buildos/database";

export class StageService {
  private stageRepo: StageRepository;

  constructor(context: RepositoryContext) {
    this.stageRepo = new StageRepository(prisma, context);
  }

  /**
   * Get stages for a project
   */
  async getStagesByProjectId(projectId: string): Promise<Stage[]> {
    return this.stageRepo.findByProjectId(projectId);
  }
}
