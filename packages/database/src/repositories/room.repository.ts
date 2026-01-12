// BuildOS - Room Repository
// Handles database operations for project rooms

import { Room } from "../generated/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { BaseRepository } from "./base.repository";

export interface CreateRoomInput {
  projectId: string;
  name: string;
  type?: string | null;
  length?: number | Decimal | null;
  width?: number | Decimal | null;
  height?: number | Decimal | null;
  area?: number | Decimal | null;
  perimeter?: number | Decimal | null;
  wallArea?: number | Decimal | null;
  tileHeightMode?: string | null;
  tileHeightValue?: number | Decimal | null;
  tileWallsSelector?: string | null;
  notes?: string | null;
  tags?: string[];
  order?: number;
}

export interface UpdateRoomInput extends Partial<CreateRoomInput> {}

export class RoomRepository extends BaseRepository {
  async findByProjectId(projectId: string): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: {
        ...this.createBaseFilter(),
        projectId,
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }

  async findById(id: string): Promise<Room | null> {
    return this.prisma.room.findFirst({
      where: {
        id,
        ...this.createBaseFilter(),
      },
    });
  }

  async create(input: CreateRoomInput): Promise<Room> {
    return this.prisma.room.create({
      data: {
        tenantId: this.getTenantId(),
        projectId: input.projectId,
        name: input.name,
        type: input.type ?? null,
        length: input.length ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        area: input.area ?? null,
        perimeter: input.perimeter ?? null,
        wallArea: input.wallArea ?? null,
        tileHeightMode: input.tileHeightMode ?? null,
        tileHeightValue: input.tileHeightValue ?? null,
        tileWallsSelector: input.tileWallsSelector ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? [],
        order: input.order ?? 0,
      },
    });
  }

  async update(id: string, input: UpdateRoomInput): Promise<Room> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Room not found");
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        type: input.type ?? existing.type,
        length: input.length ?? existing.length,
        width: input.width ?? existing.width,
        height: input.height ?? existing.height,
        area: input.area ?? existing.area,
        perimeter: input.perimeter ?? existing.perimeter,
        wallArea: input.wallArea ?? existing.wallArea,
        tileHeightMode: input.tileHeightMode ?? existing.tileHeightMode,
        tileHeightValue: input.tileHeightValue ?? existing.tileHeightValue,
        tileWallsSelector: input.tileWallsSelector ?? existing.tileWallsSelector,
        notes: input.notes ?? existing.notes,
        tags: input.tags ?? existing.tags,
        order: input.order ?? existing.order,
        updatedAt: new Date(),
      },
    });
  }
}
