// BuildOS - User Repository
// Handles all database operations for Users and RBAC

import { User, Role, Permission } from "../generated/client";
import { BaseRepository } from "./base.repository";
import { PaginationParams, PaginationResult } from "./types";

export interface CreateUserInput {
  email: string;
  name?: string;
  passwordHash?: string;
  emailVerified?: Date;
  image?: string;
  isActive?: boolean;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  passwordHash?: string;
  emailVerified?: Date;
  image?: string;
  isActive?: boolean;
}

export interface UserWithRoles extends User {
  roles: Array<{
    role: Role & {
      permissions: Array<{
        permission: Permission;
      }>;
    };
  }>;
}

export class UserRepository extends BaseRepository {
  /**
   * Find all users for current tenant
   */
  async findAll(params?: PaginationParams): Promise<PaginationResult<User>> {
    const { page = 1, limit = 10 } = params || {};
    const skip = (page - 1) * limit;

    const where = this.createTenantFilter();

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
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
   * Find user by ID (tenant-isolated)
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        ...this.createTenantFilter(),
      },
    });
  }

  /**
   * Find user by email (tenant-isolated)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email,
        ...this.createTenantFilter(),
      },
    });
  }

  /**
   * Find user with their roles and permissions
   * CRITICAL for RBAC checks
   */
  async findByIdWithPermissions(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        ...this.createTenantFilter(),
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Check if user has a specific permission
   * CRITICAL for RBAC enforcement
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await this.findByIdWithPermissions(userId);
    if (!user) {
      return false;
    }

    // Flatten all permissions from all roles
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission)
    );

    // Check if user has the specific permission
    return permissions.some((p) => p.resource === resource && p.action === action);
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.findByIdWithPermissions(userId);
    if (!user) {
      return [];
    }

    // Flatten and deduplicate permissions
    const permissionsMap = new Map<string, Permission>();
    user.roles.forEach((ur) => {
      ur.role.permissions.forEach((rp) => {
        const key = `${rp.permission.resource}:${rp.permission.action}`;
        if (!permissionsMap.has(key)) {
          permissionsMap.set(key, rp.permission);
        }
      });
    });

    return Array.from(permissionsMap.values());
  }

  /**
   * Create new user
   */
  async create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...input,
        tenantId: this.getTenantId(),
      },
    });
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    // Ensure user belongs to tenant
    await this.ensureExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete user (hard delete - users don't have soft delete)
   */
  async delete(id: string): Promise<User> {
    // Ensure user belongs to tenant
    await this.ensureExists(id);

    return this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    // Ensure user belongs to tenant
    await this.ensureExists(userId);

    // Ensure role belongs to tenant
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: this.getTenantId(),
      },
    });

    if (!role) {
      throw new Error("Role not found or access denied");
    }

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, roleId: string): Promise<void> {
    // Ensure user belongs to tenant
    await this.ensureExists(userId);

    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
      },
    });

    if (!userRole) {
      throw new Error("User role assignment not found");
    }

    await this.prisma.userRole.delete({
      where: {
        id: userRole.id,
      },
    });
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...this.createTenantFilter(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    return user.roles.map((ur) => ur.role);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<User> {
    await this.ensureExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Find active users only
   */
  async findActive(params?: PaginationParams): Promise<PaginationResult<User>> {
    const { page = 1, limit = 10 } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createTenantFilter(),
      isActive: true,
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
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
   * Helper: Ensure user exists and belongs to tenant
   */
  private async ensureExists(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error("User not found or access denied");
    }
  }
}
