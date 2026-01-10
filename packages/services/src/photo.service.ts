// BuildOS - Photo Service
// Business logic for project photos

import { PhotoRepository, prisma } from "@buildos/database";
import { RepositoryContext } from "@buildos/database";

export class PhotoService {
  private photoRepo: PhotoRepository;

  constructor(context: RepositoryContext) {
    this.photoRepo = new PhotoRepository(prisma, context);
  }

  /**
   * Get photos for a project
   */
  async getPhotosByProjectId(projectId: string) {
    return this.photoRepo.findByProjectId(projectId);
  }
}
