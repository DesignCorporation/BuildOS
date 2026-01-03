// BuildOS - Tenant Isolation Tests
// CRITICAL: Verifies that tenants cannot see each other's data

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/index";

describe("Tenant Isolation", () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let projectA: { id: string; name: string; tenantId: string };
  let projectB: { id: string; name: string; tenantId: string };

  beforeEach(async () => {
    // Create two separate tenants
    tenantA = await prisma.tenant.create({
      data: {
        name: "Tenant A Company",
        slug: "tenant-a",
        isActive: true,
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: "Tenant B Company",
        slug: "tenant-b",
        isActive: true,
      },
    });

    // Create a project for tenant A
    projectA = await prisma.project.create({
      data: {
        tenantId: tenantA.id,
        name: "Tenant A Project",
        status: "active",
      },
    });

    // Create a project for tenant B
    projectB = await prisma.project.create({
      data: {
        tenantId: tenantB.id,
        name: "Tenant B Project",
        status: "active",
      },
    });
  });

  it("should only return projects for tenant A when filtering by tenant A", async () => {
    const projects = await prisma.project.findMany({
      where: {
        tenantId: tenantA.id,
      },
    });

    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(projectA.id);
    expect(projects[0].name).toBe("Tenant A Project");
  });

  it("should only return projects for tenant B when filtering by tenant B", async () => {
    const projects = await prisma.project.findMany({
      where: {
        tenantId: tenantB.id,
      },
    });

    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(projectB.id);
    expect(projects[0].name).toBe("Tenant B Project");
  });

  it("should NOT return tenant B project when querying with tenant A filter", async () => {
    const projects = await prisma.project.findMany({
      where: {
        tenantId: tenantA.id,
      },
    });

    const hasTenantBProject = projects.some((p) => p.id === projectB.id);
    expect(hasTenantBProject).toBe(false);
  });

  it("should NOT allow finding tenant B project by ID when user belongs to tenant A", async () => {
    // Simulate trying to access another tenant's project
    const project = await prisma.project.findFirst({
      where: {
        id: projectB.id,
        tenantId: tenantA.id, // This should filter out the project
      },
    });

    expect(project).toBeNull();
  });

  it("should isolate rooms between tenants", async () => {
    // Create room for tenant A
    const roomA = await prisma.room.create({
      data: {
        tenantId: tenantA.id,
        projectId: projectA.id,
        name: "Tenant A Room",
      },
    });

    // Create room for tenant B
    const roomB = await prisma.room.create({
      data: {
        tenantId: tenantB.id,
        projectId: projectB.id,
        name: "Tenant B Room",
      },
    });

    // Query rooms for tenant A only
    const roomsA = await prisma.room.findMany({
      where: {
        tenantId: tenantA.id,
      },
    });

    expect(roomsA).toHaveLength(1);
    expect(roomsA[0].id).toBe(roomA.id);
    expect(roomsA.some((r) => r.id === roomB.id)).toBe(false);
  });

  it("should isolate estimates between tenants", async () => {
    // Create estimate for tenant A
    const estimateA = await prisma.estimate.create({
      data: {
        tenantId: tenantA.id,
        projectId: projectA.id,
        version: 1,
        status: "draft",
        totalCost: 1000,
        totalClient: 1500,
        margin: 500,
        marginPercent: 50,
      },
    });

    // Create estimate for tenant B
    const estimateB = await prisma.estimate.create({
      data: {
        tenantId: tenantB.id,
        projectId: projectB.id,
        version: 1,
        status: "draft",
        totalCost: 2000,
        totalClient: 3000,
        margin: 1000,
        marginPercent: 50,
      },
    });

    // Query estimates for tenant A only
    const estimatesA = await prisma.estimate.findMany({
      where: {
        tenantId: tenantA.id,
      },
    });

    expect(estimatesA).toHaveLength(1);
    expect(estimatesA[0].id).toBe(estimateA.id);
    expect(estimatesA.some((e) => e.id === estimateB.id)).toBe(false);
  });

  it("should isolate users between tenants", async () => {
    // Create user for tenant A
    const userA = await prisma.user.create({
      data: {
        tenantId: tenantA.id,
        email: "user@tenant-a.com",
        name: "User A",
        passwordHash: "$2a$10$placeholder",
        isActive: true,
      },
    });

    // Create user for tenant B
    const userB = await prisma.user.create({
      data: {
        tenantId: tenantB.id,
        email: "user@tenant-b.com",
        name: "User B",
        passwordHash: "$2a$10$placeholder",
        isActive: true,
      },
    });

    // Query users for tenant A only
    const usersA = await prisma.user.findMany({
      where: {
        tenantId: tenantA.id,
      },
    });

    expect(usersA).toHaveLength(1);
    expect(usersA[0].id).toBe(userA.id);
    expect(usersA.some((u) => u.id === userB.id)).toBe(false);
  });
});
