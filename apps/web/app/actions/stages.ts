"use server";

// BuildOS - Stage Server Actions

import { StageService } from "@buildos/services";
import { getDemoContext } from "@/lib/demo-context";

async function getCurrentContext() {
  return getDemoContext();
}

export async function getStagesByProjectIdAction(projectId: string) {
  try {
    const context = await getCurrentContext();
    const service = new StageService(context);
    const stages = await service.getStagesByProjectId(projectId);

    const serializeDate = (value: Date | null | undefined) =>
      value ? value.toISOString() : null;
    const sanitize = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

    const serializedStages = stages.map((stage) => ({
      ...stage,
      startedAt: serializeDate(stage.startedAt),
      completedAt: serializeDate(stage.completedAt),
      createdAt: serializeDate(stage.createdAt),
      updatedAt: serializeDate(stage.updatedAt),
      deletedAt: serializeDate(stage.deletedAt),
    }));

    return {
      success: true,
      data: sanitize(serializedStages),
    };
  } catch (error) {
    console.error("getStagesByProjectIdAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stages",
    };
  }
}
