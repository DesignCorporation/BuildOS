// BuildOS - Estimate Service
// Core business logic for Estimate Engine (ADR-09: Materialized Margins)
// CRITICAL: This is the CORE of the product!

import {
  EstimateRepository,
  UserRepository,
  CreateEstimateInput,
  CreateEstimateItemInput,
  UpdateEstimateInput,
  prisma,
  Decimal,
  Estimate,
  EstimateItem,
} from "@buildos/database";
import { RepositoryContext } from "@buildos/database";

/**
 * Estimate calculation result
 */
export interface EstimateCalculation {
  totalCost: number;
  totalClient: number;
  margin: number;
  marginPercent: number;
}

/**
 * Estimate item with calculation
 */
export interface CalculatedEstimateItem extends CreateEstimateItemInput {
  // All fields calculated
}

/**
 * Estimate Service
 * Handles ALL business logic for estimates
 * NEVER access Prisma directly - only through repositories
 */
export class EstimateService {
  private estimateRepo: EstimateRepository;
  private userRepo: UserRepository;

  constructor(context: RepositoryContext) {
    this.estimateRepo = new EstimateRepository(prisma, context);
    this.userRepo = new UserRepository(prisma, context);
  }

  /**
   * Calculate totals and margins for estimate items
   * This is the CORE calculation logic (ADR-09)
   */
  calculateTotals(items: CalculatedEstimateItem[]): EstimateCalculation {
    let totalCost = 0;
    let totalClient = 0;

    for (const item of items) {
      totalCost += Number(item.totalCost);
      totalClient += Number(item.totalClient);
    }

    const margin = totalClient - totalCost;
    const marginPercent = totalCost > 0 ? (margin / totalCost) * 100 : 0;

    return {
      totalCost,
      totalClient,
      margin,
      marginPercent,
    };
  }

  /**
   * Calculate item totals and margins
   */
  calculateItemTotals(
    quantity: number,
    unitCost: number,
    unitClient: number
  ): {
    totalCost: number;
    totalClient: number;
    margin: number;
    marginPercent: number;
  } {
    const totalCost = quantity * unitCost;
    const totalClient = quantity * unitClient;
    const margin = totalClient - totalCost;
    const marginPercent = totalCost > 0 ? (margin / totalCost) * 100 : 0;

    return {
      totalCost,
      totalClient,
      margin,
      marginPercent,
    };
  }

  /**
   * Create estimate with items
   * Automatically calculates totals and margins (ADR-09: Materialized)
   */
  async createEstimateWithItems(
    projectId: string,
    items: Omit<CreateEstimateItemInput, "totalCost" | "totalClient" | "margin" | "marginPercent">[]
  ): Promise<Estimate & { items: EstimateItem[] }> {
    // Calculate each item's totals
    const calculatedItems: CalculatedEstimateItem[] = items.map((item) => {
      const calculated = this.calculateItemTotals(
        Number(item.quantity),
        Number(item.unitCost),
        Number(item.unitClient)
      );

      return {
        ...item,
        totalCost: calculated.totalCost,
        totalClient: calculated.totalClient,
        margin: calculated.margin,
        marginPercent: calculated.marginPercent,
      };
    });

    // Calculate estimate totals
    const totals = this.calculateTotals(calculatedItems);

    // Create estimate input
    const estimateInput: CreateEstimateInput = {
      projectId,
      status: "draft",
      totalCost: totals.totalCost,
      totalClient: totals.totalClient,
      margin: totals.margin,
      marginPercent: totals.marginPercent,
    };

    // Create via repository
    return this.estimateRepo.createWithItems(estimateInput, calculatedItems);
  }

  /**
   * Add item to estimate and recalculate totals
   */
  async addItemToEstimate(
    estimateId: string,
    item: Omit<CreateEstimateItemInput, "totalCost" | "totalClient" | "margin" | "marginPercent">
  ): Promise<EstimateItem> {
    // Calculate item totals
    const calculated = this.calculateItemTotals(
      Number(item.quantity),
      Number(item.unitCost),
      Number(item.unitClient)
    );

    const calculatedItem: CreateEstimateItemInput = {
      ...item,
      totalCost: calculated.totalCost,
      totalClient: calculated.totalClient,
      margin: calculated.margin,
      marginPercent: calculated.marginPercent,
    };

    // Add item
    const newItem = await this.estimateRepo.addItem(estimateId, calculatedItem);

    // Recalculate estimate totals
    await this.recalculateEstimateTotals(estimateId);

    return newItem;
  }

  /**
   * Update item and recalculate estimate totals
   */
  async updateItem(
    itemId: string,
    updates: Partial<Omit<CreateEstimateItemInput, "totalCost" | "totalClient" | "margin" | "marginPercent">>
  ): Promise<EstimateItem> {
    // If quantity or prices changed, recalculate
    let calculatedUpdates: any = { ...updates };

    if (updates.quantity || updates.unitCost || updates.unitClient) {
      // Get current item to merge with updates
      const currentItem = await prisma.estimateItem.findUnique({
        where: { id: itemId },
      });

      if (!currentItem) {
        throw new Error("Item not found");
      }

      const quantity = updates.quantity ? Number(updates.quantity) : Number(currentItem.quantity);
      const unitCost = updates.unitCost ? Number(updates.unitCost) : Number(currentItem.unitCost);
      const unitClient = updates.unitClient
        ? Number(updates.unitClient)
        : Number(currentItem.unitClient);

      const calculated = this.calculateItemTotals(quantity, unitCost, unitClient);
      calculatedUpdates = {
        ...updates,
        totalCost: calculated.totalCost,
        totalClient: calculated.totalClient,
        margin: calculated.margin,
        marginPercent: calculated.marginPercent,
      };
    }

    const updatedItem = await this.estimateRepo.updateItem(itemId, calculatedUpdates);

    // Recalculate estimate totals
    if (updates.quantity || updates.unitCost || updates.unitClient) {
      await this.recalculateEstimateTotals(updatedItem.estimateId);
    }

    return updatedItem;
  }

  /**
   * Delete item and recalculate estimate totals
   */
  async deleteItem(itemId: string): Promise<void> {
    const item = await prisma.estimateItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    const estimateId = item.estimateId;

    await this.estimateRepo.deleteItem(itemId);
    await this.recalculateEstimateTotals(estimateId);
  }

  /**
   * Recalculate estimate totals based on current items
   * CRITICAL: This materializes the margin (ADR-09)
   */
  async recalculateEstimateTotals(estimateId: string): Promise<Estimate> {
    const estimate = await this.estimateRepo.findById(estimateId, false, true);
    if (!estimate || !("items" in estimate)) {
      throw new Error("Estimate not found");
    }

    const totals = this.calculateTotals(
      estimate.items.map((item) => ({
        ...item,
        totalCost: Number(item.totalCost),
        totalClient: Number(item.totalClient),
        margin: Number(item.margin),
        marginPercent: Number(item.marginPercent),
      }))
    );

    return this.estimateRepo.update(estimateId, {
      totalCost: totals.totalCost,
      totalClient: totals.totalClient,
      margin: totals.margin,
      marginPercent: totals.marginPercent,
    });
  }

  /**
   * Create new version of estimate
   * Copies all items and increments version number
   */
  async createNewVersion(estimateId: string): Promise<Estimate & { items: EstimateItem[] }> {
    const original = await this.estimateRepo.findById(estimateId, false, true);
    if (!original || !("items" in original)) {
      throw new Error("Estimate not found");
    }

    // Get next version
    const nextVersion = (await this.estimateRepo.getLatestVersion(original.projectId)) + 1;

    // Create new estimate with items
    const items = original.items.map((item) => ({
      type: item.type,
      name: item.name,
      description: item.description || undefined,
      unit: item.unit,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
      unitClient: item.unitClient,
      totalClient: item.totalClient,
      margin: item.margin,
      marginPercent: item.marginPercent,
      materialCatalogId: item.materialCatalogId || undefined,
      workTypeId: item.workTypeId || undefined,
      order: item.order,
    }));

    return this.estimateRepo.createWithItems(
      {
        projectId: original.projectId,
        version: nextVersion,
        status: "draft",
        totalCost: original.totalCost,
        totalClient: original.totalClient,
        margin: original.margin,
        marginPercent: original.marginPercent,
        notes: original.notes || undefined,
        tags: original.tags,
      },
      items
    );
  }

  /**
   * Get estimate with RBAC filtering (hide cost fields for clients)
   * CRITICAL: Enforces view_cost permission
   */
  async getEstimateForUser(
    estimateId: string,
    userId: string
  ): Promise<Partial<Estimate> | null> {
    const estimate = await this.estimateRepo.findById(estimateId);
    if (!estimate) {
      return null;
    }

    // Check if user has view_cost permission
    const canViewCost = await this.userRepo.hasPermission(userId, "estimates", "view_cost");

    // Filter based on permission
    return this.estimateRepo.filterCostFields(estimate, canViewCost);
  }

  /**
   * Send estimate to client (changes status to "sent")
   */
  async sendEstimate(estimateId: string): Promise<Estimate> {
    return this.estimateRepo.updateStatus(estimateId, "sent");
  }

  /**
   * Approve estimate (changes status to "approved")
   */
  async approveEstimate(estimateId: string): Promise<Estimate> {
    return this.estimateRepo.updateStatus(estimateId, "approved");
  }

  /**
   * Reject estimate (changes status to "rejected")
   */
  async rejectEstimate(estimateId: string): Promise<Estimate> {
    return this.estimateRepo.updateStatus(estimateId, "rejected");
  }
}
