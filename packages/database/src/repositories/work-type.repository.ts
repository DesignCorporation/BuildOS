// BuildOS - Work Type Repository
// Handles Work Catalog CRUD with tenant isolation

import { WorkType, WorkTypeTranslation } from "../generated/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { BaseRepository } from "./base.repository";
import { PaginationParams, PaginationResult } from "./types";

export interface WorkTypeTranslationInput {
  locale: string;
  name: string;
  description?: string;
}

export interface CreateWorkTypeInput {
  code?: string | null;
  category?: string | null;
  unit: string;
  unitCost: number | Decimal;
  clientUnitPrice: number | Decimal;
  laborNormHoursPerUnit?: number | Decimal;
  isActive?: boolean;
  translations: WorkTypeTranslationInput[];
}

export interface UpdateWorkTypeInput {
  code?: string | null;
  category?: string | null;
  unit?: string;
  unitCost?: number | Decimal;
  clientUnitPrice?: number | Decimal;
  laborNormHoursPerUnit?: number | Decimal;
  isActive?: boolean;
  translations?: WorkTypeTranslationInput[];
}

export interface WorkTypeWithTranslations extends WorkType {
  translations: WorkTypeTranslation[];
}

export interface WorkTypeListParams extends PaginationParams {
  search?: string;
  includeInactive?: boolean;
}

export class WorkTypeRepository extends BaseRepository {
  async findAll(params?: WorkTypeListParams): Promise<PaginationResult<WorkTypeWithTranslations>> {
    const { page = 1, limit = 20, search, includeInactive = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createTenantFilter(),
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            translations: {
              some: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.workType.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
        include: { translations: true },
      }),
      this.prisma.workType.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<WorkTypeWithTranslations | null> {
    return this.prisma.workType.findFirst({
      where: {
        id,
        ...this.createTenantFilter(),
      },
      include: { translations: true },
    });
  }

  async create(input: CreateWorkTypeInput): Promise<WorkTypeWithTranslations> {
    return this.prisma.workType.create({
      data: {
        tenantId: this.getTenantId(),
        code: input.code ?? null,
        category: input.category ?? null,
        unit: input.unit,
        unitCost: input.unitCost,
        clientUnitPrice: input.clientUnitPrice,
        laborNormHoursPerUnit: input.laborNormHoursPerUnit ?? 0,
        isActive: input.isActive ?? true,
        translations: {
          create: input.translations.map((translation) => ({
            locale: translation.locale,
            name: translation.name,
            description: translation.description ?? null,
          })),
        },
      },
      include: { translations: true },
    });
  }

  async update(id: string, input: UpdateWorkTypeInput): Promise<WorkTypeWithTranslations> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error("Work type not found");
    }

    return this.prisma.workType.update({
      where: { id },
      data: {
        code: input.code ?? existing.code ?? null,
        category: input.category ?? existing.category ?? null,
        unit: input.unit ?? existing.unit,
        unitCost: input.unitCost ?? existing.unitCost,
        clientUnitPrice: input.clientUnitPrice ?? existing.clientUnitPrice,
        laborNormHoursPerUnit:
          input.laborNormHoursPerUnit ?? existing.laborNormHoursPerUnit,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: new Date(),
        ...(input.translations?.length
          ? {
              translations: {
                upsert: input.translations.map((translation) => ({
                  where: {
                    workTypeId_locale: {
                      workTypeId: id,
                      locale: translation.locale,
                    },
                  },
                  update: {
                    name: translation.name,
                    description: translation.description ?? null,
                  },
                  create: {
                    locale: translation.locale,
                    name: translation.name,
                    description: translation.description ?? null,
                  },
                })),
              },
            }
          : {}),
      },
      include: { translations: true },
    });
  }
}
