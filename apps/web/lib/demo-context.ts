// BuildOS - Demo context helper
// Provides tenant/user IDs for the seeded demo data

import { prisma } from "@buildos/database";
import { cookies } from "next/headers";

const DEMO_TENANT_SLUG = "anchor-construction";
const DEMO_TENANT_NAME = "ANCHOR Construction sp. z o.o.";
const DEMO_USERS = {
  owner: {
    email: "zbigniew@anchor-construction.pl",
    name: "Zbigniew Kowalski",
  },
  pm: {
    email: "anna@anchor-construction.pl",
    name: "Anna Nowak",
  },
  client: {
    email: "jan@investment-group.pl",
    name: "Jan Investment Group",
  },
};

export async function getDemoContext() {
  let role: keyof typeof DEMO_USERS = "owner";
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const cookieRole = cookieStore.get("demo_role")?.value;
    if (cookieRole === "owner" || cookieRole === "pm" || cookieRole === "client") {
      role = cookieRole;
    }
  }
  const demoUser = DEMO_USERS[role];

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
        email: demoUser.email,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: demoUser.email,
      name: demoUser.name,
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
