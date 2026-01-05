// BuildOS - Project Repository Tests
// Verifies tenant isolation and archive functionality

import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../src/index";

describe("ProjectRepository - Tenant Isolation & Archive", () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let projectA1: { id: string; name: string; tenantId: string };
  let projectA2: { id: string; name: string; tenantId: string };
  let projectB: { id: string; name: string; tenantId: string };

  beforeEach(async () => {
    // Create two separate tenants
    tenantA = await prisma.tenant.create({
      data: {
        name: "Tenant A",
        slug: "tenant-a-" + Date.now(),
        isActive: true,
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: "Tenant B",
        slug: "tenant-b-" + Date.now(),
        isActive: true,
      },
    });

    // Create projects for tenant A
    projectA1 = await prisma.project.create({
      data: {
        tenantId: tenantA.id,
        name: "Active Project A1",
        status: "active",
      },
    });

    projectA2 = await prisma.project.create({
      data: {
        tenantId: tenantA.id,
        name: "Archived Project A2",
        status: "active",
        deletedAt: new Date(),
      },
    });

    // Create project for tenant B
    projectB = await prisma.project.create({
      data: {
        tenantId: tenantB.id,
        name: "Active Project B",
        status: "active",
      },
    });
  });

  describe("Tenant Isolation", () => {
    it("should only return active projects for tenant A", async () => {
      const projects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          deletedAt: null,
        },
      });

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(projectA1.id);
    });

    it("should NOT return tenant B project when querying tenant A", async () => {
      const projects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          deletedAt: null,
        },
      });

      const hasTenantBProject = projects.some((p) => p.id === projectB.id);
      expect(hasTenantBProject).toBe(false);
    });

    it("should NOT allow accessing tenant B project with tenant A context", async () => {
      const project = await prisma.project.findFirst({
        where: {
          id: projectB.id,
          tenantId: tenantA.id,
        },
      });

      expect(project).toBeNull();
    });
  });

  describe("Archive Filter", () => {
    it("should return only non-archived projects by default", async () => {
      const projects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          deletedAt: null,
        },
      });

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(projectA1.id);
      expect(projects[0].name).toBe("Active Project A1");
    });

    it("should return archived projects when explicitly queried", async () => {
      const archivedProjects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          NOT: {
            deletedAt: null,
          },
        },
      });

      expect(archivedProjects).toHaveLength(1);
      expect(archivedProjects[0].id).toBe(projectA2.id);
      expect(archivedProjects[0].name).toBe("Archived Project A2");
    });

    it("should return both archived and non-archived when no filter applied", async () => {
      const allProjects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
        },
      });

      expect(allProjects).toHaveLength(2);
      const ids = allProjects.map((p) => p.id);
      expect(ids).toContain(projectA1.id);
      expect(ids).toContain(projectA2.id);
    });
  });

  describe("Archive Operations", () => {
    it("should archive a project by setting deletedAt", async () => {
      const result = await prisma.project.update({
        where: { id: projectA1.id },
        data: {
          deletedAt: new Date(),
        },
      });

      expect(result.deletedAt).not.toBeNull();

      const archived = await prisma.project.findUnique({
        where: { id: projectA1.id },
      });
      expect(archived?.deletedAt).not.toBeNull();
    });

    it("should restore an archived project by clearing deletedAt", async () => {
      const result = await prisma.project.update({
        where: { id: projectA2.id },
        data: {
          deletedAt: null,
        },
      });

      expect(result.deletedAt).toBeNull();

      const restored = await prisma.project.findUnique({
        where: { id: projectA2.id },
      });
      expect(restored?.deletedAt).toBeNull();
    });

    it("should exclude archived projects from active list after archiving", async () => {
      // Archive the project
      await prisma.project.update({
        where: { id: projectA1.id },
        data: { deletedAt: new Date() },
      });

      // Query active projects
      const activeProjects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          deletedAt: null,
        },
      });

      expect(activeProjects).toHaveLength(0);
    });

    it("should include archived projects in active list after restoring", async () => {
      // Restore the project
      await prisma.project.update({
        where: { id: projectA2.id },
        data: { deletedAt: null },
      });

      // Query active projects
      const activeProjects = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          deletedAt: null,
        },
      });

      expect(activeProjects).toHaveLength(2);
      const ids = activeProjects.map((p) => p.id);
      expect(ids).toContain(projectA1.id);
      expect(ids).toContain(projectA2.id);
    });
  });

  describe("Tenant Isolation with Archive", () => {
    it("should isolate archived projects between tenants", async () => {
      // Archive tenant B project
      await prisma.project.update({
        where: { id: projectB.id },
        data: { deletedAt: new Date() },
      });

      // Query archived projects for tenant A
      const archivedA = await prisma.project.findMany({
        where: {
          tenantId: tenantA.id,
          NOT: { deletedAt: null },
        },
      });

      // Should only see tenant A's archived project
      expect(archivedA).toHaveLength(1);
      expect(archivedA[0].id).toBe(projectA2.id);
    });

    it("should NOT allow access to archived tenant B project with tenant A context", async () => {
      const project = await prisma.project.findFirst({
        where: {
          id: projectB.id,
          tenantId: tenantA.id,
          NOT: { deletedAt: null },
        },
      });

      expect(project).toBeNull();
    });
  });
});
