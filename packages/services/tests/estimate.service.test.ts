// BuildOS - Estimate Service Unit Tests
// Tests for estimate calculations (totals, margins, versioning)

import { describe, it, expect, beforeEach } from "vitest";
import { EstimateService, CalculatedEstimateItem } from "../src/estimate.service";
import { RepositoryContext } from "@buildos/database";

describe("EstimateService - Calculations (Unit Tests)", () => {
  let service: EstimateService;
  let mockContext: RepositoryContext;

  beforeEach(() => {
    mockContext = {
      tenantId: "test-tenant",
      userId: "test-user",
    };
    service = new EstimateService(mockContext);
  });

  describe("calculateItemTotals", () => {
    it("should calculate item totals correctly", () => {
      const result = service.calculateItemTotals(10, 100, 150);

      expect(result.totalCost).toBe(1000); // 10 * 100
      expect(result.totalClient).toBe(1500); // 10 * 150
      expect(result.margin).toBe(500); // 1500 - 1000
      expect(result.marginPercent).toBe(50); // (500 / 1000) * 100
    });

    it("should handle zero quantity", () => {
      const result = service.calculateItemTotals(0, 100, 150);

      expect(result.totalCost).toBe(0);
      expect(result.totalClient).toBe(0);
      expect(result.margin).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    it("should handle negative margin (loss)", () => {
      const result = service.calculateItemTotals(10, 150, 100);

      expect(result.totalCost).toBe(1500);
      expect(result.totalClient).toBe(1000);
      expect(result.margin).toBe(-500); // Loss!
      expect(result.marginPercent).toBeCloseTo(-33.33, 2); // (−500 / 1500) * 100
    });

    it("should handle zero margin", () => {
      const result = service.calculateItemTotals(10, 100, 100);

      expect(result.totalCost).toBe(1000);
      expect(result.totalClient).toBe(1000);
      expect(result.margin).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    it("should handle decimal quantities", () => {
      const result = service.calculateItemTotals(10.5, 100, 150);

      expect(result.totalCost).toBe(1050); // 10.5 * 100
      expect(result.totalClient).toBe(1575); // 10.5 * 150
      expect(result.margin).toBe(525); // 1575 - 1050
      expect(result.marginPercent).toBe(50); // (525 / 1050) * 100
    });
  });

  describe("calculateTotals", () => {
    it("should calculate estimate totals from multiple items", () => {
      const items: CalculatedEstimateItem[] = [
        {
          type: "work",
          name: "Item 1",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
          unitClient: 150,
          totalClient: 1500,
          margin: 500,
          marginPercent: 50,
        },
        {
          type: "material",
          name: "Item 2",
          unit: "pcs",
          quantity: 20,
          unitCost: 50,
          totalCost: 1000,
          unitClient: 75,
          totalClient: 1500,
          margin: 500,
          marginPercent: 50,
        },
        {
          type: "subcontractor",
          name: "Item 3",
          unit: "hours",
          quantity: 8,
          unitCost: 100,
          totalCost: 800,
          unitClient: 150,
          totalClient: 1200,
          margin: 400,
          marginPercent: 50,
        },
      ];

      const result = service.calculateTotals(items);

      expect(result.totalCost).toBe(2800); // 1000 + 1000 + 800
      expect(result.totalClient).toBe(4200); // 1500 + 1500 + 1200
      expect(result.margin).toBe(1400); // 4200 - 2800
      expect(result.marginPercent).toBe(50); // (1400 / 2800) * 100
    });

    it("should handle empty items array", () => {
      const items: CalculatedEstimateItem[] = [];

      const result = service.calculateTotals(items);

      expect(result.totalCost).toBe(0);
      expect(result.totalClient).toBe(0);
      expect(result.margin).toBe(0);
      expect(result.marginPercent).toBe(0);
    });

    it("should calculate correct margin percent with mixed margins", () => {
      const items: CalculatedEstimateItem[] = [
        {
          type: "work",
          name: "High margin item",
          unit: "m2",
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
          unitClient: 200,
          totalClient: 2000,
          margin: 1000,
          marginPercent: 100,
        },
        {
          type: "material",
          name: "Low margin item",
          unit: "pcs",
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
          unitClient: 110,
          totalClient: 1100,
          margin: 100,
          marginPercent: 10,
        },
      ];

      const result = service.calculateTotals(items);

      expect(result.totalCost).toBe(2000);
      expect(result.totalClient).toBe(3100);
      expect(result.margin).toBe(1100);
      expect(result.marginPercent).toBeCloseTo(55, 1); // (1100 / 2000) * 100
    });

    it("should handle realistic construction estimate", () => {
      // Realistic example: bathroom renovation
      const items: CalculatedEstimateItem[] = [
        {
          type: "work",
          name: "Демонтаж старой плитки",
          unit: "m2",
          quantity: 20,
          unitCost: 50,
          totalCost: 1000,
          unitClient: 75,
          totalClient: 1500,
          margin: 500,
          marginPercent: 50,
        },
        {
          type: "material",
          name: "Керамическая плитка",
          unit: "m2",
          quantity: 20,
          unitCost: 150,
          totalCost: 3000,
          unitClient: 200,
          totalClient: 4000,
          margin: 1000,
          marginPercent: 33.33,
        },
        {
          type: "work",
          name: "Укладка плитки",
          unit: "m2",
          quantity: 20,
          unitCost: 100,
          totalCost: 2000,
          unitClient: 150,
          totalClient: 3000,
          margin: 1000,
          marginPercent: 50,
        },
        {
          type: "material",
          name: "Сантехника (ванна, раковина, унитаз)",
          unit: "set",
          quantity: 1,
          unitCost: 2000,
          totalCost: 2000,
          unitClient: 2500,
          totalClient: 2500,
          margin: 500,
          marginPercent: 25,
        },
        {
          type: "subcontractor",
          name: "Электрика",
          unit: "lump",
          quantity: 1,
          unitCost: 1500,
          totalCost: 1500,
          unitClient: 2000,
          totalClient: 2000,
          margin: 500,
          marginPercent: 33.33,
        },
      ];

      const result = service.calculateTotals(items);

      expect(result.totalCost).toBe(9500);
      expect(result.totalClient).toBe(13000);
      expect(result.margin).toBe(3500);
      expect(result.marginPercent).toBeCloseTo(36.84, 1); // (3500 / 9500) * 100
    });
  });

  describe("Edge cases", () => {
    it("should handle very small numbers", () => {
      const result = service.calculateItemTotals(0.01, 0.01, 0.02);

      expect(result.totalCost).toBeCloseTo(0.0001, 6);
      expect(result.totalClient).toBeCloseTo(0.0002, 6);
      expect(result.margin).toBeCloseTo(0.0001, 6);
    });

    it("should handle very large numbers", () => {
      const result = service.calculateItemTotals(1000000, 1000, 1500);

      expect(result.totalCost).toBe(1000000000);
      expect(result.totalClient).toBe(1500000000);
      expect(result.margin).toBe(500000000);
      expect(result.marginPercent).toBe(50);
    });

    it("should handle items with zero cost (free items)", () => {
      const items: CalculatedEstimateItem[] = [
        {
          type: "work",
          name: "Free consultation",
          unit: "hours",
          quantity: 2,
          unitCost: 0,
          totalCost: 0,
          unitClient: 0,
          totalClient: 0,
          margin: 0,
          marginPercent: 0,
        },
        {
          type: "material",
          name: "Paid material",
          unit: "pcs",
          quantity: 10,
          unitCost: 100,
          totalCost: 1000,
          unitClient: 150,
          totalClient: 1500,
          margin: 500,
          marginPercent: 50,
        },
      ];

      const result = service.calculateTotals(items);

      expect(result.totalCost).toBe(1000);
      expect(result.totalClient).toBe(1500);
      expect(result.margin).toBe(500);
      expect(result.marginPercent).toBe(50);
    });
  });
});
