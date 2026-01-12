// BuildOS - Estimate Builder Page
// Server Component - loads project data and renders builder

import { EstimateBuilder } from "./estimate-builder";
import { WorkCatalogService } from "@buildos/services";
import { getDemoContext } from "@/lib/demo-context";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewEstimatePage({ params }: PageProps) {
  const { id: projectId } = await params;
  const context = await getDemoContext();
  const workCatalog = new WorkCatalogService(context);
  const result = await workCatalog.getWorkTypes({ limit: 100 });

  const toNumber = (value: unknown) => {
    if (value && typeof value === "object" && "toNumber" in value) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return Number(value);
  };

  const workTypes = result.data.map((workType) => ({
    id: workType.id,
    name:
      workType.translations.find((t) => t.locale === "pl")?.name ||
      workType.translations.find((t) => t.locale === "ru")?.name ||
      workType.translations[0]?.name ||
      "Work Type",
    unit: workType.unit,
    unitCost: toNumber(workType.unitCost),
    clientUnitPrice: toNumber(workType.clientUnitPrice),
  }));

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Estimate</h1>
        <p className="text-gray-600 mt-2">
          Add labor, materials, and subcontractors
        </p>
      </div>

      <EstimateBuilder projectId={projectId} workTypes={workTypes} />
    </div>
  );
}
