// BuildOS - Invoice Service
// Business logic for project invoices and payment gating

import { prisma, InvoiceRepository } from "@buildos/database";
import { RepositoryContext } from "@buildos/database";

export interface InvoiceStatusInput {
  status: string;
  dueDate?: Date | string | null;
}

export const isInvoiceOverdue = (invoice: InvoiceStatusInput, now = new Date()) => {
  if (!invoice.dueDate) {
    return false;
  }
  const dueDate = invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate);
  return dueDate.getTime() < now.getTime() && invoice.status !== "paid";
};

export class InvoiceService {
  private invoiceRepo: InvoiceRepository;

  constructor(context: RepositoryContext) {
    this.invoiceRepo = new InvoiceRepository(prisma, context);
  }

  async getInvoicesByProjectId(projectId: string) {
    await this.invoiceRepo.markOverdue(new Date());
    return this.invoiceRepo.findByProjectId(projectId, { limit: 50 });
  }

  async createInvoice(input: Parameters<InvoiceRepository["createInvoice"]>[0]) {
    return this.invoiceRepo.createInvoice(input);
  }

  async markPaid(id: string) {
    return this.invoiceRepo.updateStatus(id, "paid");
  }
}
