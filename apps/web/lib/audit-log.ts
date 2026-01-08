// BuildOS - Audit Log Helper
// Simple wrapper for logging user actions

import { prisma } from "@buildos/database";

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
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
        entity: entry.entity,
        entityId: entry.entityId,
        userId: entry.userId,
        tenantId: entry.tenantId,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    // Log errors but don't throw - audit logging should never block operations
    console.error("Failed to write audit log:", error);
  }
}
