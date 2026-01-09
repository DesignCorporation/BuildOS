"use server";

// BuildOS - Estimate Server Actions
// All operations go through EstimateService (NO direct Prisma/Repo access!)

import { EstimateService } from "@buildos/services";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addPdfGenerationJob } from "@/lib/queue";
import { getDemoContext } from "@/lib/demo-context";

// ============================================================================
// MOCK AUTH - Replace with real NextAuth session in Issue #4 (Authentication)
// ============================================================================

async function getCurrentContext() {
  // TODO: Replace with real session from NextAuth
  return getDemoContext();
}

// ============================================================================
// Validation Schemas
// ============================================================================

const createEstimateItemSchema = z.object({
  type: z.enum(["work", "material", "subcontractor"]),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitCost: z.number().nonnegative("Unit cost cannot be negative"),
  unitClient: z.number().nonnegative("Unit client price cannot be negative"),
  materialCatalogId: z.string().optional(),
  workTypeId: z.string().optional(),
  order: z.number().optional(),
});

const createEstimateSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  items: z.array(createEstimateItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Create estimate with items
 * Automatically calculates totals and margins via EstimateService
 */
export async function createEstimateAction(data: z.infer<typeof createEstimateSchema>) {
  try {
    // Validate input
    const validated = createEstimateSchema.parse(data);

    // Get current user context
    const context = await getCurrentContext();

    // Create service instance
    const service = new EstimateService(context);

    // Create estimate (all calculations happen in service!)
    const estimate = await service.createEstimateWithItems(
      validated.projectId,
      validated.items.map((item) => ({
        type: item.type,
        name: item.name,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitCost: item.unitCost,
        unitClient: item.unitClient,
        materialCatalogId: item.materialCatalogId,
        workTypeId: item.workTypeId,
        order: item.order,
      }))
    );

    // Revalidate project page
    revalidatePath(`/projects/${validated.projectId}`);

    return {
      success: true,
      data: estimate,
    };
  } catch (error) {
    console.error("createEstimateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create estimate",
    };
  }
}

/**
 * Add item to existing estimate
 * Automatically recalculates totals
 */
export async function addItemToEstimateAction(
  estimateId: string,
  item: z.infer<typeof createEstimateItemSchema>
) {
  try {
    // Validate item
    const validated = createEstimateItemSchema.parse(item);

    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Add item (service handles recalculation)
    const newItem = await service.addItemToEstimate(estimateId, {
      type: validated.type,
      name: validated.name,
      description: validated.description,
      unit: validated.unit,
      quantity: validated.quantity,
      unitCost: validated.unitCost,
      unitClient: validated.unitClient,
      materialCatalogId: validated.materialCatalogId,
      workTypeId: validated.workTypeId,
      order: validated.order,
    });

    // Revalidate
    revalidatePath(`/estimates/${estimateId}`);

    return {
      success: true,
      data: newItem,
    };
  } catch (error) {
    console.error("addItemToEstimateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add item",
    };
  }
}

/**
 * Update estimate item
 * Automatically recalculates totals
 */
export async function updateItemAction(
  itemId: string,
  updates: Partial<z.infer<typeof createEstimateItemSchema>>
) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Update item (service handles recalculation)
    const updatedItem = await service.updateItem(itemId, updates);

    // Revalidate
    revalidatePath(`/estimates`);

    return {
      success: true,
      data: updatedItem,
    };
  } catch (error) {
    console.error("updateItemAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item",
    };
  }
}

/**
 * Delete estimate item
 * Automatically recalculates totals
 */
export async function deleteItemAction(itemId: string) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Delete item (service handles recalculation)
    await service.deleteItem(itemId);

    // Revalidate
    revalidatePath(`/estimates`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("deleteItemAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item",
    };
  }
}

/**
 * Send estimate to client
 * Changes status to "sent"
 */
export async function sendEstimateAction(estimateId: string) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Send estimate
    const estimate = await service.sendEstimate(estimateId);

    // Revalidate
    revalidatePath(`/estimates/${estimateId}`);
    revalidatePath(`/projects/${estimate.projectId}`);
    revalidatePath("/projects");

    return {
      success: true,
      data: estimate,
    };
  } catch (error) {
    console.error("sendEstimateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send estimate",
    };
  }
}

/**
 * Approve estimate
 * Changes status to "approved"
 */
export async function approveEstimateAction(estimateId: string) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Approve estimate
    const estimate = await service.approveEstimate(estimateId);

    // Revalidate
    revalidatePath(`/estimates/${estimateId}`);

    return {
      success: true,
      data: estimate,
    };
  } catch (error) {
    console.error("approveEstimateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve estimate",
    };
  }
}

/**
 * Get estimate for current user
 * RBAC-aware: filters cost fields for clients
 */
export async function getEstimateForUserAction(estimateId: string) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Get estimate with RBAC filtering
    const estimate = await service.getEstimateForUser(estimateId, context.userId);

    if (!estimate) {
      return {
        success: false,
        error: "Estimate not found",
      };
    }

    return {
      success: true,
      data: estimate,
    };
  } catch (error) {
    console.error("getEstimateForUserAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get estimate",
    };
  }
}

/**
 * Create new version of estimate
 * Copies all items to new version
 */
export async function createNewVersionAction(estimateId: string) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Create service
    const service = new EstimateService(context);

    // Create new version
    const newEstimate = await service.createNewVersion(estimateId);

    // Revalidate
    revalidatePath(`/estimates`);

    return {
      success: true,
      data: newEstimate,
    };
  } catch (error) {
    console.error("createNewVersionAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create new version",
    };
  }
}

/**
 * Generate PDF for estimate
 * Adds job to BullMQ queue for async processing
 */
export async function generatePdfAction(estimateId: string) {
  try {
    // Get context
    const context = await getCurrentContext();

    // Add PDF generation job to queue
    const job = await addPdfGenerationJob({
      estimateId,
      tenantId: context.tenantId,
      userId: context.userId,
    });

    console.log(`PDF generation job queued: ${job.id}`);

    // Revalidate
    revalidatePath(`/estimates/${estimateId}`);

    return {
      success: true,
      jobId: job.id,
      message: "PDF generation started. It will be ready in a few moments.",
    };
  } catch (error) {
    console.error("generatePdfAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
