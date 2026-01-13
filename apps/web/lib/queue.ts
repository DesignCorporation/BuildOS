// BuildOS - BullMQ Queue Configuration
// Centralized queue setup for background jobs

import { Queue } from "bullmq";

// Redis connection config
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// PDF Generation Queue
export const pdfQueue = new Queue("pdf-generation", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Job types
export interface GeneratePdfJobData {
  estimateId: string;
  tenantId: string;
  userId: string;
}

// Add job to queue
export async function addPdfGenerationJob(data: GeneratePdfJobData) {
  const job = await pdfQueue.add("generate-estimate-pdf", data, {
    jobId: `estimate-pdf-${data.estimateId}`, // Prevent duplicates
  });

  return job;
}

// Invoice Management Queue
export const invoiceQueue = new Queue("invoice-management", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
});

// Job data interface
export interface CheckOverdueJobData {
  timestamp: string; // ISO timestamp when job was triggered
}

// Helper to add scheduled job
export async function scheduleOverdueCheck() {
  // Remove existing repeatable jobs (for restart scenarios)
  const repeatableJobs = await invoiceQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === "check-overdue-invoices") {
      await invoiceQueue.removeRepeatableByKey(job.key);
    }
  }

  // Add repeatable job
  const job = await invoiceQueue.add(
    "check-overdue-invoices",
    { timestamp: new Date().toISOString() },
    {
      repeat: {
        pattern: process.env.INVOICE_OVERDUE_CRON || "0 */6 * * *", // Every 6 hours
        immediately: true, // Run on startup
      },
      jobId: "invoice-overdue-checker", // Single instance
    }
  );

  console.log(
    `[Invoice Queue] Scheduled overdue check: ${job.opts.repeat?.pattern}`
  );
  return job;
}
