// BuildOS - Client Portal helpers
// Centralize demo auth, permission checks, and client identity resolution

import { prisma, UserRepository, RepositoryContext } from "@buildos/database";
import { getDemoContext } from "@/lib/demo-context";

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
    },
  });

  return { context, user };
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
