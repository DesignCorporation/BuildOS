// BuildOS - Invoice Service Integration Tests
// Tests for invoice creation, retrieval, status updates, and tenant isolation

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InvoiceService } from "../src/invoice.service";
import { prisma } from "@buildos/database";

describe("InvoiceService - Integration Tests", () => {
  let service: InvoiceService;
  let tenantId: string;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Company",
        slug: `test-${Date.now()}-${Math.random()}`,
        isActive: true,
      },
    });
    tenantId = tenant.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        passwordHash: "$2a$10$placeholder",
        isActive: true,
      },
    });
    userId = user.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        tenantId,
        name: "Test Project",
        status: "active",
      },
    });
    projectId = project.id;

    // Initialize service
    service = new InvoiceService({ tenantId, userId });
  });

  afterEach(async () => {
    // Cleanup - delete in correct order respecting foreign keys
    await prisma.invoice.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  });

  describe("createInvoice", () => {
    it("should create invoice with valid data", async () => {
      const invoice = await service.createInvoice({
        projectId,
        number: "INV-001",
        status: "issued",
        issueDate: new Date(),
        dueDate: new Date("2026-02-01"),
        amount: 5000,
        currency: "PLN",
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.tenantId).toBe(tenantId);
      expect(invoice.projectId).toBe(projectId);
      expect(invoice.number).toBe("INV-001");
      expect(invoice.status).toBe("issued");
      expect(Number(invoice.amount)).toBe(5000);
    });

    it("should set default currency to PLN", async () => {
      const invoice = await service.createInvoice({
        projectId,
        number: "INV-002",
        issueDate: new Date(),
        amount: 1000,
      });

      expect(invoice.currency).toBe("PLN");
    });

    it("should set default status to issued", async () => {
      const invoice = await service.createInvoice({
        projectId,
        number: "INV-003",
        issueDate: new Date(),
        amount: 1000,
      });

      expect(invoice.status).toBe("issued");
    });

    it("should respect tenant isolation (invoice belongs to tenant)", async () => {
      const invoice = await service.createInvoice({
        projectId,
        number: "INV-004",
        issueDate: new Date(),
        amount: 1000,
      });

      const dbInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(dbInvoice?.tenantId).toBe(tenantId);
    });
  });

  describe("getInvoicesByProjectId", () => {
    beforeEach(async () => {
      // Create multiple invoices
      await prisma.invoice.createMany({
        data: [
          {
            tenantId,
            projectId,
            number: "INV-010",
            status: "issued",
            issueDate: new Date(),
            amount: 1000,
            currency: "PLN",
          },
          {
            tenantId,
            projectId,
            number: "INV-011",
            status: "paid",
            issueDate: new Date(),
            amount: 2000,
            currency: "PLN",
          },
        ],
      });
    });

    it("should return invoices for project", async () => {
      const result = await service.getInvoicesByProjectId(projectId);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("should NOT return invoices from another tenant", async () => {
      // Create another tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          name: "Another Company",
          slug: `test2-${Date.now()}-${Math.random()}`,
          isActive: true,
        },
      });

      const project2 = await prisma.project.create({
        data: {
          tenantId: tenant2.id,
          name: "Project 2",
          status: "active",
        },
      });

      // Create invoice in another tenant
      await prisma.invoice.create({
        data: {
          tenantId: tenant2.id,
          projectId: project2.id,
          number: "INV-999",
          status: "issued",
          issueDate: new Date(),
          amount: 9999,
          currency: "PLN",
        },
      });

      // Request invoices for project2 with context tenant1
      const result = await service.getInvoicesByProjectId(project2.id);

      // Should not see invoices from another tenant
      expect(result.data.length).toBe(0);

      // Cleanup
      await prisma.invoice.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.project.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });

    it("should filter out soft-deleted invoices", async () => {
      // Create and delete invoice
      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          projectId,
          number: "INV-013",
          status: "issued",
          issueDate: new Date(),
          amount: 4000,
          currency: "PLN",
        },
      });

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { deletedAt: new Date() },
      });

      const result = await service.getInvoicesByProjectId(projectId);

      // Should not include deleted invoice
      const deletedInvoice = result.data.find((inv) => inv.id === invoice.id);
      expect(deletedInvoice).toBeUndefined();
    });
  });

  describe("markPaid", () => {
    let invoiceId: string;

    beforeEach(async () => {
      const invoice = await prisma.invoice.create({
        data: {
          tenantId,
          projectId,
          number: "INV-020",
          status: "issued",
          issueDate: new Date(),
          amount: 5000,
          currency: "PLN",
        },
      });
      invoiceId = invoice.id;
    });

    it("should change status from issued to paid", async () => {
      const updated = await service.markPaid(invoiceId);

      expect(updated.status).toBe("paid");
    });

    it("should update updatedAt timestamp", async () => {
      const before = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await service.markPaid(invoiceId);

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        before!.updatedAt.getTime()
      );
    });

    it("should throw error if invoice not found", async () => {
      await expect(service.markPaid("non-existent-id")).rejects.toThrow();
    });

    it("should throw error if invoice belongs to another tenant", async () => {
      // Create invoice in another tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          name: "Another Company",
          slug: `test2-${Date.now()}-${Math.random()}`,
          isActive: true,
        },
      });

      const project2 = await prisma.project.create({
        data: {
          tenantId: tenant2.id,
          name: "Project 2",
          status: "active",
        },
      });

      const invoice2 = await prisma.invoice.create({
        data: {
          tenantId: tenant2.id,
          projectId: project2.id,
          number: "INV-999",
          status: "issued",
          issueDate: new Date(),
          amount: 9999,
          currency: "PLN",
        },
      });

      // Try to mark paid with context tenant1
      await expect(service.markPaid(invoice2.id)).rejects.toThrow();

      // Cleanup
      await prisma.invoice.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.project.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });
  });
});
