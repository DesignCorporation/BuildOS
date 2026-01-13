// BuildOS - Invoice Repository
// Handles database operations for project invoices

import { Invoice } from "../generated/client";
import { BaseRepository } from "./base.repository";
import { PaginationParams, PaginationResult, SoftDeleteFilter } from "./types";

export interface CreateInvoiceInput {
  projectId?: string | null;
  contractId?: string | null;
  number: string;
  status?: string;
  issueDate: Date;
  dueDate?: Date | null;
  amount: number;
  currency?: string;
  notes?: string | null;
}

export interface UpdateInvoiceInput {
  status?: string;
  dueDate?: Date | null;
  notes?: string | null;
}

export class InvoiceRepository extends BaseRepository {
  async findByProjectId(
    projectId: string,
    params?: PaginationParams & SoftDeleteFilter
  ): Promise<PaginationResult<Invoice>> {
    const { page = 1, limit = 20, includeDeleted = false } = params || {};
    const skip = (page - 1) * limit;

    const where = {
      ...this.createBaseFilter(includeDeleted),
      projectId,
    };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return this.prisma.invoice.create({
      data: {
        tenantId: this.getTenantId(),
        projectId: input.projectId ?? null,
        contractId: input.contractId ?? null,
        number: input.number,
        status: input.status ?? "issued",
        issueDate: input.issueDate,
        dueDate: input.dueDate ?? null,
        amount: input.amount,
        currency: input.currency ?? "PLN",
        notes: input.notes ?? null,
      },
    });
  }

  async updateStatus(id: string, status: string): Promise<Invoice> {
    await this.ensureExists(id);

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async markOverdue(now: Date) {
    return this.prisma.invoice.updateMany({
      where: {
        ...this.createBaseFilter(),
        dueDate: { lt: now },
        status: { notIn: ["paid", "overdue"] },
      },
      data: {
        status: "overdue",
        updatedAt: now,
      },
    });
  }

  private async ensureExists(id: string) {
    const existing = await this.prisma.invoice.findFirst({
      where: {
        id,
        ...this.createBaseFilter(),
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Invoice not found or access denied");
    }
  }
}
