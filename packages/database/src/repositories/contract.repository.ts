// BuildOS - Contract Repository
// Handles database operations for contracts and milestones

import { Contract, ContractMilestone } from "../generated/client";
import type { Decimal } from "@prisma/client/runtime/library";
import { BaseRepository } from "./base.repository";
import { PaginationParams, PaginationResult, SoftDeleteFilter } from "./types";

export interface CreateContractInput {
  projectId: string;
  number: string;
  signedAt?: Date | null;
  status?: string;
  notes?: string | null;
}

export interface UpdateContractInput {
  number?: string;
  signedAt?: Date | null;
  status?: string;
  notes?: string | null;
}

export interface CreateMilestoneInput {
  name: string;
  amount: number | Decimal;
  dueDate?: Date | null;
  status?: string;
  order?: number;
}

export interface ContractWithMilestones extends Contract {
  milestones: ContractMilestone[];
}

export class ContractRepository extends BaseRepository {
  async findByProjectId(
    projectId: string,
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<ContractWithMilestones>> {
    const { page = 1, limit = 10, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createBaseFilter(includeDeleted),
      projectId,
    };

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
        include: {
          milestones: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, includeDeleted = false): Promise<ContractWithMilestones | null> {
    return this.prisma.contract.findFirst({
      where: {
        id,
        ...this.createBaseFilter(includeDeleted),
      },
      include: {
        milestones: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  }

  async create(contract: CreateContractInput, milestones: CreateMilestoneInput[]) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          tenantId: this.getTenantId(),
          projectId: contract.projectId,
          number: contract.number,
          signedAt: contract.signedAt ?? null,
          status: contract.status ?? "draft",
          notes: contract.notes ?? null,
        },
      });

      if (milestones.length > 0) {
        await Promise.all(
          milestones.map((milestone, index) =>
            tx.contractMilestone.create({
              data: {
                tenantId: this.getTenantId(),
                contractId: created.id,
                name: milestone.name,
                amount: milestone.amount,
                dueDate: milestone.dueDate ?? null,
                status: milestone.status ?? "pending",
                order: milestone.order ?? index,
              },
            })
          )
        );
      }

      return tx.contract.findFirst({
        where: { id: created.id },
        include: {
          milestones: {
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });
  }

  async update(id: string, data: UpdateContractInput) {
    await this.ensureExists(id);

    return this.prisma.contract.update({
      where: { id },
      data: {
        number: data.number,
        signedAt: data.signedAt ?? undefined,
        status: data.status,
        notes: data.notes ?? undefined,
        updatedAt: new Date(),
      },
    });
  }

  async addMilestones(contractId: string, milestones: CreateMilestoneInput[]) {
    if (milestones.length === 0) {
      return [];
    }

    await this.ensureExists(contractId);

    return Promise.all(
      milestones.map((milestone, index) =>
        this.prisma.contractMilestone.create({
          data: {
            tenantId: this.getTenantId(),
            contractId,
            name: milestone.name,
            amount: milestone.amount,
            dueDate: milestone.dueDate ?? null,
            status: milestone.status ?? "pending",
            order: milestone.order ?? index,
          },
        })
      )
    );
  }

  async deleteMilestone(id: string) {
    return this.prisma.contractMilestone.delete({
      where: { id },
    });
  }

  private async ensureExists(id: string) {
    const existing = await this.prisma.contract.findFirst({
      where: {
        id,
        ...this.createBaseFilter(),
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Contract not found or access denied");
    }
  }
}
