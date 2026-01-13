// BuildOS - Invoice Overdue Worker
// Checks and marks overdue invoices across all tenants

import { Worker, Job } from "bullmq";
import { prisma } from "@buildos/database";
import type { CheckOverdueJobData } from "../queue";

// Redis connection (same as queue)
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Process job
async function processOverdueCheck(job: Job<CheckOverdueJobData>) {
  const { timestamp } = job.data;
  const now = new Date(timestamp);

  console.log(
    `[Invoice Worker] Checking overdue invoices at ${now.toISOString()}`
  );

  try {
    // Update all overdue invoices across ALL tenants
    // Uses BaseRepository logic via raw query for performance
    const result = await prisma.invoice.updateMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["paid", "overdue"] },
        deletedAt: null, // Not soft-deleted
      },
      data: {
        status: "overdue",
        updatedAt: now,
      },
    });

    console.log(`[Invoice Worker] Marked ${result.count} invoices as overdue`);

    return {
      success: true,
      count: result.count,
      timestamp: now.toISOString(),
    };
  } catch (error) {
    console.error("[Invoice Worker] Error checking overdue:", error);
    throw error; // Will trigger retry
  }
}

// Worker initialization
export function startInvoiceWorker() {
  const worker = new Worker<CheckOverdueJobData>(
    "invoice-management",
    processOverdueCheck,
    {
      connection: redisConnection,
      concurrency: 1, // Only 1 concurrent job (scheduled task)
    }
  );

  // Event handlers
  worker.on("completed", (job) => {
    console.log(
      `[Invoice Worker] Job ${job.id} completed:`,
      job.returnvalue
    );
  });

  worker.on("failed", (job, err) => {
    console.error(`[Invoice Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Invoice Worker] Worker error:", err);
  });

  console.log("[Invoice Worker] Started successfully");

  return worker;
}

// Standalone execution
if (require.main === module) {
  console.log("[Invoice Worker] Starting as standalone process...");
  startInvoiceWorker();
}
