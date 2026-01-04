// BuildOS - Database Package
// Prisma Client Singleton

import { PrismaClient } from "./generated/client";
import type { Decimal } from "@prisma/client/runtime/library";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Re-export Prisma types
export * from "./generated/client";
export { Decimal };

// Re-export Repositories
export * from "./repositories";
