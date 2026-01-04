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
