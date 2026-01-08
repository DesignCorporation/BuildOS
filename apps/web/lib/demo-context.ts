// BuildOS - Demo context helper
// Provides tenant/user IDs for the seeded demo data

import { prisma } from "@buildos/database";

const DEMO_TENANT_SLUG = "anchor-construction";
const DEMO_TENANT_NAME = "ANCHOR Construction sp. z o.o.";
const DEMO_USER_EMAIL = "zbigniew@anchor-construction.pl";
const DEMO_USER_NAME = "Zbigniew Kowalski";

export async function getDemoContext() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_TENANT_SLUG },
    update: {},
    create: {
      name: DEMO_TENANT_NAME,
      slug: DEMO_TENANT_SLUG,
      isActive: true,
    },
    select: { id: true },
  });

  const user = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: DEMO_USER_EMAIL,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: DEMO_USER_EMAIL,
      name: DEMO_USER_NAME,
      passwordHash: "$2a$10$placeholder",
      isActive: true,
    },
    select: { id: true },
  });

  return {
    tenantId: tenant.id,
    userId: user.id,
  };
}
