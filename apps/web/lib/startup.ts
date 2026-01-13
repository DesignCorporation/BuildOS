// BuildOS - Application Startup Tasks
// Initialize scheduled jobs and background workers

import { scheduleOverdueCheck } from "./queue";

let initialized = false;

export async function initializeBackgroundJobs() {
  if (initialized) return;

  console.log("[Startup] Initializing background jobs...");

  try {
    // Schedule invoice overdue check
    await scheduleOverdueCheck();
    console.log("[Startup] Invoice overdue check scheduled");

    initialized = true;
  } catch (error) {
    console.error("[Startup] Failed to initialize background jobs:", error);
    // Don't throw - app can still function without scheduled jobs
  }
}
