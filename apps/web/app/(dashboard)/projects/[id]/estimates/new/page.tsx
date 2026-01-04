// BuildOS - Estimate Builder Page
// Server Component - loads project data and renders builder

import { EstimateBuilder } from "./estimate-builder";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewEstimatePage({ params }: PageProps) {
  const { id: projectId } = await params;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Создать смету</h1>
        <p className="text-gray-600 mt-2">
          Добавьте работы, материалы и субподряд
        </p>
      </div>

      <EstimateBuilder projectId={projectId} />
    </div>
  );
}
