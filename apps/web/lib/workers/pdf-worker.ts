// BuildOS - PDF Generation Worker
// BullMQ worker for processing PDF generation jobs

import { Worker, Job } from "bullmq";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@buildos/database";
import { EstimatePDF } from "../pdf/estimate-template";
import { GeneratePdfJobData } from "../queue";
import fs from "fs/promises";
import path from "path";

// Redis connection
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// PDF storage directory (in MVP - local filesystem, later MinIO/S3)
const PDF_STORAGE_DIR = process.env.PDF_STORAGE_DIR || "/tmp/buildos-pdfs";

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(PDF_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create PDF storage directory:", error);
  }
}

// Process PDF generation job
async function processPdfJob(job: Job<GeneratePdfJobData>) {
  const { estimateId, tenantId } = job.data;

  console.log(`[PDF Worker] Processing job ${job.id} for estimate ${estimateId}`);

  try {
    // 1. Fetch estimate with items (tenant-isolated)
    const estimate = await prisma.estimate.findFirst({
      where: {
        id: estimateId,
        tenantId,
      },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!estimate) {
      throw new Error(`Estimate ${estimateId} not found for tenant ${tenantId}`);
    }

    // 2. Prepare data for PDF (CLIENT-SAFE - no cost fields!)
    const pdfData = {
      version: estimate.version,
      createdAt: estimate.createdAt.toISOString(),
      status: estimate.status,
      totalClient: Number(estimate.totalClient),
      projectName: estimate.project.name,
      items: estimate.items.map((item) => ({
        type: item.type,
        name: item.name,
        description: item.description || undefined,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitClient: Number(item.unitClient),
        totalClient: Number(item.totalClient),
        // ❌ NO cost fields: unitCost, totalCost, margin, marginPercent
      })),
    };

    // 3. Generate PDF using React-PDF
    console.log(`[PDF Worker] Generating PDF for estimate ${estimateId}...`);
    const pdfBuffer = await renderToBuffer(<EstimatePDF estimate={pdfData} />);

    // 4. Save PDF to storage
    await ensureStorageDir();
    const filename = `estimate-${estimateId}-v${estimate.version}.pdf`;
    const filepath = path.join(PDF_STORAGE_DIR, filename);

    await fs.writeFile(filepath, pdfBuffer);
    console.log(`[PDF Worker] PDF saved to ${filepath}`);

    // 5. Update estimate with PDF URL
    const pdfUrl = `/api/pdfs/${filename}`; // In production: MinIO/S3 URL

    await prisma.estimate.update({
      where: { id: estimateId },
      data: {
        pdfUrl,
        pdfGeneratedAt: new Date(),
      },
    });

    console.log(`[PDF Worker] Job ${job.id} completed successfully`);

    return {
      success: true,
      pdfUrl,
      filepath,
    };
  } catch (error) {
    console.error(`[PDF Worker] Job ${job.id} failed:`, error);
    throw error; // BullMQ will retry based on job options
  }
}

// Create and start worker
export function startPdfWorker() {
  const worker = new Worker<GeneratePdfJobData>(
    "pdf-generation",
    processPdfJob,
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 PDFs in parallel
    }
  );

  worker.on("completed", (job) => {
    console.log(`[PDF Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[PDF Worker] Job ${job?.id} failed:`, err);
  });

  worker.on("error", (err) => {
    console.error("[PDF Worker] Worker error:", err);
  });

  console.log("[PDF Worker] Worker started and listening for jobs");

  return worker;
}

// For standalone execution
if (require.main === module) {
  console.log("[PDF Worker] Starting PDF generation worker...");
  startPdfWorker();
}
