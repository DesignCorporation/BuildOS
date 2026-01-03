// BuildOS - Test Data Factories
// Factory pattern for creating test data

import { prisma } from "../../src/index";
import { Project, Estimate, EstimateItem, Decimal } from "../../src/generated/client";

/**
 * Create test project
 */
export async function createProject(
  tenantId: string,
  overrides?: Partial<{
    name: string;
    address: string;
    clientName: string;
    clientEmail: string;
    status: string;
    notes: string;
  }>
): Promise<Project> {
  return prisma.project.create({
    data: {
      tenantId,
      name: overrides?.name || "Test Project",
      address: overrides?.address || "123 Test Street",
      clientName: overrides?.clientName || "Test Client",
      clientEmail: overrides?.clientEmail || "client@test.com",
      status: overrides?.status || "active",
      notes: overrides?.notes,
    },
  });
}

/**
 * Create test estimate
 */
export async function createEstimate(
  tenantId: string,
  projectId: string,
  overrides?: Partial<{
    version: number;
    status: string;
    totalCost: number;
    totalClient: number;
    margin: number;
    marginPercent: number;
  }>
): Promise<Estimate> {
  const totalCost = overrides?.totalCost || 10000;
  const totalClient = overrides?.totalClient || 15000;
  const margin = overrides?.margin || totalClient - totalCost;
  const marginPercent = overrides?.marginPercent || ((margin / totalCost) * 100);

  return prisma.estimate.create({
    data: {
      tenantId,
      projectId,
      version: overrides?.version || 1,
      status: overrides?.status || "draft",
      totalCost: new Decimal(totalCost),
      totalClient: new Decimal(totalClient),
      margin: new Decimal(margin),
      marginPercent: new Decimal(marginPercent),
    },
  });
}

/**
 * Create test estimate item
 */
export async function createEstimateItem(
  tenantId: string,
  estimateId: string,
  overrides?: Partial<{
    type: string;
    name: string;
    unit: string;
    quantity: number;
    unitCost: number;
    unitClient: number;
  }>
): Promise<EstimateItem> {
  const quantity = overrides?.quantity || 10;
  const unitCost = overrides?.unitCost || 100;
  const unitClient = overrides?.unitClient || 150;
  const totalCost = quantity * unitCost;
  const totalClient = quantity * unitClient;
  const margin = totalClient - totalCost;
  const marginPercent = (margin / totalCost) * 100;

  return prisma.estimateItem.create({
    data: {
      tenantId,
      estimateId,
      type: overrides?.type || "work",
      name: overrides?.name || "Test Work Item",
      unit: overrides?.unit || "m2",
      quantity: new Decimal(quantity),
      unitCost: new Decimal(unitCost),
      totalCost: new Decimal(totalCost),
      unitClient: new Decimal(unitClient),
      totalClient: new Decimal(totalClient),
      margin: new Decimal(margin),
      marginPercent: new Decimal(marginPercent),
    },
  });
}

/**
 * Create full estimate with items
 */
export async function createEstimateWithItems(
  tenantId: string,
  projectId: string,
  itemCount = 3
): Promise<Estimate & { items: EstimateItem[] }> {
  // Create estimate
  const estimate = await createEstimate(tenantId, projectId, {
    totalCost: 0, // Will recalculate
    totalClient: 0,
    margin: 0,
    marginPercent: 0,
  });

  // Create items
  const items: EstimateItem[] = [];
  let totalCost = 0;
  let totalClient = 0;

  for (let i = 0; i < itemCount; i++) {
    const item = await createEstimateItem(tenantId, estimate.id, {
      name: `Test Item ${i + 1}`,
      quantity: 10 + i,
      unitCost: 100 * (i + 1),
      unitClient: 150 * (i + 1),
    });
    items.push(item);
    totalCost += Number(item.totalCost);
    totalClient += Number(item.totalClient);
  }

  // Update estimate with calculated totals
  const margin = totalClient - totalCost;
  const marginPercent = (margin / totalCost) * 100;

  const updatedEstimate = await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      totalCost: new Decimal(totalCost),
      totalClient: new Decimal(totalClient),
      margin: new Decimal(margin),
      marginPercent: new Decimal(marginPercent),
    },
  });

  return {
    ...updatedEstimate,
    items,
  };
}

/**
 * Create multiple projects for testing
 */
export async function createProjects(tenantId: string, count: number): Promise<Project[]> {
  const projects: Project[] = [];
  for (let i = 0; i < count; i++) {
    const project = await createProject(tenantId, {
      name: `Test Project ${i + 1}`,
      status: i % 2 === 0 ? "active" : "draft",
    });
    projects.push(project);
  }
  return projects;
}

/**
 * Create multiple estimates for testing
 */
export async function createEstimates(
  tenantId: string,
  projectId: string,
  count: number
): Promise<Estimate[]> {
  const estimates: Estimate[] = [];
  for (let i = 0; i < count; i++) {
    const estimate = await createEstimate(tenantId, projectId, {
      version: i + 1,
      status: i === count - 1 ? "approved" : "draft",
    });
    estimates.push(estimate);
  }
  return estimates;
}
