// BuildOS - Test Setup
// Configures test database connection

import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/index";

beforeAll(async () => {
  // Database is already connected via prisma singleton
  console.log("🧪 Test suite started");
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log("🧪 Test suite finished");
});

beforeEach(async () => {
  // Clean up test data before each test
  // Note: This deletes data in order to respect foreign key constraints
  await prisma.auditLog.deleteMany({});
  await prisma.userRole.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.estimateItem.deleteMany({});
  await prisma.estimate.deleteMany({});
  await prisma.stage.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.materialCatalogTranslation.deleteMany({});
  await prisma.materialCatalog.deleteMany({});
  await prisma.workTypeTranslation.deleteMany({});
  await prisma.workType.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.tenant.deleteMany({});
});
