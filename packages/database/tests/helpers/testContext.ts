// BuildOS - Test Context Helper
// Creates test context with tenant, user, and permissions

import { prisma } from "../../src/index";
import { Tenant, User, Role } from "../../src/generated/client";
import { RepositoryContext } from "../../src/repositories/types";

export interface TestContext extends RepositoryContext {
  tenant: Tenant;
  user: User;
  ownerRole?: Role;
  pmRole?: Role;
  clientRole?: Role;
}

/**
 * Creates a complete test context with tenant, user, and roles
 */
export async function createTestContext(options?: {
  userRole?: "owner" | "project_manager" | "client";
}): Promise<TestContext> {
  const { userRole = "owner" } = options || {};

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Test Company",
      slug: `test-company-${Date.now()}`,
      isActive: true,
    },
  });

  // Create permissions
  const viewPermission = await prisma.permission.create({
    data: {
      tenantId: tenant.id,
      resource: "estimates",
      action: "view",
      description: "View estimates",
      isGlobal: true,
    },
  });

  const viewCostPermission = await prisma.permission.create({
    data: {
      tenantId: tenant.id,
      resource: "estimates",
      action: "view_cost",
      description: "View cost breakdown",
      isGlobal: true,
    },
  });

  const createPermission = await prisma.permission.create({
    data: {
      tenantId: tenant.id,
      resource: "estimates",
      action: "create",
      description: "Create estimates",
      isGlobal: true,
    },
  });

  // Create roles
  const ownerRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "owner",
      description: "Owner - full access",
      isSystem: true,
    },
  });

  const pmRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "project_manager",
      description: "PM - can view costs",
      isSystem: true,
    },
  });

  const clientRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "client",
      description: "Client - NO cost visibility",
      isSystem: true,
    },
  });

  // Assign permissions to roles
  // Owner: all permissions
  await Promise.all([
    prisma.rolePermission.create({
      data: { roleId: ownerRole.id, permissionId: viewPermission.id },
    }),
    prisma.rolePermission.create({
      data: { roleId: ownerRole.id, permissionId: viewCostPermission.id },
    }),
    prisma.rolePermission.create({
      data: { roleId: ownerRole.id, permissionId: createPermission.id },
    }),
  ]);

  // PM: view and view_cost
  await Promise.all([
    prisma.rolePermission.create({
      data: { roleId: pmRole.id, permissionId: viewPermission.id },
    }),
    prisma.rolePermission.create({
      data: { roleId: pmRole.id, permissionId: viewCostPermission.id },
    }),
    prisma.rolePermission.create({
      data: { roleId: pmRole.id, permissionId: createPermission.id },
    }),
  ]);

  // Client: only view (NO view_cost)
  await prisma.rolePermission.create({
    data: { roleId: clientRole.id, permissionId: viewPermission.id },
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  // Assign role to user
  const roleToAssign =
    userRole === "owner" ? ownerRole : userRole === "project_manager" ? pmRole : clientRole;

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: roleToAssign.id,
    },
  });

  return {
    tenantId: tenant.id,
    userId: user.id,
    tenant,
    user,
    ownerRole,
    pmRole,
    clientRole,
  };
}

/**
 * Creates a minimal test context (just tenant and user, no roles)
 */
export async function createMinimalContext(): Promise<RepositoryContext> {
  const tenant = await prisma.tenant.create({
    data: {
      name: "Minimal Test",
      slug: `minimal-${Date.now()}`,
      isActive: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: `minimal-${Date.now()}@example.com`,
      name: "Minimal User",
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
  });

  return {
    tenantId: tenant.id,
    userId: user.id,
  };
}
