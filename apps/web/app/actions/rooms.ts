"use server";

// BuildOS - Room Server Actions

import { z } from "zod";
import { RoomService } from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { revalidatePath } from "next/cache";
import { getDemoContext } from "@/lib/demo-context";

async function getCurrentContext() {
  return getDemoContext();
}

const roomSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Room name is required"),
  type: z.string().optional(),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  tileHeightMode: z.enum(["full", "partial"]).optional(),
  tileHeightValue: z.number().positive().optional(),
  tileWallsSelector: z.enum(["all", "selected"]).optional(),
});

const updateRoomSchema = roomSchema.partial().extend({
  projectId: z.string().optional(),
});

const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return value === null || value === undefined ? null : Number(value);
};

const serializeRoom = (room: any) => ({
  ...room,
  length: toNumber(room.length),
  width: toNumber(room.width),
  height: toNumber(room.height),
  area: toNumber(room.area),
  perimeter: toNumber(room.perimeter),
  wallArea: toNumber(room.wallArea),
  tileHeightValue: toNumber(room.tileHeightValue),
});

export async function createRoomAction(data: z.infer<typeof roomSchema>) {
  try {
    const validated = roomSchema.parse(data);
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canCreate = await userRepo.hasPermission(context.userId, "rooms", "create");

    if (!canCreate) {
      throw new Error("Access denied");
    }

    const service = new RoomService(context);
    const created = await service.createRoom({
      projectId: validated.projectId,
      name: validated.name,
      type: validated.type ?? null,
      length: validated.length ?? null,
      width: validated.width ?? null,
      height: validated.height ?? null,
      tileHeightMode: validated.tileHeightMode ?? "full",
      tileHeightValue: validated.tileHeightValue ?? null,
      tileWallsSelector: validated.tileWallsSelector ?? "all",
    });

    revalidatePath(`/projects/${validated.projectId}`);

    return { success: true, data: serializeRoom(created) };
  } catch (error) {
    console.error("createRoomAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create room",
    };
  }
}

export async function updateRoomAction(id: string, data: z.infer<typeof updateRoomSchema>) {
  try {
    const validated = updateRoomSchema.parse(data);
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canUpdate = await userRepo.hasPermission(context.userId, "rooms", "update");

    if (!canUpdate) {
      throw new Error("Access denied");
    }

    const service = new RoomService(context);
    const updated = await service.updateRoom(id, {
      name: validated.name,
      type: validated.type,
      length: validated.length,
      width: validated.width,
      height: validated.height,
      tileHeightMode: validated.tileHeightMode,
      tileHeightValue: validated.tileHeightValue,
      tileWallsSelector: validated.tileWallsSelector,
    });

    if (validated.projectId) {
      revalidatePath(`/projects/${validated.projectId}`);
    }

    return { success: true, data: serializeRoom(updated) };
  } catch (error) {
    console.error("updateRoomAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update room",
    };
  }
}
