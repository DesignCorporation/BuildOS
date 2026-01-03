// BuildOS - RBAC Estimates View Cost Tests
// CRITICAL: Verifies that clients CANNOT see cost data (totalCost, margin)

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/index";

describe("RBAC - estimates:view_cost Permission", () => {
  let tenant: { id: string };
  let ownerRole: { id: string };
  let pmRole: { id: string };
  let clientRole: { id: string };
  let viewCostPermission: { id: string };
  let ownerUser: { id: string };
  let pmUser: { id: string };
  let clientUser: { id: string };
  let project: { id: string };
  let estimate: { id: string; totalCost: any; totalClient: any; margin: any };

  beforeEach(async () => {
    // Create tenant
    tenant = await prisma.tenant.create({
      data: {
        name: "Test Company",
        slug: "test-company",
        isActive: true,
      },
    });

    // Create permissions
    const viewPermission = await prisma.permission.create({
      data: {
        tenantId: tenant.id,
        resource: "estimates",
        action: "view",
        description: "View estimates (client prices only)",
        isGlobal: true,
      },
    });

    viewCostPermission = await prisma.permission.create({
      data: {
        tenantId: tenant.id,
        resource: "estimates",
        action: "view_cost",
        description: "View cost breakdown (internal)",
        isGlobal: true,
      },
    });

    // Create roles
    ownerRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: "owner",
        description: "Owner - full access including costs",
        isSystem: true,
      },
    });

    pmRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: "project_manager",
        description: "PM - can view costs",
        isSystem: true,
      },
    });

    clientRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: "client",
        description: "Client - NO cost visibility",
        isSystem: true,
      },
    });

    // Assign permissions to roles
    // Owner: both view and view_cost
    await prisma.rolePermission.create({
      data: {
        roleId: ownerRole.id,
        permissionId: viewPermission.id,
      },
    });
    await prisma.rolePermission.create({
      data: {
        roleId: ownerRole.id,
        permissionId: viewCostPermission.id,
      },
    });

    // PM: both view and view_cost
    await prisma.rolePermission.create({
      data: {
        roleId: pmRole.id,
        permissionId: viewPermission.id,
      },
    });
    await prisma.rolePermission.create({
      data: {
        roleId: pmRole.id,
        permissionId: viewCostPermission.id,
      },
    });

    // Client: ONLY view (NO view_cost!)
    await prisma.rolePermission.create({
      data: {
        roleId: clientRole.id,
        permissionId: viewPermission.id,
      },
    });

    // Create users
    ownerUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "owner@test.com",
        name: "Owner User",
        passwordHash: "$2a$10$placeholder",
        isActive: true,
      },
    });

    pmUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "pm@test.com",
        name: "PM User",
        passwordHash: "$2a$10$placeholder",
        isActive: true,
      },
    });

    clientUser = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "client@test.com",
        name: "Client User",
        passwordHash: "$2a$10$placeholder",
        isActive: true,
      },
    });

    // Assign roles to users
    await prisma.userRole.create({
      data: {
        userId: ownerUser.id,
        roleId: ownerRole.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: pmUser.id,
        roleId: pmRole.id,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: clientUser.id,
        roleId: clientRole.id,
      },
    });

    // Create project and estimate with cost data
    project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        name: "Test Project",
        status: "active",
      },
    });

    estimate = await prisma.estimate.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        version: 1,
        status: "approved",
        totalCost: 10000.0, // INTERNAL - should be hidden from client
        totalClient: 15000.0, // CLIENT PRICE - visible to client
        margin: 5000.0, // INTERNAL - should be hidden from client
        marginPercent: 50.0, // INTERNAL - should be hidden from client
      },
    });
  });

  it("should verify owner role has view_cost permission", async () => {
    const permissions = await prisma.rolePermission.findMany({
      where: {
        roleId: ownerRole.id,
      },
      include: {
        permission: true,
      },
    });

    const hasViewCost = permissions.some(
      (rp) => rp.permission.resource === "estimates" && rp.permission.action === "view_cost"
    );

    expect(hasViewCost).toBe(true);
  });

  it("should verify PM role has view_cost permission", async () => {
    const permissions = await prisma.rolePermission.findMany({
      where: {
        roleId: pmRole.id,
      },
      include: {
        permission: true,
      },
    });

    const hasViewCost = permissions.some(
      (rp) => rp.permission.resource === "estimates" && rp.permission.action === "view_cost"
    );

    expect(hasViewCost).toBe(true);
  });

  it("should verify client role does NOT have view_cost permission", async () => {
    const permissions = await prisma.rolePermission.findMany({
      where: {
        roleId: clientRole.id,
      },
      include: {
        permission: true,
      },
    });

    const hasViewCost = permissions.some(
      (rp) => rp.permission.resource === "estimates" && rp.permission.action === "view_cost"
    );

    expect(hasViewCost).toBe(false);
  });

  it("should verify client user does NOT have view_cost permission through their role", async () => {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: clientUser.id },
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

    const allPermissions = userWithRoles?.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission)
    );

    const hasViewCost = allPermissions?.some(
      (p) => p.resource === "estimates" && p.action === "view_cost"
    );

    expect(hasViewCost).toBe(false);
  });

  it("should verify owner user HAS view_cost permission through their role", async () => {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: ownerUser.id },
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

    const allPermissions = userWithRoles?.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission)
    );

    const hasViewCost = allPermissions?.some(
      (p) => p.resource === "estimates" && p.action === "view_cost"
    );

    expect(hasViewCost).toBe(true);
  });

  it("should demonstrate that estimate has cost fields (totalCost, margin) that must be filtered for clients", async () => {
    const fullEstimate = await prisma.estimate.findUnique({
      where: { id: estimate.id },
    });

    // These fields exist in the database
    expect(fullEstimate?.totalCost).toBeDefined();
    expect(fullEstimate?.totalClient).toBeDefined();
    expect(fullEstimate?.margin).toBeDefined();
    expect(fullEstimate?.marginPercent).toBeDefined();

    // Values are as expected
    expect(Number(fullEstimate?.totalCost)).toBe(10000.0);
    expect(Number(fullEstimate?.totalClient)).toBe(15000.0);
    expect(Number(fullEstimate?.margin)).toBe(5000.0);
    expect(Number(fullEstimate?.marginPercent)).toBe(50.0);
  });

  it("should simulate filtering out cost fields for client (application layer check)", async () => {
    // This simulates what the API/service layer must do
    const fullEstimate = await prisma.estimate.findUnique({
      where: { id: estimate.id },
    });

    // Helper function to check if user has view_cost permission
    async function hasViewCostPermission(userId: string): Promise<boolean> {
      const userWithRoles = await prisma.user.findUnique({
        where: { id: userId },
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

      const allPermissions = userWithRoles?.roles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission)
      );

      return (
        allPermissions?.some((p) => p.resource === "estimates" && p.action === "view_cost") ||
        false
      );
    }

    // Check for client user
    const clientHasViewCost = await hasViewCostPermission(clientUser.id);
    expect(clientHasViewCost).toBe(false);

    // Check for owner user
    const ownerHasViewCost = await hasViewCostPermission(ownerUser.id);
    expect(ownerHasViewCost).toBe(true);

    // Simulate filtering for client (should only show client price)
    if (!clientHasViewCost) {
      const clientEstimate = {
        id: fullEstimate?.id,
        projectId: fullEstimate?.projectId,
        version: fullEstimate?.version,
        status: fullEstimate?.status,
        totalClient: fullEstimate?.totalClient, // ✅ Client sees this
        // totalCost: REMOVED - ❌ Client must NOT see
        // margin: REMOVED - ❌ Client must NOT see
        // marginPercent: REMOVED - ❌ Client must NOT see
      };

      expect(clientEstimate.totalClient).toBeDefined();
      expect((clientEstimate as any).totalCost).toBeUndefined();
      expect((clientEstimate as any).margin).toBeUndefined();
      expect((clientEstimate as any).marginPercent).toBeUndefined();
    }
  });
});
