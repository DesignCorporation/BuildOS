// BuildOS - Work Catalog Service
// Business logic for Work Types (Work Catalog)

import {
  prisma,
  WorkTypeRepository,
  CreateWorkTypeInput,
  UpdateWorkTypeInput,
  WorkTypeWithTranslations,
} from "@buildos/database";
import { RepositoryContext, PaginationResult } from "@buildos/database";

export class WorkCatalogService {
  private workTypeRepo: WorkTypeRepository;

  constructor(context: RepositoryContext) {
    this.workTypeRepo = new WorkTypeRepository(prisma, context);
  }

  async getWorkTypes(params?: {
    page?: number;
    limit?: number;
    search?: string;
    includeInactive?: boolean;
  }): Promise<PaginationResult<WorkTypeWithTranslations>> {
    return this.workTypeRepo.findAll(params);
  }

  async getWorkTypeById(id: string): Promise<WorkTypeWithTranslations | null> {
    return this.workTypeRepo.findById(id);
  }

  async createWorkType(input: CreateWorkTypeInput): Promise<WorkTypeWithTranslations> {
    return this.workTypeRepo.create(input);
  }

  async updateWorkType(id: string, input: UpdateWorkTypeInput): Promise<WorkTypeWithTranslations> {
    return this.workTypeRepo.update(id, input);
  }
}
