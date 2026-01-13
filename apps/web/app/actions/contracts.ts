"use server";

// BuildOS - Contract Server Actions

import { z } from "zod";
import { ContractService } from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { revalidatePath } from "next/cache";
import { getDemoContext } from "@/lib/demo-context";

async function getCurrentContext() {
  return getDemoContext();
}

const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.string().optional(),
});

const contractSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  number: z.string().min(1, "Contract number is required"),
  signedAt: z.string().optional(),
  status: z.enum(["draft", "signed", "terminated"]).optional(),
  notes: z.string().optional(),
  milestones: z.array(milestoneSchema).min(1, "At least one milestone required"),
});

export async function createContractAction(data: z.infer<typeof contractSchema>) {
  try {
    const validated = contractSchema.parse(data);
    const context = await getCurrentContext();
    const userRepo = new UserRepository(prisma, context);
    const canCreate = await userRepo.hasPermission(context.userId, "projects", "update");

    if (!canCreate) {
      throw new Error("Access denied");
    }

    const service = new ContractService(context);
    const created = await service.createContract(
      {
        projectId: validated.projectId,
        number: validated.number,
        signedAt: validated.signedAt ? new Date(validated.signedAt) : null,
        status: validated.status ?? "draft",
        notes: validated.notes ?? null,
      },
      validated.milestones.map((milestone, index) => ({
        name: milestone.name,
        amount: milestone.amount,
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
        status: "pending",
        order: index,
      }))
    );

    revalidatePath(`/projects/${validated.projectId}`);

    return { success: true, data: created };
  } catch (error) {
    console.error("createContractAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create contract",
    };
  }
}
