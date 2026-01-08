// BuildOS - Audit Log Helper
// Simple wrapper for logging user actions

import { prisma } from "@buildos/database";

// Generate random UUID v4
function generateTraceId(): string {
  return crypto.randomUUID();
}

export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId: string;
  actorId: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

/**
 * Log an action to the audit log
 * Fires and forgets - doesn't block the main flow
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        actorId: entry.actorId,
        actorType: "user",
        tenantId: entry.tenantId,
        traceId: generateTraceId(),
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    // Log errors but don't throw - audit logging should never block operations
    console.error("Failed to write audit log:", error);
  }
}
