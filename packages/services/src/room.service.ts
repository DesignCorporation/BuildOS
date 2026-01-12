// BuildOS - Room Service
// Business logic for room geometry and room CRUD

import { prisma, RoomRepository, CreateRoomInput, UpdateRoomInput } from "@buildos/database";
import { RepositoryContext } from "@buildos/database";
import type { Decimal } from "@prisma/client/runtime/library";

export interface RoomGeometry {
  area: number | null;
  perimeter: number | null;
  wallArea: number | null;
  ceilingArea: number | null;
}

const toNumber = (value: number | Decimal | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

export function calculateRoomGeometry(input: {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  tileHeightMode?: string | null;
  tileHeightValue?: number | null;
}): RoomGeometry {
  const length = input.length ?? null;
  const width = input.width ?? null;
  const height = input.height ?? null;
  const tileHeightMode = input.tileHeightMode ?? "full";
  const tileHeightValue = input.tileHeightValue ?? null;

  if (length === null || width === null) {
    return {
      area: null,
      perimeter: null,
      wallArea: null,
      ceilingArea: null,
    };
  }

  const area = length * width;
  const perimeter = 2 * (length + width);
  const wallHeight =
    tileHeightMode === "partial" && tileHeightValue !== null ? tileHeightValue : height;
  const wallArea = wallHeight !== null ? perimeter * wallHeight : null;

  return {
    area,
    perimeter,
    wallArea,
    ceilingArea: area,
  };
}

export class RoomService {
  private roomRepo: RoomRepository;

  constructor(context: RepositoryContext) {
    this.roomRepo = new RoomRepository(prisma, context);
  }

  async getRoomsByProjectId(projectId: string) {
    return this.roomRepo.findByProjectId(projectId);
  }

  async createRoom(input: CreateRoomInput) {
    const geometry = calculateRoomGeometry({
      length: toNumber(input.length),
      width: toNumber(input.width),
      height: toNumber(input.height),
      tileHeightMode: input.tileHeightMode ?? null,
      tileHeightValue: toNumber(input.tileHeightValue),
    });

    return this.roomRepo.create({
      ...input,
      area: geometry.area,
      perimeter: geometry.perimeter,
      wallArea: geometry.wallArea,
    });
  }

  async updateRoom(id: string, input: UpdateRoomInput) {
    const existing = await this.roomRepo.findById(id);
    if (!existing) {
      throw new Error("Room not found");
    }

    const geometry = calculateRoomGeometry({
      length: toNumber(input.length ?? existing.length ?? null),
      width: toNumber(input.width ?? existing.width ?? null),
      height: toNumber(input.height ?? existing.height ?? null),
      tileHeightMode: input.tileHeightMode ?? existing.tileHeightMode ?? "full",
      tileHeightValue: toNumber(
        input.tileHeightValue ?? existing.tileHeightValue ?? null
      ),
    });

    return this.roomRepo.update(id, {
      ...input,
      area: geometry.area,
      perimeter: geometry.perimeter,
      wallArea: geometry.wallArea,
    });
  }
}
