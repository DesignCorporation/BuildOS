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

  /**
   * Create a photo record (URL-based)
   */
  async createPhoto(input: {
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
  }) {
    return this.photoRepo.create(input);
  }
}
