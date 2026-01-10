"use server";

// BuildOS - Photo Server Actions (file upload to MinIO)

import { z } from "zod";
import { PhotoService } from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { revalidatePath } from "next/cache";
import { getDemoContext } from "@/lib/demo-context";
import { uploadBuffer } from "@/lib/minio";

const createPhotoSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  stageId: z.string().optional(),
  description: z.string().optional(),
  capturedAt: z.string().optional(),
});

async function getCurrentContext() {
  return getDemoContext();
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function createPhotoAction(formData: FormData) {
  try {
    const context = await getCurrentContext();
    const service = new PhotoService(context);
    const userRepo = new UserRepository(prisma, context);
    const projectId = String(formData.get("projectId") || "");
    const stageIdValue = String(formData.get("stageId") || "");
    const descriptionValue = String(formData.get("description") || "");
    const capturedAtValue = String(formData.get("capturedAt") || "");
    const file = formData.get("file");

    const validated = createPhotoSchema.parse({
      projectId,
      stageId: stageIdValue || undefined,
      description: descriptionValue || undefined,
      capturedAt: capturedAtValue || undefined,
    });

    if (!(file instanceof File)) {
      throw new Error("Photo file is required");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large (max 10MB)");
    }

    const canCreate = await userRepo.hasPermission(
      context.userId,
      "photos",
      "create"
    );
    if (!canCreate) {
      throw new Error("Access denied");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = file.name.replace(/\s+/g, "-");
    const objectName = `${context.tenantId}/${validated.projectId}/${
      validated.stageId || "general"
    }/${crypto.randomUUID()}-${safeFilename}`;
    const url = await uploadBuffer({
      objectName,
      buffer,
      contentType: file.type || "image/jpeg",
    });

    const created = await service.createPhoto({
      projectId: validated.projectId,
      stageId: validated.stageId || null,
      filename: file.name,
      url,
      description: validated.description,
      capturedAt: validated.capturedAt ? new Date(validated.capturedAt) : undefined,
      uploadedBy: context.userId,
      fileSize: file.size,
      mimeType: file.type || null,
    });

    revalidatePath(`/projects/${validated.projectId}`);

    return {
      success: true,
      data: created,
    };
  } catch (error) {
    console.error("createPhotoAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create photo",
    };
  }
}
