// BuildOS - Estimate Repository
// Handles all database operations for Estimates
// CRITICAL: Manages versioning and cost visibility (RBAC)

import { Estimate, EstimateItem, Prisma } from "../generated/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { BaseRepository } from "./base.repository";
import { PaginationParams, PaginationResult, SoftDeleteFilter } from "./types";

export interface CreateEstimateInput {
  projectId: string;
  version?: number;
  status?: string;
  validUntil?: Date;
  totalCost: number | Decimal;
  totalClient: number | Decimal;
  margin: number | Decimal;
  marginPercent: number | Decimal;
  notes?: string;
  tags?: string[];
}

export interface UpdateEstimateInput {
  status?: string;
  validUntil?: Date;
  totalCost?: number | Decimal;
  totalClient?: number | Decimal;
  margin?: number | Decimal;
  marginPercent?: number | Decimal;
  notes?: string;
  tags?: string[];
}

export interface CreateEstimateItemInput {
  type: string; // "work", "material", "subcontractor"
  name: string;
  description?: string | null;
  unit: string;
  quantity: number | Decimal;
  unitCost: number | Decimal;
  totalCost: number | Decimal;
  unitClient: number | Decimal;
  totalClient: number | Decimal;
  margin: number | Decimal;
  marginPercent: number | Decimal;
  materialCatalogId?: string | null;
  workTypeId?: string | null;
  order?: number;
}

export interface EstimateWithItems extends Estimate {
  items: EstimateItem[];
}

export class EstimateRepository extends BaseRepository {
  /**
   * Find all estimates for current tenant
   */
  async findAll(
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Estimate>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = this.createBaseFilter(includeDeleted);

    const [data, total] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { version: "desc" }],
      }),
      this.prisma.estimate.count({ where }),
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
   * Find estimate by ID (tenant-isolated)
   * @param includeItems - Include estimate items
   */
  async findById(
    id: string,
    includeDeleted = false,
    includeItems = false
  ): Promise<EstimateWithItems | Estimate | null> {
    return this.prisma.estimate.findFirst({
      where: {
        id,
        ...this.createBaseFilter(includeDeleted),
      },
      include: includeItems
        ? {
            items: {
              orderBy: { order: "asc" },
            },
          }
        : undefined,
    });
  }

  /**
   * Find estimates by project ID
   */
  async findByProjectId(
    projectId: string,
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Estimate>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createBaseFilter(includeDeleted),
      projectId,
    };

    const [data, total] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ version: "desc" }],
      }),
      this.prisma.estimate.count({ where }),
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
   * Get latest version number for a project
   */
  async getLatestVersion(projectId: string): Promise<number> {
    const latest = await this.prisma.estimate.findFirst({
      where: {
        projectId,
        tenantId: this.getTenantId(),
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    return latest?.version || 0;
  }

  /**
   * Create new estimate with automatic versioning
   */
  async create(input: CreateEstimateInput): Promise<Estimate> {
    // Get next version number if not provided
    const version = input.version || (await this.getLatestVersion(input.projectId)) + 1;

    return this.prisma.estimate.create({
      data: {
        ...input,
        version,
        tenantId: this.getTenantId(),
      },
    });
  }

  /**
   * Create estimate with items in a transaction
   */
  async createWithItems(
    estimateInput: CreateEstimateInput,
    items: CreateEstimateItemInput[]
  ): Promise<EstimateWithItems> {
    return this.prisma.$transaction(async (tx) => {
      // Get next version
      const version =
        estimateInput.version || (await this.getLatestVersion(estimateInput.projectId)) + 1;

      // Create estimate
      const estimate = await tx.estimate.create({
        data: {
          ...estimateInput,
          version,
          tenantId: this.getTenantId(),
        },
      });

      // Create items
      const createdItems = await Promise.all(
        items.map((item, index) =>
          tx.estimateItem.create({
            data: {
              ...item,
              estimateId: estimate.id,
              tenantId: this.getTenantId(),
              order: item.order ?? index,
            },
          })
        )
      );

      return {
        ...estimate,
        items: createdItems,
      };
    });
  }

  /**
   * Update estimate (recalculates totals if needed)
   */
  async update(id: string, input: UpdateEstimateInput): Promise<Estimate> {
    // Ensure estimate belongs to tenant
    await this.ensureExists(id);

    return this.prisma.estimate.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Add item to estimate
   */
  async addItem(estimateId: string, item: CreateEstimateItemInput): Promise<EstimateItem> {
    // Ensure estimate belongs to tenant
    await this.ensureExists(estimateId);

    return this.prisma.estimateItem.create({
      data: {
        ...item,
        estimateId,
        tenantId: this.getTenantId(),
      },
    });
  }

  /**
   * Update estimate item
   */
  async updateItem(itemId: string, input: Partial<CreateEstimateItemInput>): Promise<EstimateItem> {
    // Ensure item belongs to tenant
    const item = await this.prisma.estimateItem.findFirst({
      where: {
        id: itemId,
        tenantId: this.getTenantId(),
      },
    });

    if (!item) {
      throw new Error("Estimate item not found or access denied");
    }

    return this.prisma.estimateItem.update({
      where: { id: itemId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete estimate item
   */
  async deleteItem(itemId: string): Promise<EstimateItem> {
    // Ensure item belongs to tenant
    const item = await this.prisma.estimateItem.findFirst({
      where: {
        id: itemId,
        tenantId: this.getTenantId(),
      },
    });

    if (!item) {
      throw new Error("Estimate item not found or access denied");
    }

    return this.prisma.estimateItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Soft delete estimate
   */
  async softDelete(id: string): Promise<Estimate> {
    // Ensure estimate belongs to tenant
    await this.ensureExists(id);

    return this.prisma.estimate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Update estimate status (draft → sent → approved/rejected)
   */
  async updateStatus(
    id: string,
    status: "draft" | "sent" | "approved" | "rejected"
  ): Promise<Estimate> {
    // Ensure estimate belongs to tenant
    await this.ensureExists(id);

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Set timestamps based on status
    if (status === "sent") {
      updateData.sentAt = new Date();
    } else if (status === "approved") {
      updateData.approvedAt = new Date();
    }

    return this.prisma.estimate.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Find estimates by status
   */
  async findByStatus(
    status: string,
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Estimate>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createBaseFilter(includeDeleted),
      status,
    };

    const [data, total] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
      }),
      this.prisma.estimate.count({ where }),
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
   * RBAC-aware: Filter estimate to hide cost fields for clients
   * This should be called from service layer based on user permissions
   */
  filterCostFields(estimate: Estimate, canViewCost: boolean): Partial<Estimate> {
    if (canViewCost) {
      return estimate;
    }

    // Client view: remove cost fields
    const {
      totalCost,
      margin,
      marginPercent,
      ...clientView
    } = estimate as any;

    return clientView;
  }

  /**
   * Helper: Ensure estimate exists and belongs to tenant
   */
  private async ensureExists(id: string): Promise<void> {
    const estimate = await this.findById(id);
    if (!estimate) {
      throw new Error("Estimate not found or access denied");
    }
  }
}
