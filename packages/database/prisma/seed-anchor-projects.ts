// BuildOS - ANCHOR Demo Projects
// 7 realistic construction projects for demo

import { PrismaClient } from "../src/generated/client";
import { Decimal } from "@prisma/client/runtime/library";

export async function seedAnchorProjects(
  prisma: PrismaClient,
  tenantId: string
) {
  console.log("📦 Creating 7 ANCHOR projects with estimates and stages...\n");
  const buildPhotoUrl = (seed: string) =>
    `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`;

  async function ensureProjectWithStages(
    projectData: {
      tenantId: string;
      name: string;
      address?: string;
      clientName?: string;
      clientEmail?: string;
      clientPhone?: string;
      status?: string;
      notes?: string;
    },
    stagesData: Array<{
      name: string;
      description?: string;
      status?: string;
      order: number;
      startedAt?: Date;
      completedAt?: Date;
      notes?: string;
    }>
  ) {
    const existingProject = await prisma.project.findFirst({
      where: { tenantId, name: projectData.name },
      include: {
        rooms: {
          include: {
            stages: true,
          },
        },
      },
    });

    if (existingProject) {
      let room = existingProject.rooms.find((r) => r.name === "Main Construction");
      if (!room) {
        room = await prisma.room.create({
          data: {
            tenantId,
            projectId: existingProject.id,
            name: "Main Construction",
            notes: "Main construction phases",
          },
        });
      }

      const existingStages = existingProject.rooms.flatMap((r) => r.stages);
      const stages: any[] = [...existingStages];
      for (const stage of stagesData) {
        const alreadyExists = existingStages.some((s) => s.name === stage.name);
        if (!alreadyExists) {
          const createdStage = await prisma.stage.create({
            data: {
              ...stage,
              tenantId,
              roomId: room.id,
            },
          });
          stages.push(createdStage);
        }
      }

      return { project: existingProject, room, stages };
    }

    return createProjectWithStages(projectData, stagesData);
  }

  async function createEstimateItem(
    estimateId: string,
    item: {
      type: string;
      name: string;
      description?: string;
      unit: string;
      quantity: Decimal | string | number;
      unitCost: Decimal | string | number;
      unitClient: Decimal | string | number;
    }
  ) {
    const quantity = new Decimal(item.quantity);
    const unitCost = new Decimal(item.unitCost);
    const unitClient = new Decimal(item.unitClient);
    const totalCost = unitCost.mul(quantity);
    const totalClient = unitClient.mul(quantity);
    const margin = totalClient.sub(totalCost);
    const marginPercent = totalCost.equals(0)
      ? new Decimal(0)
      : margin.div(totalCost).mul(100);

    return prisma.estimateItem.create({
      data: {
        tenantId,
        estimateId,
        type: item.type,
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity,
        unitCost,
        totalCost,
        unitClient,
        totalClient,
        margin,
        marginPercent,
      },
    });
  }

  async function ensureEstimate(
    projectId: string,
    estimateData: {
      version: number;
      status: string;
      totalCost: Decimal | string;
      totalClient: Decimal | string;
      margin: Decimal | string;
      marginPercent: Decimal | string;
      sentAt?: Date;
      approvedAt?: Date;
      notes?: string;
    },
    items: Array<{
      type: string;
      name: string;
      description?: string;
      unit: string;
      quantity: Decimal | string | number;
      unitCost: Decimal | string | number;
      unitClient: Decimal | string | number;
    }>
  ) {
    const estimate = await prisma.estimate.upsert({
      where: {
        projectId_version: {
          projectId,
          version: estimateData.version,
        },
      },
      update: {},
      create: {
        tenantId,
        projectId,
        ...estimateData,
      },
    });

    const existingItem = await prisma.estimateItem.findFirst({
      where: { estimateId: estimate.id },
      select: { id: true },
    });

    if (!existingItem) {
      for (const item of items) {
        await createEstimateItem(estimate.id, item);
      }
    }

    return estimate;
  }

  async function ensureContract(
    projectId: string,
    contractData: {
      number: string;
      status?: string;
      signedAt?: Date;
      notes?: string;
    },
    milestones: Array<{
      name: string;
      amount: Decimal | string | number;
      dueDate?: Date;
    }>
  ) {
    const existing = await prisma.contract.findFirst({
      where: {
        tenantId,
        number: contractData.number,
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.contract.create({
      data: {
        tenantId,
        projectId,
        number: contractData.number,
        status: contractData.status ?? "draft",
        signedAt: contractData.signedAt ?? null,
        notes: contractData.notes ?? null,
        milestones: {
          create: milestones.map((milestone, index) => ({
            tenantId,
            name: milestone.name,
            amount: milestone.amount,
            dueDate: milestone.dueDate ?? null,
            status: "pending",
            order: index,
          })),
        },
      },
    });
  }

  async function createPhoto(input: {
    projectId: string;
    stageId?: string;
    filename: string;
    url: string;
    description?: string;
    capturedAt?: Date;
  }) {
    return prisma.photo.create({
      data: {
        tenantId,
        projectId: input.projectId,
        stageId: input.stageId,
        filename: input.filename,
        url: input.url,
        description: input.description,
        capturedAt: input.capturedAt,
      },
    });
  }

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
        notes: "Main construction phases",
      },
    });

    // Create stages
    const stages: any[] = [];
    for (const stage of stagesData) {
      const createdStage = await prisma.stage.create({
        data: {
          ...stage,
          tenantId,
          roomId: room.id,
        },
      });
      stages.push(createdStage);
    }

    return { project, room, stages };
  }

  // Project 1: Villa "Wilanów Heights"
  const { project: p1, stages: p1Stages } = await ensureProjectWithStages(
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
        notes: "Foundation complete",
      },
      {
        name: "Walls",
        description: "Structural walls and framing",
        status: "in_progress",
        order: 2,
        startedAt: new Date("2025-10-21"),
        notes: "Walls 85% complete",
      },
      {
        name: "Roof",
        description: "Roof structure and covering",
        status: "in_progress",
        order: 3,
        startedAt: new Date("2025-11-15"),
        notes: "Roof structure in progress",
      },
      {
        name: "Finish",
        description: "Interior finishes and details",
        status: "pending",
        order: 4,
        notes: "Coming soon - interior finishes\nExpected start: 2025-12-15",
      },
    ]
  );

  // Project 1 photos (Foundation + Walls + Roof)
  const p1Foundation = p1Stages.find((stage) => stage.name === "Foundation");
  const p1Walls = p1Stages.find((stage) => stage.name === "Walls");
  const p1Roof = p1Stages.find((stage) => stage.name === "Roof");

  const existingP1Photos = await prisma.photo.findFirst({
    where: { tenantId, projectId: p1.id },
    select: { id: true },
  });

  if (p1Foundation && !existingP1Photos) {
    await createPhoto({
      projectId: p1.id,
      stageId: p1Foundation.id,
      filename: "foundation-1.jpg",
      url: buildPhotoUrl("foundation-1"),
      description: "Foundation excavation",
      capturedAt: new Date("2025-10-10"),
    });
    await createPhoto({
      projectId: p1.id,
      stageId: p1Foundation.id,
      filename: "foundation-2.jpg",
      url: buildPhotoUrl("foundation-2"),
      description: "Footings poured",
      capturedAt: new Date("2025-10-20"),
    });
  } else if (existingP1Photos) {
    const p1Photos = await prisma.photo.findMany({
      where: { tenantId, projectId: p1.id },
    });
    for (const photo of p1Photos) {
      if (photo.url.includes("via.placeholder.com")) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { url: buildPhotoUrl(photo.filename || photo.id) },
        });
      }
    }
  }

  if (p1Walls && !existingP1Photos) {
    await createPhoto({
      projectId: p1.id,
      stageId: p1Walls.id,
      filename: "walls-1.jpg",
      url: buildPhotoUrl("walls-1"),
      description: "Wall framing progress",
      capturedAt: new Date("2025-11-05"),
    });
    await createPhoto({
      projectId: p1.id,
      stageId: p1Walls.id,
      filename: "walls-2.jpg",
      url: buildPhotoUrl("walls-2"),
      description: "Structural walls completed",
      capturedAt: new Date("2025-11-15"),
    });
  }

  if (p1Roof && !existingP1Photos) {
    await createPhoto({
      projectId: p1.id,
      stageId: p1Roof.id,
      filename: "roof-1.jpg",
      url: buildPhotoUrl("roof-1"),
      description: "Roof structure",
      capturedAt: new Date("2025-12-05"),
    });
  }

  await ensureContract(
    p1.id,
    {
      number: "CN-2026-001",
      status: "signed",
      signedAt: new Date("2025-12-01"),
      notes: "Signed with Jan Investment Group for Villa Wilanów Heights.",
    },
    [
      {
        name: "Deposit",
        amount: new Decimal("400000"),
        dueDate: new Date("2025-12-05"),
      },
      {
        name: "Midpoint",
        amount: new Decimal("1200000"),
        dueDate: new Date("2026-02-01"),
      },
      {
        name: "Final",
        amount: new Decimal("900000"),
        dueDate: new Date("2026-04-15"),
      },
    ]
  );

  // Project 1 Estimates (3 versions)
  await ensureEstimate(
    p1.id,
    {
      version: 1,
      status: "draft",
      totalCost: new Decimal("2350000"),
      totalClient: new Decimal("2500000"),
      margin: new Decimal("150000"),
      marginPercent: new Decimal("6.38"),
      notes: "Initial estimate for Villa Wilanów - luxury finishes",
    },
    [
      {
        type: "work",
        name: "Excavation & Foundation",
        unit: "m³",
        quantity: new Decimal("450"),
        unitCost: new Decimal("350"),
        unitClient: new Decimal("400"),
      },
      {
        type: "material",
        name: "Premium Concrete & Reinforcement",
        unit: "m³",
        quantity: new Decimal("200"),
        unitCost: new Decimal("800"),
        unitClient: new Decimal("900"),
      },
      {
        type: "work",
        name: "Wall Construction",
        unit: "m²",
        quantity: new Decimal("1200"),
        unitCost: new Decimal("350"),
        unitClient: new Decimal("380"),
      },
      {
        type: "material",
        name: "Facade Materials (Natural Stone)",
        unit: "m²",
        quantity: new Decimal("400"),
        unitCost: new Decimal("450"),
        unitClient: new Decimal("550"),
      },
    ]
  );

  await ensureEstimate(
    p1.id,
    {
      version: 2,
      status: "sent",
      sentAt: new Date("2025-10-25"),
      totalCost: new Decimal("2400000"),
      totalClient: new Decimal("2550000"),
      margin: new Decimal("150000"),
      marginPercent: new Decimal("6.25"),
      notes: "Revised estimate - expanded scope for additional rooms",
    },
    [
      {
        type: "work",
        name: "Excavation & Foundation",
        unit: "m³",
        quantity: new Decimal("450"),
        unitCost: new Decimal("350"),
        unitClient: new Decimal("400"),
      },
      {
        type: "work",
        name: "Roof framing updates",
        unit: "m²",
        quantity: new Decimal("380"),
        unitCost: new Decimal("280"),
        unitClient: new Decimal("320"),
      },
    ]
  );

  await ensureEstimate(
    p1.id,
    {
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
    [
      {
        type: "material",
        name: "Facade Materials (Natural Stone)",
        unit: "m²",
        quantity: new Decimal("380"),
        unitCost: new Decimal("450"),
        unitClient: new Decimal("540"),
      },
    ]
  );

  // Project 2: Apartment Complex "Mokotów Park"
  const { project: p2, stages: p2Stages } = await ensureProjectWithStages(
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
        notes: "Foundation completed",
      },
      {
        name: "Walls",
        status: "in_progress",
        order: 2,
        startedAt: new Date("2025-11-02"),
        notes: "Walls 70% complete",
      },
      {
        name: "Roof",
        status: "pending",
        order: 3,
        notes: "Roof work coming next - scheduled for 2025-12-20",
      },
      {
        name: "Finish",
        status: "pending",
        order: 4,
        notes: "Interior finishes - TBD after roof complete",
      },
    ]
  );

  // Project 2 photos (Foundation + Walls)
  const p2Foundation = p2Stages.find((stage) => stage.name === "Foundation");
  const p2Walls = p2Stages.find((stage) => stage.name === "Walls");

  const existingP2Photos = await prisma.photo.findFirst({
    where: { tenantId, projectId: p2.id },
    select: { id: true },
  });

  if (p2Foundation && !existingP2Photos) {
    await createPhoto({
      projectId: p2.id,
      stageId: p2Foundation.id,
      filename: "foundation-1.jpg",
      url: buildPhotoUrl("mokotow-foundation-1"),
      description: "Foundation work",
      capturedAt: new Date("2025-11-20"),
    });
    await createPhoto({
      projectId: p2.id,
      stageId: p2Foundation.id,
      filename: "foundation-2.jpg",
      url: buildPhotoUrl("mokotow-foundation-2"),
      description: "Concrete pour",
      capturedAt: new Date("2025-11-28"),
    });
  } else if (existingP2Photos) {
    const p2Photos = await prisma.photo.findMany({
      where: { tenantId, projectId: p2.id },
    });
    for (const photo of p2Photos) {
      if (photo.url.includes("via.placeholder.com")) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { url: buildPhotoUrl(photo.filename || photo.id) },
        });
      }
    }
  }

  if (p2Walls && !existingP2Photos) {
    await createPhoto({
      projectId: p2.id,
      stageId: p2Walls.id,
      filename: "walls-1.jpg",
      url: buildPhotoUrl("mokotow-walls-1"),
      description: "Wall framing",
      capturedAt: new Date("2025-12-04"),
    });
  }

  // Project 2 Estimates
  await ensureEstimate(
    p2.id,
    {
      version: 1,
      status: "sent",
      sentAt: new Date("2025-11-10"),
      totalCost: new Decimal("4100000"),
      totalClient: new Decimal("4200000"),
      margin: new Decimal("100000"),
      marginPercent: new Decimal("2.38"),
      notes: "Estimate for 24-unit complex with retail space",
    },
    [
      {
        type: "work",
        name: "Foundation works",
        unit: "m³",
        quantity: new Decimal("780"),
        unitCost: new Decimal("320"),
        unitClient: new Decimal("350"),
      },
      {
        type: "material",
        name: "Concrete + reinforcement",
        unit: "m³",
        quantity: new Decimal("420"),
        unitCost: new Decimal("700"),
        unitClient: new Decimal("760"),
      },
      {
        type: "work",
        name: "Structural walls",
        unit: "m²",
        quantity: new Decimal("2800"),
        unitCost: new Decimal("310"),
        unitClient: new Decimal("340"),
      },
    ]
  );

  await ensureEstimate(
    p2.id,
    {
      version: 2,
      status: "approved",
      sentAt: new Date("2025-11-15"),
      approvedAt: new Date("2025-11-25"),
      totalCost: new Decimal("4150000"),
      totalClient: new Decimal("4300000"),
      margin: new Decimal("150000"),
      marginPercent: new Decimal("3.61"),
      notes: "Approved version with updated retail fit-out scope",
    },
    [
      {
        type: "material",
        name: "Facade system",
        unit: "m²",
        quantity: new Decimal("1200"),
        unitCost: new Decimal("420"),
        unitClient: new Decimal("460"),
      },
    ]
  );

  // Project 3: Office Building "TechHub Praga"
  const { project: p3 } = await ensureProjectWithStages(
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
  await ensureEstimate(
    p3.id,
    {
      version: 1,
      status: "draft",
      totalCost: new Decimal("3500000"),
      totalClient: new Decimal("3800000"),
      margin: new Decimal("300000"),
      marginPercent: new Decimal("8.57"),
      notes: "Initial quote for 6-story office building (sent to stakeholders)",
    },
    [
      {
        type: "work",
        name: "Structural frame",
        unit: "m²",
        quantity: new Decimal("9000"),
        unitCost: new Decimal("260"),
        unitClient: new Decimal("290"),
      },
      {
        type: "material",
        name: "Steel & concrete",
        unit: "t",
        quantity: new Decimal("420"),
        unitCost: new Decimal("4200"),
        unitClient: new Decimal("4600"),
      },
    ]
  );

  await ensureEstimate(
    p3.id,
    {
      version: 2,
      status: "sent",
      sentAt: new Date("2025-11-18"),
      totalCost: new Decimal("3600000"),
      totalClient: new Decimal("3920000"),
      margin: new Decimal("320000"),
      marginPercent: new Decimal("8.89"),
      notes: "Updated scope with MEP preliminary allowances",
    },
    [
      {
        type: "work",
        name: "MEP preliminary",
        unit: "m²",
        quantity: new Decimal("9000"),
        unitCost: new Decimal("90"),
        unitClient: new Decimal("110"),
      },
    ]
  );

  // Project 4: Residential Townhouses "Piaseczno Meadows"
  const { project: p4, stages: p4Stages } = await ensureProjectWithStages(
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
  await ensureEstimate(
    p4.id,
    {
      version: 1,
      status: "sent",
      sentAt: new Date("2025-08-20"),
      totalCost: new Decimal("1100000"),
      totalClient: new Decimal("1200000"),
      margin: new Decimal("100000"),
      marginPercent: new Decimal("9.09"),
    },
    [
      {
        type: "work",
        name: "Townhouse shell works",
        unit: "m²",
        quantity: new Decimal("1800"),
        unitCost: new Decimal("320"),
        unitClient: new Decimal("350"),
      },
      {
        type: "material",
        name: "Roofing materials",
        unit: "m²",
        quantity: new Decimal("620"),
        unitCost: new Decimal("180"),
        unitClient: new Decimal("210"),
      },
    ]
  );

  await ensureEstimate(
    p4.id,
    {
      version: 2,
      status: "approved",
      sentAt: new Date("2025-09-05"),
      approvedAt: new Date("2025-09-18"),
      totalCost: new Decimal("1120000"),
      totalClient: new Decimal("1230000"),
      margin: new Decimal("110000"),
      marginPercent: new Decimal("9.82"),
      notes: "Approved version after finishing plan update",
    },
    [
      {
        type: "work",
        name: "Roof completion labor",
        unit: "m²",
        quantity: new Decimal("600"),
        unitCost: new Decimal("140"),
        unitClient: new Decimal("170"),
      },
    ]
  );

  // Project 5: House Renovation "Konstancin Modern"
  const { project: p5 } = await ensureProjectWithStages(
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
  await ensureEstimate(
    p5.id,
    {
      version: 1,
      status: "approved",
      approvedAt: new Date("2025-07-01"),
      totalCost: new Decimal("750000"),
      totalClient: new Decimal("850000"),
      margin: new Decimal("100000"),
      marginPercent: new Decimal("13.33"),
    },
    [
      {
        type: "work",
        name: "Interior renovation labor",
        unit: "m²",
        quantity: new Decimal("520"),
        unitCost: new Decimal("450"),
        unitClient: new Decimal("520"),
      },
      {
        type: "material",
        name: "Plumbing & electrical",
        unit: "pcs",
        quantity: new Decimal("120"),
        unitCost: new Decimal("800"),
        unitClient: new Decimal("920"),
      },
    ]
  );

  const existingP4Photos = await prisma.photo.findFirst({
    where: { tenantId, projectId: p4.id },
    select: { id: true },
  });

  if (!existingP4Photos) {
    const p4Foundation = p4Stages.find((stage) => stage.name === "Foundation");
    const p4Finish = p4Stages.find((stage) => stage.name === "Finish");
    if (p4Foundation) {
      await createPhoto({
        projectId: p4.id,
        stageId: p4Foundation.id,
        filename: "townhouses-foundation-1.jpg",
        url: buildPhotoUrl("townhouses-foundation-1"),
        description: "Foundation completed",
        capturedAt: new Date("2025-09-15"),
      });
    }
    if (p4Finish) {
      await createPhoto({
        projectId: p4.id,
        stageId: p4Finish.id,
        filename: "townhouses-finish-1.jpg",
        url: buildPhotoUrl("townhouses-finish-1"),
        description: "Interior finishes progress",
        capturedAt: new Date("2025-11-05"),
      });
    }
  }

  // Project 6: Sports Complex "Warsaw Olympics"
  const { project: p6, stages: p6Stages } = await ensureProjectWithStages(
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
  await ensureEstimate(
    p6.id,
    {
      version: 1,
      status: "sent",
      sentAt: new Date("2025-11-15"),
      totalCost: new Decimal("5200000"),
      totalClient: new Decimal("5600000"),
      margin: new Decimal("400000"),
      marginPercent: new Decimal("7.69"),
    },
    [
      {
        type: "work",
        name: "Stadium expansion works",
        unit: "m²",
        quantity: new Decimal("4800"),
        unitCost: new Decimal("700"),
        unitClient: new Decimal("760"),
      },
      {
        type: "material",
        name: "Structural steel",
        unit: "t",
        quantity: new Decimal("210"),
        unitCost: new Decimal("5200"),
        unitClient: new Decimal("5800"),
      },
    ]
  );

  await ensureEstimate(
    p6.id,
    {
      version: 2,
      status: "sent",
      sentAt: new Date("2025-12-01"),
      totalCost: new Decimal("5400000"),
      totalClient: new Decimal("5850000"),
      margin: new Decimal("450000"),
      marginPercent: new Decimal("8.33"),
      notes: "Updated scope with spectator facilities",
    },
    [
      {
        type: "work",
        name: "Spectator seating installation",
        unit: "pcs",
        quantity: new Decimal("850"),
        unitCost: new Decimal("120"),
        unitClient: new Decimal("150"),
      },
    ]
  );

  const existingP6Photos = await prisma.photo.findFirst({
    where: { tenantId, projectId: p6.id },
    select: { id: true },
  });

  if (!existingP6Photos) {
    const p6Foundation = p6Stages.find((stage) => stage.name === "Foundation");
    if (p6Foundation) {
      await createPhoto({
        projectId: p6.id,
        stageId: p6Foundation.id,
        filename: "olympics-siteprep-1.jpg",
        url: buildPhotoUrl("olympics-siteprep-1"),
        description: "Site preparation",
        capturedAt: new Date("2025-11-25"),
      });
      await createPhoto({
        projectId: p6.id,
        stageId: p6Foundation.id,
        filename: "olympics-foundation-1.jpg",
        url: buildPhotoUrl("olympics-foundation-1"),
        description: "Foundation works ongoing",
        capturedAt: new Date("2025-12-05"),
      });
    }
  }

  // Project 7: Commercial Warehouse "Logistics Hub Łódź"
  const { project: p7 } = await ensureProjectWithStages(
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
  await ensureEstimate(
    p7.id,
    {
      version: 1,
      status: "draft",
      totalCost: new Decimal("1900000"),
      totalClient: new Decimal("2100000"),
      margin: new Decimal("200000"),
      marginPercent: new Decimal("10.53"),
      notes: "Quotation stage - large industrial warehouse project",
    },
    [
      {
        type: "work",
        name: "Warehouse shell construction",
        unit: "m²",
        quantity: new Decimal("15000"),
        unitCost: new Decimal("95"),
        unitClient: new Decimal("110"),
      },
      {
        type: "material",
        name: "Insulated panels",
        unit: "m²",
        quantity: new Decimal("8800"),
        unitCost: new Decimal("65"),
        unitClient: new Decimal("78"),
      },
    ]
  );

  console.log("✅ Created 7 projects with stages and estimates");
  console.log("   - Project 1: Villa Wilanów (3 estimate versions: draft→sent→approved)");
  console.log("   - Project 2: Apartment Complex (2 estimate versions: sent→approved)");
  console.log("   - Project 3: Office Building (2 estimate versions: draft→sent)");
  console.log("   - Project 4: Townhouses (2 estimate versions: sent→approved)");
  console.log("   - Project 5: House Renovation (completed)");
  console.log("   - Project 6: Sports Complex (2 estimate versions: sent→sent)");
  console.log("   - Project 7: Warehouse (draft)\n");
}
