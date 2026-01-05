// BuildOS - ANCHOR Demo Projects
// 7 realistic construction projects for demo

import { PrismaClient } from "../src/generated/client";
import { Decimal } from "@prisma/client/runtime/library";

export async function seedAnchorProjects(
  prisma: PrismaClient,
  tenantId: string
) {
  console.log("📦 Creating 7 ANCHOR projects with estimates and stages...\n");

  // Helper to create project with room and stages
  async function createProjectWithStages(
    projectData: any,
    stagesData: any[]
  ) {
    const project = await prisma.project.create({
      data: projectData,
    });

    // Create main room
    const room = await prisma.room.create({
      data: {
        tenantId,
        projectId: project.id,
        name: "Main Construction",
        description: "Main construction phases",
      },
    });

    // Create stages
    for (const stage of stagesData) {
      await prisma.stage.create({
        data: {
          ...stage,
          tenantId,
          roomId: room.id,
        },
      });
    }

    return { project, room };
  }

  // Project 1: Villa "Wilanów Heights"
  const { project: p1 } = await createProjectWithStages(
    {
      tenantId,
      name: 'Villa "Wilanów Heights"',
      address: "ul. Wilanowska 45, Warsaw 02-675",
      clientName: "Jan Investment Group",
      clientEmail: "jan@investment-group.pl",
      clientPhone: "+48 601 234 567",
      status: "active",
      notes: "Luxury villa, 350 sqm, energy-efficient build. High-end finishes required.",
    },
    [
      {
        name: "Foundation",
        description: "Excavation and foundation work",
        status: "completed",
        order: 1,
        completedAt: new Date("2025-10-20"),
      },
      {
        name: "Walls",
        description: "Structural walls and framing",
        status: "in_progress",
        order: 2,
        startedAt: new Date("2025-10-21"),
      },
      {
        name: "Roof",
        description: "Roof structure and covering",
        status: "in_progress",
        order: 3,
        startedAt: new Date("2025-11-15"),
      },
      {
        name: "Finish",
        description: "Interior finishes and details",
        status: "pending",
        order: 4,
      },
    ]
  );

  // Project 1 Estimates (3 versions)
  const est1v1 = await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p1.id,
      version: 1,
      status: "draft",
      totalCost: new Decimal("2350000"),
      totalClient: new Decimal("2500000"),
      margin: new Decimal("150000"),
      marginPercent: new Decimal("6.38"),
      notes: "Initial estimate for Villa Wilanów - luxury finishes",
    },
  });

  // Add items to v1
  await prisma.estimateItem.create({
    data: {
      tenantId,
      estimateId: est1v1.id,
      type: "work",
      name: "Excavation & Foundation",
      unit: "m³",
      quantity: new Decimal("450"),
      unitCost: new Decimal("350"),
      unitClient: new Decimal("400"),
    },
  });

  await prisma.estimateItem.create({
    data: {
      tenantId,
      estimateId: est1v1.id,
      type: "material",
      name: "Premium Concrete & Reinforcement",
      unit: "m³",
      quantity: new Decimal("200"),
      unitCost: new Decimal("800"),
      unitClient: new Decimal("900"),
    },
  });

  await prisma.estimateItem.create({
    data: {
      tenantId,
      estimateId: est1v1.id,
      type: "work",
      name: "Wall Construction",
      unit: "m²",
      quantity: new Decimal("1200"),
      unitCost: new Decimal("350"),
      unitClient: new Decimal("380"),
    },
  });

  await prisma.estimateItem.create({
    data: {
      tenantId,
      estimateId: est1v1.id,
      type: "material",
      name: "Facade Materials (Natural Stone)",
      unit: "m²",
      quantity: new Decimal("400"),
      unitCost: new Decimal("450"),
      unitClient: new Decimal("550"),
    },
  });

  // v2 - Sent to client
  const est1v2 = await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p1.id,
      version: 2,
      status: "sent",
      sentAt: new Date("2025-10-25"),
      totalCost: new Decimal("2400000"),
      totalClient: new Decimal("2550000"),
      margin: new Decimal("150000"),
      marginPercent: new Decimal("6.25"),
      notes: "Revised estimate - expanded scope for additional rooms",
    },
  });

  await prisma.estimateItem.create({
    data: {
      tenantId,
      estimateId: est1v2.id,
      type: "work",
      name: "Excavation & Foundation",
      unit: "m³",
      quantity: new Decimal("450"),
      unitCost: new Decimal("350"),
      unitClient: new Decimal("400"),
    },
  });

  // v3 - Approved
  const est1v3 = await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p1.id,
      version: 3,
      status: "approved",
      approvedAt: new Date("2025-11-01"),
      sentAt: new Date("2025-10-25"),
      totalCost: new Decimal("2380000"),
      totalClient: new Decimal("2500000"),
      margin: new Decimal("120000"),
      marginPercent: new Decimal("5.04"),
      notes: "Final approved estimate - optimized scope",
    },
  });

  // Project 2: Apartment Complex "Mokotów Park"
  const { project: p2 } = await createProjectWithStages(
    {
      tenantId,
      name: 'Apartment Complex "Mokotów Park"',
      address: "ul. Puławska 123, Warsaw 02-595",
      clientName: "Property Development Fund",
      clientEmail: "contact@propdev-fund.pl",
      clientPhone: "+48 502 345 678",
      status: "active",
      notes: "24 apartments, mixed use (retail + residential), 8 floors",
    },
    [
      {
        name: "Foundation",
        status: "completed",
        order: 1,
        completedAt: new Date("2025-11-01"),
      },
      {
        name: "Walls",
        status: "in_progress",
        order: 2,
        startedAt: new Date("2025-11-02"),
      },
      {
        name: "Roof",
        status: "pending",
        order: 3,
      },
      {
        name: "Finish",
        status: "pending",
        order: 4,
      },
    ]
  );

  // Project 2 Estimates
  const est2v1 = await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p2.id,
      version: 1,
      status: "sent",
      sentAt: new Date("2025-11-10"),
      totalCost: new Decimal("4100000"),
      totalClient: new Decimal("4200000"),
      margin: new Decimal("100000"),
      marginPercent: new Decimal("2.38"),
      notes: "Estimate for 24-unit complex with retail space",
    },
  });

  // Project 3: Office Building "TechHub Praga"
  const { project: p3 } = await createProjectWithStages(
    {
      tenantId,
      name: 'Office Building "TechHub Praga"',
      address: "ul. Pawi 1, Warsaw 03-953",
      clientName: "ANCHOR Construction (Internal)",
      clientEmail: "zbigniew@anchor-construction.pl",
      status: "active",
      notes: "6-story office building, green building certification target, 12,000 sqm",
    },
    [
      {
        name: "Foundation",
        status: "pending",
        order: 1,
      },
      {
        name: "Structural Work",
        status: "pending",
        order: 2,
      },
      {
        name: "MEP",
        status: "pending",
        order: 3,
      },
      {
        name: "Finalization",
        status: "pending",
        order: 4,
      },
    ]
  );

  // Project 3 Estimate
  const est3v1 = await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p3.id,
      version: 1,
      status: "draft",
      totalCost: new Decimal("3500000"),
      totalClient: new Decimal("3800000"),
      margin: new Decimal("300000"),
      marginPercent: new Decimal("8.57"),
      notes: "Initial quote for 6-story office building (sent to stakeholders)",
    },
  });

  // Project 4: Residential Townhouses "Piaseczno Meadows"
  const { project: p4 } = await createProjectWithStages(
    {
      tenantId,
      name: 'Residential Townhouses "Piaseczno Meadows"',
      address: "ul. Leśna 78, Piaseczno 05-500",
      clientName: "Private Investor",
      clientEmail: "investor@piaseczno.pl",
      clientPhone: "+48 603 456 789",
      status: "active",
      notes: "6 modern townhouses, minimalist design, high-quality finishes",
    },
    [
      {
        name: "Foundation",
        status: "completed",
        order: 1,
        completedAt: new Date("2025-09-15"),
      },
      {
        name: "Walls",
        status: "completed",
        order: 2,
        completedAt: new Date("2025-10-30"),
      },
      {
        name: "Roof",
        status: "in_progress",
        order: 3,
        startedAt: new Date("2025-11-01"),
      },
      {
        name: "Finish",
        status: "in_progress",
        order: 4,
        startedAt: new Date("2025-11-20"),
      },
    ]
  );

  // Project 4 Estimates
  await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p4.id,
      version: 1,
      status: "sent",
      sentAt: new Date("2025-08-20"),
      totalCost: new Decimal("1100000"),
      totalClient: new Decimal("1200000"),
      margin: new Decimal("100000"),
      marginPercent: new Decimal("9.09"),
    },
  });

  // Project 5: House Renovation "Konstancin Modern"
  const { project: p5 } = await createProjectWithStages(
    {
      tenantId,
      name: 'House Renovation "Konstancin Modern"',
      address: "ul. Spacerowa 34, Konstancin-Jeziorna 05-510",
      clientName: "Completed Project",
      status: "completed",
      notes: "Complete modernization - plumbing, electrical, heating, new roof",
    },
    [
      {
        name: "Foundation",
        status: "completed",
        order: 1,
        completedAt: new Date("2025-07-15"),
      },
      {
        name: "Walls",
        status: "completed",
        order: 2,
        completedAt: new Date("2025-08-20"),
      },
      {
        name: "Roof",
        status: "completed",
        order: 3,
        completedAt: new Date("2025-09-15"),
      },
      {
        name: "Finish",
        status: "completed",
        order: 4,
        completedAt: new Date("2025-11-30"),
      },
    ]
  );

  // Project 5 Estimate
  await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p5.id,
      version: 1,
      status: "approved",
      approvedAt: new Date("2025-07-01"),
      totalCost: new Decimal("750000"),
      totalClient: new Decimal("850000"),
      margin: new Decimal("100000"),
      marginPercent: new Decimal("13.33"),
    },
  });

  // Project 6: Sports Complex "Warsaw Olympics"
  const { project: p6 } = await createProjectWithStages(
    {
      tenantId,
      name: 'Sports Complex Addition "Warsaw Olympics"',
      address: "ul. Żurawia 1, Warsaw 00-503",
      clientName: "Municipal",
      clientEmail: "info@warsaw-olympics.pl",
      status: "active",
      notes: "Olympic training facility expansion, high visibility project",
    },
    [
      {
        name: "Foundation",
        status: "in_progress",
        order: 1,
        startedAt: new Date("2025-11-20"),
      },
      {
        name: "Walls",
        status: "pending",
        order: 2,
      },
      {
        name: "Roof",
        status: "pending",
        order: 3,
      },
      {
        name: "Finish",
        status: "pending",
        order: 4,
      },
    ]
  );

  // Project 6 Estimates
  await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p6.id,
      version: 1,
      status: "sent",
      sentAt: new Date("2025-11-15"),
      totalCost: new Decimal("5200000"),
      totalClient: new Decimal("5600000"),
      margin: new Decimal("400000"),
      marginPercent: new Decimal("7.69"),
    },
  });

  // Project 7: Commercial Warehouse "Logistics Hub Łódź"
  const { project: p7 } = await createProjectWithStages(
    {
      tenantId,
      name: 'Commercial Warehouse "Logistics Hub Łódź"',
      address: "ul. Przemysłowa 456, Łódź 91-397",
      clientName: "Logistics Company",
      clientEmail: "projects@logistics-pl.com",
      status: "active",
      notes: "15,000 sqm industrial warehouse with office section, modern logistics facilities",
    },
    [
      {
        name: "Foundation",
        status: "pending",
        order: 1,
      },
      {
        name: "Structural Work",
        status: "pending",
        order: 2,
      },
      {
        name: "MEP",
        status: "pending",
        order: 3,
      },
      {
        name: "Finalization",
        status: "pending",
        order: 4,
      },
    ]
  );

  // Project 7 Estimate
  await prisma.estimate.create({
    data: {
      tenantId,
      projectId: p7.id,
      version: 1,
      status: "draft",
      totalCost: new Decimal("1900000"),
      totalClient: new Decimal("2100000"),
      margin: new Decimal("200000"),
      marginPercent: new Decimal("10.53"),
      notes: "Quotation stage - large industrial warehouse project",
    },
  });

  console.log("✅ Created 7 projects with stages and estimates");
  console.log("   - Project 1: Villa Wilanów (3 estimate versions: draft→sent→approved)");
  console.log("   - Project 2: Apartment Complex (sent)");
  console.log("   - Project 3: Office Building (draft)");
  console.log("   - Project 4: Townhouses (sent)");
  console.log("   - Project 5: House Renovation (completed)");
  console.log("   - Project 6: Sports Complex (sent)");
  console.log("   - Project 7: Warehouse (draft)\n");
}
