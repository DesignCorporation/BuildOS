// BuildOS - Estimate Service Integration Tests
// Tests full flow: Service → Repository → Database

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { EstimateService } from "../src/estimate.service";
import { prisma } from "@buildos/database";

describe("EstimateService - Integration Tests", () => {
  let service: EstimateService;
  let tenantId: string;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.estimateItem.deleteMany({});
    await prisma.estimate.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.tenant.deleteMany({});

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Company",
        slug: `test-${Date.now()}`,
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

    // Initialize service with context
    service = new EstimateService({ tenantId, userId });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("createEstimateWithItems", () => {
    it("should create estimate with items and calculate totals correctly", async () => {
      const items = [
        {
          type: "work",
          name: "Painting",
          unit: "m2",
          quantity: 50,
          unitCost: 20,
          unitClient: 30,
        },
        {
          type: "material",
          name: "Paint",
          unit: "liter",
          quantity: 10,
          unitCost: 50,
          unitClient: 75,
        },
      ];

      const estimate = await service.createEstimateWithItems(projectId, items);

      // Verify estimate was created
      expect(estimate.id).toBeDefined();
      expect(estimate.projectId).toBe(projectId);
      expect(estimate.version).toBe(1);
      expect(estimate.status).toBe("draft");

      // Verify calculations
      // Item 1: 50 * 20 = 1000 cost, 50 * 30 = 1500 client
      // Item 2: 10 * 50 = 500 cost, 10 * 75 = 750 client
      // Total: 1500 cost, 2250 client, 750 margin, 50% margin percent
      expect(Number(estimate.totalCost)).toBe(1500);
      expect(Number(estimate.totalClient)).toBe(2250);
      expect(Number(estimate.margin)).toBe(750);
      expect(Number(estimate.marginPercent)).toBe(50);

      // Verify items were created
      expect(estimate.items).toHaveLength(2);
      expect(estimate.items[0].name).toBe("Painting");
      expect(Number(estimate.items[0].totalCost)).toBe(1000);
      expect(Number(estimate.items[0].totalClient)).toBe(1500);
    });

    it("should automatically increment version number", async () => {
      // Create first version
      const items = [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
      ];

      const estimate1 = await service.createEstimateWithItems(projectId, items);
      expect(estimate1.version).toBe(1);

      // Create second version
      const estimate2 = await service.createEstimateWithItems(projectId, items);
      expect(estimate2.version).toBe(2);

      // Create third version
      const estimate3 = await service.createEstimateWithItems(projectId, items);
      expect(estimate3.version).toBe(3);
    });
  });

  describe("addItemToEstimate", () => {
    it("should add item and recalculate estimate totals", async () => {
      // Create estimate with one item
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Initial Work",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
      ]);

      expect(Number(estimate.totalCost)).toBe(1000);
      expect(Number(estimate.totalClient)).toBe(1500);

      // Add another item
      await service.addItemToEstimate(estimate.id, {
        type: "material",
        name: "New Material",
        unit: "pcs",
        quantity: 5,
        unitCost: 200,
        unitClient: 300,
      });

      // Fetch updated estimate
      const updated = await prisma.estimate.findUnique({
        where: { id: estimate.id },
      });

      // Verify totals were recalculated
      // Initial: 1000 cost, 1500 client
      // New item: 1000 cost (5 * 200), 1500 client (5 * 300)
      // Total: 2000 cost, 3000 client
      expect(Number(updated?.totalCost)).toBe(2000);
      expect(Number(updated?.totalClient)).toBe(3000);
      expect(Number(updated?.margin)).toBe(1000);
      expect(Number(updated?.marginPercent)).toBe(50);
    });
  });

  describe("status updates", () => {
    it("should send estimate and set sentAt", async () => {
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
      ]);

      const sentEstimate = await service.sendEstimate(estimate.id);

      expect(sentEstimate.status).toBe("sent");
      expect(sentEstimate.sentAt).toBeInstanceOf(Date);
    });

    it("should approve estimate and set approvedAt", async () => {
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
      ]);

      const approvedEstimate = await service.approveEstimate(estimate.id);

      expect(approvedEstimate.status).toBe("approved");
      expect(approvedEstimate.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe("updateItem", () => {
    it("should update item and recalculate estimate totals", async () => {
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
        {
          type: "material",
          name: "Material 1",
          unit: "pcs",
          quantity: 5,
          unitCost: 200,
          unitClient: 300,
        },
      ]);

      const itemToUpdate = estimate.items[0];

      // Update quantity
      await service.updateItem(itemToUpdate.id, {
        quantity: 20, // Changed from 10 to 20
      });

      // Fetch updated estimate
      const updated = await prisma.estimate.findUnique({
        where: { id: estimate.id },
      });

      // Verify totals were recalculated
      // Item 1: 20 * 100 = 2000 cost, 20 * 150 = 3000 client
      // Item 2: 5 * 200 = 1000 cost, 5 * 300 = 1500 client
      // Total: 3000 cost, 4500 client
      expect(Number(updated?.totalCost)).toBe(3000);
      expect(Number(updated?.totalClient)).toBe(4500);
    });
  });

  describe("deleteItem", () => {
    it("should delete item and recalculate estimate totals", async () => {
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
        {
          type: "material",
          name: "Material 1",
          unit: "pcs",
          quantity: 5,
          unitCost: 200,
          unitClient: 300,
        },
      ]);

      const itemToDelete = estimate.items[1];

      // Delete item
      await service.deleteItem(itemToDelete.id);

      // Fetch updated estimate
      const updated = await prisma.estimate.findUnique({
        where: { id: estimate.id },
        include: { items: true },
      });

      // Verify item was deleted
      expect(updated?.items).toHaveLength(1);

      // Verify totals were recalculated (only item 1 remains)
      expect(Number(updated?.totalCost)).toBe(1000);
      expect(Number(updated?.totalClient)).toBe(1500);
    });
  });

  describe("createNewVersion", () => {
    it("should create new version with all items copied", async () => {
      const original = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
        {
          type: "material",
          name: "Material 1",
          unit: "pcs",
          quantity: 5,
          unitCost: 200,
          unitClient: 300,
        },
      ]);

      const newVersion = await service.createNewVersion(original.id);

      // Verify version was incremented
      expect(newVersion.version).toBe(2);

      // Verify all items were copied
      expect(newVersion.items).toHaveLength(2);
      expect(newVersion.items[0].name).toBe("Work 1");
      expect(newVersion.items[1].name).toBe("Material 1");

      // Verify totals match
      expect(Number(newVersion.totalCost)).toBe(Number(original.totalCost));
      expect(Number(newVersion.totalClient)).toBe(Number(original.totalClient));

      // Verify status is draft
      expect(newVersion.status).toBe("draft");
    });
  });

  describe("Status transitions", () => {
    it("should update estimate status correctly", async () => {
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
      ]);

      expect(estimate.status).toBe("draft");

      // Send to client
      const sent = await service.sendEstimate(estimate.id);
      expect(sent.status).toBe("sent");
      expect(sent.sentAt).toBeDefined();

      // Approve
      const approved = await service.approveEstimate(estimate.id);
      expect(approved.status).toBe("approved");
      expect(approved.approvedAt).toBeDefined();
    });

    it("should reject estimate", async () => {
      const estimate = await service.createEstimateWithItems(projectId, [
        {
          type: "work",
          name: "Work 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          unitClient: 150,
        },
      ]);

      const rejected = await service.rejectEstimate(estimate.id);
      expect(rejected.status).toBe("rejected");
    });
  });
});
