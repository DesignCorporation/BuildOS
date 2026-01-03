// BuildOS - Project Repository
// Handles all database operations for Projects

import { Project, Prisma } from "../generated/client";
import { BaseRepository } from "./base.repository";
import { PaginationParams, PaginationResult, SoftDeleteFilter } from "./types";

export interface CreateProjectInput {
  name: string;
  address?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  status?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  address?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  status?: string;
  notes?: string;
  tags?: string[];
}

export class ProjectRepository extends BaseRepository {
  /**
   * Find all projects for current tenant
   */
  async findAll(
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Project>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = this.createBaseFilter(includeDeleted);

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find project by ID (tenant-isolated)
   */
  async findById(id: string, includeDeleted = false): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: {
        id,
        ...this.createBaseFilter(includeDeleted),
      },
      include: {
        rooms: {
          where: this.createSoftDeleteFilter(includeDeleted),
        },
        estimates: {
          where: this.createSoftDeleteFilter(includeDeleted),
        },
      },
    });
  }

  /**
   * Create new project
   */
  async create(input: CreateProjectInput): Promise<Project> {
    return this.prisma.project.create({
      data: {
        ...input,
        tenantId: this.getTenantId(),
      },
    });
  }

  /**
   * Update project
   */
  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    // Ensure project belongs to tenant
    await this.ensureExists(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete project
   */
  async softDelete(id: string): Promise<Project> {
    // Ensure project belongs to tenant
    await this.ensureExists(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Hard delete project (rarely used)
   */
  async hardDelete(id: string): Promise<Project> {
    // Ensure project belongs to tenant
    await this.ensureExists(id);

    return this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Restore soft-deleted project
   */
  async restore(id: string): Promise<Project> {
    // Find including deleted
    const project = await this.findById(id, true);
    if (!project) {
      throw new Error("Project not found");
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });
  }

  /**
   * Find projects by status
   */
  async findByStatus(
    status: string,
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Project>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createBaseFilter(includeDeleted),
      status,
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search projects by name or client name
   */
  async search(
    query: string,
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Project>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createBaseFilter(includeDeleted),
      OR: [
        { name: { contains: query, mode: "insensitive" as Prisma.QueryMode } },
        { clientName: { contains: query, mode: "insensitive" as Prisma.QueryMode } },
        { address: { contains: query, mode: "insensitive" as Prisma.QueryMode } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Helper: Ensure project exists and belongs to tenant
   */
  private async ensureExists(id: string): Promise<void> {
    const project = await this.findById(id);
    if (!project) {
      throw new Error("Project not found or access denied");
    }
  }
}
