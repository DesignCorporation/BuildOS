// BuildOS - WorkType Catalog Tests
// Ensures tenant-scoped uniqueness and translation integrity

import { describe, it, expect } from "vitest";
import { prisma } from "../src/index";

describe("WorkType Catalog", () => {
  it("should allow same code across different tenants", async () => {
    const tenantA = await prisma.tenant.create({
      data: { name: "Tenant A", slug: `worktype-a-${Date.now()}`, isActive: true },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: "Tenant B", slug: `worktype-b-${Date.now()}`, isActive: true },
    });

    const createWorkType = (tenantId: string) =>
      prisma.workType.create({
        data: {
          tenantId,
          code: "wall-paint",
          category: "Finishing",
          unit: "m2",
          unitCost: 10,
          clientUnitPrice: 25,
          laborNormHoursPerUnit: 0.2,
          isActive: true,
          translations: {
            create: [{ locale: "pl", name: "Malowanie ścian" }],
          },
        },
      });

    const workTypeA = await createWorkType(tenantA.id);
    const workTypeB = await createWorkType(tenantB.id);

    expect(workTypeA.code).toBe("wall-paint");
    expect(workTypeB.code).toBe("wall-paint");
  });

  it("should enforce unique code per tenant", async () => {
    const tenant = await prisma.tenant.create({
      data: { name: "Tenant C", slug: `worktype-c-${Date.now()}`, isActive: true },
    });

    await prisma.workType.create({
      data: {
        tenantId: tenant.id,
        code: "tile-floor",
        category: "Finishing",
        unit: "m2",
        unitCost: 20,
        clientUnitPrice: 45,
        laborNormHoursPerUnit: 0.35,
        isActive: true,
        translations: {
          create: [{ locale: "pl", name: "Układanie płytek" }],
        },
      },
    });

    await expect(
      prisma.workType.create({
        data: {
          tenantId: tenant.id,
          code: "tile-floor",
          category: "Finishing",
          unit: "m2",
          unitCost: 22,
          clientUnitPrice: 50,
          laborNormHoursPerUnit: 0.35,
          isActive: true,
          translations: {
            create: [{ locale: "pl", name: "Płytki (duplikat)" }],
          },
        },
      })
    ).rejects.toThrow();
  });
});
