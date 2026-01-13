"use server";

// BuildOS - Invoice Server Actions

import { z } from "zod";
import { InvoiceService } from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { revalidatePath } from "next/cache";
import { getDemoContext } from "@/lib/demo-context";

async function getCurrentContext() {
  return getDemoContext();
}

const invoiceSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  contractId: z.string().optional(),
  number: z.string().min(1, "Invoice number is required"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function createInvoiceAction(data: z.infer<typeof invoiceSchema>) {
  try {
    const validated = invoiceSchema.parse(data);
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canCreate = await userRepo.hasPermission(context.userId, "invoices", "create");

    if (!canCreate) {
      throw new Error("Access denied");
    }

    const service = new InvoiceService(context);
    const created = await service.createInvoice({
      projectId: validated.projectId,
      contractId: validated.contractId || null,
      number: validated.number,
      status: "issued",
      issueDate: new Date(validated.issueDate),
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      amount: validated.amount,
      currency: validated.currency ?? "PLN",
      notes: validated.notes ?? null,
    });

    revalidatePath(`/projects/${validated.projectId}`);

    return { success: true, data: created };
  } catch (error) {
    console.error("createInvoiceAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create invoice",
    };
  }
}

export async function markInvoicePaidAction(id: string, projectId: string) {
  try {
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canUpdate = await userRepo.hasPermission(context.userId, "invoices", "update");

    if (!canUpdate) {
      throw new Error("Access denied");
    }

    const service = new InvoiceService(context);
    const updated = await service.markPaid(id);

    revalidatePath(`/projects/${projectId}`);

    return { success: true, data: updated };
  } catch (error) {
    console.error("markInvoicePaidAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update invoice",
    };
  }
}
