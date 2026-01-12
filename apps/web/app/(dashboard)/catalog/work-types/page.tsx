// BuildOS - Work Catalog Page
// Server component: loads work types for client UI

import { WorkCatalogService } from "@buildos/services";
import { UserRepository, prisma } from "@buildos/database";
import { getDemoContext } from "@/lib/demo-context";
import { WorkTypesClient } from "./work-types-client";

const toNumber = (value: unknown) => {
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
};

export default async function WorkTypesPage() {
  const context = await getDemoContext();
  const userRepo = new UserRepository(prisma, context);
  const canView = await userRepo.hasPermission(context.userId, "catalogs", "view");

  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Access denied</h1>
          <p className="mt-2 text-sm text-gray-500">
            You do not have permission to view the work catalog.
          </p>
        </div>
      </div>
    );
  }

  const service = new WorkCatalogService(context);
  const result = await service.getWorkTypes({ limit: 100, includeInactive: true });

  const workTypes = result.data.map((workType) => ({
    ...workType,
    translations: workType.translations.map((translation) => ({
      ...translation,
      description: translation.description ?? undefined,
    })),
    unitCost: toNumber(workType.unitCost),
    clientUnitPrice: toNumber(workType.clientUnitPrice),
    laborNormHoursPerUnit: toNumber(workType.laborNormHoursPerUnit),
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <WorkTypesClient initialWorkTypes={workTypes} />
    </div>
  );
}
