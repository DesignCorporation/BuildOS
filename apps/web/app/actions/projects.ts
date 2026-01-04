"use server";

// BuildOS - Project Server Actions
// All operations go through ProjectService (NO direct Prisma/Repo access!)

import { ProjectService } from "@buildos/services";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// ============================================================================
// MOCK AUTH - Replace with real NextAuth session in Issue #4 (Authentication)
// ============================================================================

async function getCurrentContext() {
  // TODO: Replace with real session from NextAuth
  // For now, use demo tenant/user from seed data
  return {
    tenantId: "demo-tenant-id", // Will be from session
    userId: "demo-user-id", // Will be from session
  };
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
 * Get project by ID
 */
export async function getProjectByIdAction(id: string) {
  try {
    const context = await getCurrentContext();
    const service = new ProjectService(context);

    const project = await service.getProjectById(id);

    if (!project) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    return {
      success: true,
      data: project,
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

    await service.deleteProject(id);

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
