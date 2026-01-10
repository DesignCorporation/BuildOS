// BuildOS - Client Portal helpers
// Centralize demo auth, permission checks, and client identity resolution

import { prisma, UserRepository, RepositoryContext } from "@buildos/database";
import { getDemoContext } from "@/lib/demo-context";
import { redirect } from "next/navigation";

export async function getClientContext() {
  const context = await getDemoContext();
  const user = await prisma.user.findFirst({
    where: {
      id: context.userId,
      tenantId: context.tenantId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const roleNames = user?.roles?.map((entry) => entry.role.name) || [];

  return { context, user, roleNames };
}

export async function hasPermission(
  userId: string,
  context: RepositoryContext,
  resource: string,
  action: string
) {
  const userRepo = new UserRepository(prisma, context);
  return userRepo.hasPermission(userId, resource, action);
}

export async function requireClientContext() {
  const { context, user, roleNames } = await getClientContext();
  const isClient = roleNames.includes("client");

  if (!user?.email || !isClient) {
    redirect("/client/unauthorized");
  }

  return { context, user };
}
