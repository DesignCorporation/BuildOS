// BuildOS - Invoice Repository Tests
// Tests for invoice database operations, isolation, and tenant boundaries

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { InvoiceRepository } from "../src/repositories/invoice.repository";
import { prisma } from "../src";

describe("InvoiceRepository", () => {
  let repo: InvoiceRepository;
  let tenantId: string;
  let projectId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: `test-${Date.now()}-${Math.random()}`,
        isActive: true,
      },
    });
    tenantId = tenant.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        tenantId,
        name: "Test Project",
        status: "active",
      },
    });
    projectId = project.id;

    // Initialize repository
    repo = new InvoiceRepository(prisma, {
      tenantId,
      userId: "test-user",
    });
  });

  afterEach(async () => {
    // Cleanup - delete in correct order
    await prisma.invoice.deleteMany({ where: { tenantId } });
    await prisma.project.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  });

  describe("createInvoice", () => {
    it("should create invoice with all fields", async () => {
      const invoice = await repo.createInvoice({
        projectId,
        number: "INV-001",
        status: "issued",
        issueDate: new Date(),
        dueDate: new Date("2026-02-01"),
        amount: 5000,
        currency: "EUR",
        notes: "Test notes",
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.tenantId).toBe(tenantId);
      expect(invoice.number).toBe("INV-001");
      expect(invoice.currency).toBe("EUR");
      expect(invoice.notes).toBe("Test notes");
    });

    it("should set default currency to PLN", async () => {
      const invoice = await repo.createInvoice({
        projectId,
        number: "INV-002",
        issueDate: new Date(),
        amount: 1000,
      });

      expect(invoice.currency).toBe("PLN");
    });

    it("should set default status to issued", async () => {
      const invoice = await repo.createInvoice({
        projectId,
        number: "INV-003",
        issueDate: new Date(),
        amount: 1000,
      });

      expect(invoice.status).toBe("issued");
    });

    it("should enforce UNIQUE constraint on tenantId + number", async () => {
      await repo.createInvoice({
        projectId,
        number: "INV-DUP",
        issueDate: new Date(),
        amount: 1000,
      });

      // Attempt to create with same number
      await expect(
        repo.createInvoice({
          projectId,
          number: "INV-DUP",
          issueDate: new Date(),
          amount: 2000,
        })
      ).rejects.toThrow();
    });

    it("should allow same number in different tenants", async () => {
      // Create in tenant1
      await repo.createInvoice({
        projectId,
        number: "INV-100",
        issueDate: new Date(),
        amount: 1000,
      });

      // Create another tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          name: "Tenant 2",
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

      const repo2 = new InvoiceRepository(prisma, {
        tenantId: tenant2.id,
        userId: "test-user-2",
      });

      // Should create without error
      const invoice2 = await repo2.createInvoice({
        projectId: project2.id,
        number: "INV-100",
        issueDate: new Date(),
        amount: 2000,
      });

      expect(invoice2.number).toBe("INV-100");

      // Cleanup
      await prisma.invoice.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.project.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });
  });

  describe("findByProjectId", () => {
    beforeEach(async () => {
      // Create multiple invoices
      await repo.createInvoice({
        projectId,
        number: "INV-001",
        issueDate: new Date("2026-01-01"),
        amount: 1000,
      });
      await repo.createInvoice({
        projectId,
        number: "INV-002",
        issueDate: new Date("2026-01-02"),
        amount: 2000,
      });
      await repo.createInvoice({
        projectId,
        number: "INV-003",
        issueDate: new Date("2026-01-03"),
        amount: 3000,
      });
    });

    it("should return paginated results", async () => {
      const result = await repo.findByProjectId(projectId, {
        page: 1,
        limit: 2,
      });

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it("should order by issueDate DESC", async () => {
      const result = await repo.findByProjectId(projectId);

      expect(result.data[0].number).toBe("INV-003");
      expect(result.data[1].number).toBe("INV-002");
      expect(result.data[2].number).toBe("INV-001");
    });

    it("should filter out soft-deleted invoices by default", async () => {
      // Soft delete one invoice
      await prisma.invoice.updateMany({
        where: { number: "INV-002" },
        data: { deletedAt: new Date() },
      });

      const result = await repo.findByProjectId(projectId);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      const numbers = result.data.map((inv) => inv.number);
      expect(numbers).not.toContain("INV-002");
    });

    it("should include soft-deleted when includeDeleted=true", async () => {
      // Soft delete one invoice
      await prisma.invoice.updateMany({
        where: { number: "INV-002" },
        data: { deletedAt: new Date() },
      });

      const result = await repo.findByProjectId(projectId, {
        includeDeleted: true,
      });

      expect(result.data.length).toBe(3);
      expect(result.total).toBe(3);
    });

    it("should not return invoices from another project", async () => {
      const project2 = await prisma.project.create({
        data: {
          tenantId,
          name: "Project 2",
          status: "active",
        },
      });

      const result = await repo.findByProjectId(project2.id);

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe("markOverdue", () => {
    it("should mark issued invoices as overdue", async () => {
      await repo.createInvoice({
        projectId,
        number: "INV-OLD",
        status: "issued",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-05"),
        amount: 1000,
      });

      const now = new Date("2026-01-10");
      const result = await repo.markOverdue(now);

      expect(result.count).toBe(1);

      const invoice = await prisma.invoice.findFirst({
        where: { number: "INV-OLD" },
      });
      expect(invoice?.status).toBe("overdue");
    });

    it("should NOT mark paid invoices as overdue", async () => {
      await repo.createInvoice({
        projectId,
        number: "INV-PAID",
        status: "paid",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-05"),
        amount: 1000,
      });

      const now = new Date("2026-01-10");
      await repo.markOverdue(now);

      const invoice = await prisma.invoice.findFirst({
        where: { number: "INV-PAID" },
      });
      expect(invoice?.status).toBe("paid");
    });

    it("should NOT mark already overdue invoices", async () => {
      await repo.createInvoice({
        projectId,
        number: "INV-ALREADY",
        status: "overdue",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-05"),
        amount: 1000,
      });

      const now = new Date("2026-01-10");
      const result = await repo.markOverdue(now);

      expect(result.count).toBe(0);
    });

    it("should NOT mark invoices without dueDate", async () => {
      await repo.createInvoice({
        projectId,
        number: "INV-NO-DUE",
        status: "issued",
        issueDate: new Date("2026-01-01"),
        amount: 1000,
      });

      const now = new Date("2026-01-10");
      const result = await repo.markOverdue(now);

      expect(result.count).toBe(0);
    });

    it("should respect tenant isolation", async () => {
      // Create invoice in another tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          name: "Tenant 2",
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

      await prisma.invoice.create({
        data: {
          tenantId: tenant2.id,
          projectId: project2.id,
          number: "INV-OTHER-TENANT",
          status: "issued",
          issueDate: new Date("2026-01-01"),
          dueDate: new Date("2026-01-05"),
          amount: 9999,
          currency: "PLN",
        },
      });

      // Call markOverdue with context tenant1
      const now = new Date("2026-01-10");
      const result = await repo.markOverdue(now);

      // Should not update invoice from another tenant
      expect(result.count).toBe(0);

      const otherInvoice = await prisma.invoice.findFirst({
        where: { number: "INV-OTHER-TENANT" },
      });
      expect(otherInvoice?.status).toBe("issued");

      // Cleanup
      await prisma.invoice.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.project.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });

    it("should handle multiple invoices correctly", async () => {
      // Create 3 issued, 1 paid, 1 overdue
      await repo.createInvoice({
        projectId,
        number: "INV-1",
        status: "issued",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-05"),
        amount: 1000,
      });
      await repo.createInvoice({
        projectId,
        number: "INV-2",
        status: "issued",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-06"),
        amount: 2000,
      });
      await repo.createInvoice({
        projectId,
        number: "INV-3",
        status: "issued",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-07"),
        amount: 3000,
      });
      await repo.createInvoice({
        projectId,
        number: "INV-PAID",
        status: "paid",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-05"),
        amount: 4000,
      });
      await repo.createInvoice({
        projectId,
        number: "INV-OVERDUE",
        status: "overdue",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-05"),
        amount: 5000,
      });

      const now = new Date("2026-01-10");
      const result = await repo.markOverdue(now);

      expect(result.count).toBe(3); // Only the 3 issued invoices should be marked
    });
  });

  describe("updateStatus", () => {
    let invoiceId: string;

    beforeEach(async () => {
      const invoice = await repo.createInvoice({
        projectId,
        number: "INV-STATUS",
        status: "issued",
        issueDate: new Date(),
        amount: 1000,
      });
      invoiceId = invoice.id;
    });

    it("should update status successfully", async () => {
      const updated = await repo.updateStatus(invoiceId, "paid");

      expect(updated.status).toBe("paid");
    });

    it("should throw error if invoice not found", async () => {
      await expect(repo.updateStatus("non-existent-id", "paid")).rejects.toThrow(
        "Invoice not found or access denied"
      );
    });

    it("should throw error if invoice belongs to another tenant", async () => {
      // Create invoice in another tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          name: "Tenant 2",
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
          number: "INV-OTHER",
          status: "issued",
          issueDate: new Date(),
          amount: 9999,
          currency: "PLN",
        },
      });

      // Try to update with context tenant1
      await expect(repo.updateStatus(invoice2.id, "paid")).rejects.toThrow(
        "Invoice not found or access denied"
      );

      // Cleanup
      await prisma.invoice.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.project.deleteMany({ where: { tenantId: tenant2.id } });
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });

    it("should update updatedAt timestamp", async () => {
      const before = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo.updateStatus(invoiceId, "paid");

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        before!.updatedAt.getTime()
      );
    });
  });
});
