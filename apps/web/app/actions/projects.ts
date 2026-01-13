"use server";

// BuildOS - Project Server Actions
// All operations go through ProjectService (NO direct Prisma/Repo access!)

import {
  ProjectService,
  EstimateService,
  StageService,
  PhotoService,
  RoomService,
  ContractService,
  InvoiceService,
} from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDemoContext } from "@/lib/demo-context";
import { auditLog } from "@/lib/audit-log";

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

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  address: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").optional(),
  address: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all projects (paginated)
 */
export async function getProjectsAction(filters?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const { page = 1, limit = 20, status } = filters || {};

    let result;
    if (status) {
      result = await service.getProjectsByStatus(status, {
        page,
        limit,
      });
    } else {
      result = await service.getAllProjects({
        page,
        limit,
      });
    }

    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  } catch (error) {
    console.error("getProjectsAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch projects",
    };
  }
}

/**
 * Get project by ID with estimates
 */
export async function getProjectByIdAction(id: string) {
  try {
    const context = await getCurrentContext();
    const projectService = new ProjectService(context);
    const estimateService = new EstimateService(context);
    const stageService = new StageService(context);
    const photoService = new PhotoService(context);
    const roomService = new RoomService(context);
    const contractService = new ContractService(context);
    const userRepo = new UserRepository(prisma, context);

    const project = await projectService.getProjectById(id);

    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    const serializeDate = (value: Date | null | undefined) =>
      value ? value.toISOString() : null;
    const sanitize = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

    // Load estimates for this project
    let estimates: any[] = [];
    try {
      const estimatesResult = await estimateService.getEstimatesByProjectId(id, {
        limit: 100, // Get all estimates for this project
      });
      const rawEstimates = estimatesResult.data || [];
      const toNumber = (value: unknown) => {
        if (value && typeof value === "object" && "toNumber" in value) {
          return (value as { toNumber: () => number }).toNumber();
        }
        return Number(value);
      };
      estimates = rawEstimates.map((estimate: any) => ({
        ...estimate,
        totalCost: toNumber(estimate.totalCost),
        totalClient: toNumber(estimate.totalClient),
        margin: toNumber(estimate.margin),
        marginPercent: toNumber(estimate.marginPercent),
        validUntil: serializeDate(estimate.validUntil),
        sentAt: serializeDate(estimate.sentAt),
        approvedAt: serializeDate(estimate.approvedAt),
        createdAt: serializeDate(estimate.createdAt),
        updatedAt: serializeDate(estimate.updatedAt),
        deletedAt: serializeDate(estimate.deletedAt),
      }));
      estimates = sanitize(estimates);
    } catch (estimateError) {
      console.warn("Failed to load estimates for project:", estimateError);
      // Continue without estimates rather than failing the whole request
    }

    // Load stages for this project
    let stages: any[] = [];
    try {
      const stageResult = await stageService.getStagesByProjectId(id);
      const rawStages = stageResult || [];
      stages = rawStages.map((stage: any) => ({
        ...stage,
        startedAt: serializeDate(stage.startedAt),
        completedAt: serializeDate(stage.completedAt),
        createdAt: serializeDate(stage.createdAt),
        updatedAt: serializeDate(stage.updatedAt),
        deletedAt: serializeDate(stage.deletedAt),
      }));
      stages = sanitize(stages);
    } catch (stageError) {
      console.warn("Failed to load stages for project:", stageError);
    }

    // Load photos for this project
    let photos: any[] = [];
    try {
      const rawPhotos = await photoService.getPhotosByProjectId(id);
      photos = rawPhotos.map((photo: any) => ({
        id: photo.id,
        stageId: photo.stageId,
        stageName: photo.stage?.name || null,
        filename: photo.filename,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        description: photo.description,
        capturedAt: serializeDate(photo.capturedAt),
        createdAt: serializeDate(photo.createdAt),
      }));
      photos = sanitize(photos);
    } catch (photoError) {
      console.warn("Failed to load photos for project:", photoError);
    }

    // Load rooms for this project
    let rooms: any[] = [];
    try {
      const rawRooms = await roomService.getRoomsByProjectId(id);
      rooms = rawRooms.map((room: any) => ({
        ...room,
        length: room.length ? Number(room.length) : null,
        width: room.width ? Number(room.width) : null,
        height: room.height ? Number(room.height) : null,
        area: room.area ? Number(room.area) : null,
        perimeter: room.perimeter ? Number(room.perimeter) : null,
        wallArea: room.wallArea ? Number(room.wallArea) : null,
        tileHeightValue: room.tileHeightValue ? Number(room.tileHeightValue) : null,
        createdAt: serializeDate(room.createdAt),
        updatedAt: serializeDate(room.updatedAt),
        deletedAt: serializeDate(room.deletedAt),
      }));
      rooms = sanitize(rooms);
    } catch (roomError) {
      console.warn("Failed to load rooms for project:", roomError);
    }

    const serializedProject = {
      ...project,
      createdAt: serializeDate(project.createdAt),
      updatedAt: serializeDate(project.updatedAt),
      deletedAt: serializeDate(project.deletedAt),
    };

    // Load contracts for this project
    let contracts: any[] = [];
    try {
      const contractsResult = await contractService.getContractsByProjectId(id);
      contracts = (contractsResult.data || []).map((contract: any) => ({
        ...contract,
        signedAt: serializeDate(contract.signedAt),
        createdAt: serializeDate(contract.createdAt),
        updatedAt: serializeDate(contract.updatedAt),
        deletedAt: serializeDate(contract.deletedAt),
        milestones: (contract.milestones || []).map((milestone: any) => ({
          ...milestone,
          amount: Number(milestone.amount),
          dueDate: serializeDate(milestone.dueDate),
          createdAt: serializeDate(milestone.createdAt),
          updatedAt: serializeDate(milestone.updatedAt),
        })),
      }));
      contracts = sanitize(contracts);
    } catch (contractError) {
      console.warn("Failed to load contracts for project:", contractError);
    }

    // Load invoices for this project
    let invoices: any[] = [];
    try {
      const invoiceService = new InvoiceService(context);
      const invoicesResult = await invoiceService.getInvoicesByProjectId(id);
      invoices = (invoicesResult.data || []).map((invoice: any) => ({
        ...invoice,
        amount: Number(invoice.amount),
        issueDate: serializeDate(invoice.issueDate),
        dueDate: serializeDate(invoice.dueDate),
        createdAt: serializeDate(invoice.createdAt),
        updatedAt: serializeDate(invoice.updatedAt),
        deletedAt: serializeDate(invoice.deletedAt),
      }));
      invoices = sanitize(invoices);
    } catch (invoiceError) {
      console.warn("Failed to load invoices for project:", invoiceError);
    }

    const canViewCost = await userRepo.hasPermission(
      context.userId,
      "estimates",
      "view_cost"
    );

    const canViewInvoices = await userRepo.hasPermission(
      context.userId,
      "invoices",
      "view"
    );
    const canCreateInvoices = await userRepo.hasPermission(
      context.userId,
      "invoices",
      "create"
    );
    const canUpdateInvoices = await userRepo.hasPermission(
      context.userId,
      "invoices",
      "update"
    );
    const canManageInvoices = canCreateInvoices || canUpdateInvoices;

    return {
      success: true,
      data: {
        project: sanitize(serializedProject),
        estimates,
        stages,
        photos,
        rooms,
        contracts,
        invoices,
        canViewCost,
        canViewInvoices,
        canManageInvoices,
      },
    };
  } catch (error) {
    console.error("getProjectByIdAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch project",
    };
  }
}

/**
 * Create new project
 */
export async function createProjectAction(data: z.infer<typeof createProjectSchema>) {
  try {
    const validated = createProjectSchema.parse(data);
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const project = await service.createProject(validated);

    // Log to audit trail
    await auditLog({
      action: "create",
      resource: "project",
      resourceId: project.id,
      actorId: context.userId,
      tenantId: context.tenantId,
      metadata: { name: project.name },
    });

    revalidatePath("/projects");

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error("createProjectAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

/**
 * Update project
 */
export async function updateProjectAction(
  id: string,
  data: z.infer<typeof updateProjectSchema>
) {
  try {
    const validated = updateProjectSchema.parse(data);
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const project = await service.updateProject(id, validated);

    // Log to audit trail
    await auditLog({
      action: "update",
      resource: "project",
      resourceId: project.id,
      actorId: context.userId,
      tenantId: context.tenantId,
      metadata: { name: project.name, status: project.status },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error("updateProjectAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

/**
 * Archive project (soft delete)
 */
export async function archiveProjectAction(id: string) {
  try {
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const project = await service.deleteProject(id);

    // Log to audit trail
    await auditLog({
      action: "delete",
      resource: "project",
      resourceId: project.id,
      actorId: context.userId,
      tenantId: context.tenantId,
      metadata: { name: project.name },
    });

    revalidatePath("/projects");

    return {
      success: true,
    };
  } catch (error) {
    console.error("archiveProjectAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive project",
    };
  }
}

/**
 * Update project status
 */
export async function updateProjectStatusAction(id: string, status: string) {
  try {
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const project = await service.updateProjectStatus(id, status);

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error("updateProjectStatusAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

/**
 * Restore archived project
 */
export async function restoreProjectAction(id: string) {
  try {
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const project = await service.restoreProject(id);

    // Log to audit trail
    await auditLog({
      action: "restore",
      resource: "project",
      resourceId: project.id,
      actorId: context.userId,
      tenantId: context.tenantId,
      metadata: { name: project.name },
    });

    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);

    return {
      success: true,
      data: project,
    };
  } catch (error) {
    console.error("restoreProjectAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore project",
    };
  }
}
