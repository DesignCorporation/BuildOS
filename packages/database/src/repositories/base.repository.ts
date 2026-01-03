// BuildOS - Base Repository
// Provides common functionality for all repositories

import { PrismaClient } from "../generated/client";
import { RepositoryContext } from "./types";

export abstract class BaseRepository {
  protected prisma: PrismaClient;
  protected context: RepositoryContext;

  constructor(prisma: PrismaClient, context: RepositoryContext) {
    this.prisma = prisma;
    this.context = context;
  }

  /**
   * Gets the tenant ID from context
   * All queries MUST be filtered by tenant ID for tenant isolation
   */
  protected getTenantId(): string {
    return this.context.tenantId;
  }

  /**
   * Gets the user ID from context
   * Used for audit logs and ownership checks
   */
  protected getUserId(): string {
    return this.context.userId;
  }

  /**
   * Creates base filter for tenant isolation
   * ALL queries must include this filter
   */
  protected createTenantFilter() {
    return {
      tenantId: this.getTenantId(),
    };
  }

  /**
   * Creates filter for soft delete
   * Only returns non-deleted records by default
   */
  protected createSoftDeleteFilter(includeDeleted = false) {
    if (includeDeleted) {
      return {};
    }
    return {
      deletedAt: null,
    };
  }

  /**
   * Combines tenant filter with soft delete filter
   */
  protected createBaseFilter(includeDeleted = false) {
    return {
      ...this.createTenantFilter(),
      ...this.createSoftDeleteFilter(includeDeleted),
    };
  }
}
