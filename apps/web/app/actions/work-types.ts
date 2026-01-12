"use server";

// BuildOS - Work Catalog Server Actions

import { z } from "zod";
import { WorkCatalogService } from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { revalidatePath } from "next/cache";
import { getDemoContext } from "@/lib/demo-context";

async function getCurrentContext() {
  return getDemoContext();
}

const translationSchema = z.object({
  locale: z.string().min(2, "Locale is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const createWorkTypeSchema = z.object({
  code: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  unitCost: z.number().nonnegative("Unit cost cannot be negative"),
  clientUnitPrice: z.number().nonnegative("Client price cannot be negative"),
  laborNormHoursPerUnit: z.number().nonnegative().optional(),
  translations: z.array(translationSchema).min(1, "At least one translation required"),
});

const updateWorkTypeSchema = createWorkTypeSchema.partial();

const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
};

const serializeWorkType = (workType: any) => ({
  ...workType,
  unitCost: toNumber(workType.unitCost),
  clientUnitPrice: toNumber(workType.clientUnitPrice),
  laborNormHoursPerUnit: toNumber(workType.laborNormHoursPerUnit),
});

export async function createWorkTypeAction(data: z.infer<typeof createWorkTypeSchema>) {
  try {
    const validated = createWorkTypeSchema.parse(data);
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canManage = await userRepo.hasPermission(context.userId, "catalogs", "manage");

    if (!canManage) {
      throw new Error("Access denied");
    }

    const service = new WorkCatalogService(context);
    const created = await service.createWorkType({
      code: validated.code || null,
      category: validated.category || null,
      unit: validated.unit,
      unitCost: validated.unitCost,
      clientUnitPrice: validated.clientUnitPrice,
      laborNormHoursPerUnit: validated.laborNormHoursPerUnit ?? 0,
      translations: validated.translations,
    });

    revalidatePath("/catalog/work-types");

    return { success: true, data: serializeWorkType(created) };
  } catch (error) {
    console.error("createWorkTypeAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create work type",
    };
  }
}

export async function updateWorkTypeAction(
  id: string,
  data: z.infer<typeof updateWorkTypeSchema>
) {
  try {
    const validated = updateWorkTypeSchema.parse(data);
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canManage = await userRepo.hasPermission(context.userId, "catalogs", "manage");

    if (!canManage) {
      throw new Error("Access denied");
    }

    const service = new WorkCatalogService(context);
    const updated = await service.updateWorkType(id, {
      code: validated.code,
      category: validated.category,
      unit: validated.unit,
      unitCost: validated.unitCost,
      clientUnitPrice: validated.clientUnitPrice,
      laborNormHoursPerUnit: validated.laborNormHoursPerUnit,
      translations: validated.translations,
    });

    revalidatePath("/catalog/work-types");

    return { success: true, data: serializeWorkType(updated) };
  } catch (error) {
    console.error("updateWorkTypeAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update work type",
    };
  }
}

export async function setWorkTypeActiveAction(id: string, isActive: boolean) {
  try {
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canManage = await userRepo.hasPermission(context.userId, "catalogs", "manage");

    if (!canManage) {
      throw new Error("Access denied");
    }

    const service = new WorkCatalogService(context);
    const updated = await service.updateWorkType(id, { isActive });

    revalidatePath("/catalog/work-types");

    return { success: true, data: serializeWorkType(updated) };
  } catch (error) {
    console.error("setWorkTypeActiveAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update work type status",
    };
  }
}
