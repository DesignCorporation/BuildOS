// BuildOS - Repository Types
// Defines context and common types for repositories

export interface RepositoryContext {
  tenantId: string;
  userId: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SoftDeleteFilter {
  includeDeleted?: boolean;
}
